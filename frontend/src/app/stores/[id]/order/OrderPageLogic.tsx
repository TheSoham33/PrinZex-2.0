'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import {
  type StoreDetail,
} from '@/lib/types';
import { fetchAddresses } from '@/lib/api/customer';
import { getOrderQuote, placeOrder as placeOrderApi } from '@/lib/api/orders';
import { createPaymentOrder, verifyPayment } from '@/lib/api/payments';
import { useRazorpay } from '@/hooks/useRazorpay';
import OrderStepper from '@/components/order/OrderStepper';
import OrderSummarySidebar from '@/components/order/OrderSummarySidebar';
import SpecificationsStep from '@/components/order/SpecificationsStep';
import UploadStep from '@/components/order/UploadStep';
import DeliveryStep from '@/components/order/DeliveryStep';
import PaymentStep from '@/components/order/PaymentStep';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import {
  createInitialState,
  orderReducer,
  EMPTY_COST,
} from '@/components/order/orderReducer';
import { IconArrowLeft, IconArrowRight, IconChevronRight, IconLock } from '@/components/icons';

const TOTAL_STEPS = 4;

export default function OrderPageLogic({ store }: { store: StoreDetail }) {
  const router = useRouter();

  // Redirect or show error if store is closed
  useEffect(() => {
    if (!store.isOpen) {
      router.replace(`/stores/${store.id}`);
    }
  }, [store.isOpen, store.id, router]);

  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service') ?? '';
  const token = useAppSelector((state) => state.auth.accessToken);

  const [state, dispatch] = useReducer(
    orderReducer,
    createInitialState(store.id, store.name, serviceParam),
  );
  
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    enabled: !!token
  });

  const [agreed, setAgreed] = useState(false);
  const [maxReached, setMaxReached] = useState(1);
  const [placing, setPlacing] = useState(false);

  const specs = state.order.specifications as any;
  const service = store.services.find((entry) => entry.id === specs.serviceId);
  const cost = state.order.costBreakdown ?? EMPTY_COST;

  // Real Quote Fetching
  const { data: quoteData, isError: quoteError, error: quoteErrorObj } = useQuery({
    queryKey: ['order-quote', store.id, specs, state.order.deliverySpeed],
    queryFn: () => getOrderQuote({
      sellerId: store.id,
      sellerServiceId: specs.serviceId,
      quantity: Number(specs.quantity),
      specifications: {
        paperType: specs.paperType,
        size: specs.size,
        colorOption: specs.colorOption,
        finishing: specs.finishing
      },
      deliverySpeed: state.order.deliverySpeed.toUpperCase()
    }),
    enabled: !!token && !!specs.serviceId && !!specs.paperType && !!specs.size,
    retry: false
  });

  useEffect(() => {
    if (quoteData) {
      dispatch({ type: 'SET_COST_BREAKDOWN', payload: quoteData });
    }
  }, [quoteData]);

  useEffect(() => {
    setMaxReached((previous) => Math.max(previous, state.step));
  }, [state.step]);

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!specs.serviceId) return 'Please choose a service';
      if (!specs.paperType) return 'Please choose a paper type';
      if (!specs.size) return 'Please choose a size';
      if (!specs.quantity || specs.quantity < 1) return 'Quantity must be at least 1';
      return null;
    }
    if (step === 2) {
      // In a real app, we would wait for the upload to complete and get a URL
      if (!state.order.file) return 'Please upload the file you want printed';
      return null;
    }
    if (step === 3) {
      if (state.order.deliverySpeed !== 'pickup' && !state.order.address) {
        return 'Please select a delivery address';
      }
      return null;
    }
    if (step === 4) {
      if (!agreed) return 'Please accept the terms to place your order';
      return null;
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(state.step);
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      return;
    }

    // Require login to proceed to Delivery (Step 3)
    if (state.step === 2 && !token) {
      router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (state.step < TOTAL_STEPS) {
      dispatch({ type: 'SET_STEP', payload: state.step + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handlePlaceOrder();
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      dispatch({ type: 'SET_STEP', payload: state.step - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { openCheckout } = useRazorpay();
  const user = useAppSelector((state) => state.auth.user);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const result = await placeOrderApi({
        sellerId: store.id,
        sellerServiceId: specs.serviceId,
        quantity: Number(specs.quantity),
        specifications: {
          paperType: specs.paperType,
          size: specs.size,
          colorOption: specs.colorOption,
          finishing: specs.finishing
        },
        deliveryAddressId: (state.order.address as any)?.id,
        deliverySpeed: state.order.deliverySpeed.toUpperCase(),
        paymentMethod: state.order.paymentMethod,
        specialInstructions: state.order.specialInstructions,
        // fileUrl would be real here after upload
        fileUrl: "/uploads/designs/demo.pdf" 
      });

      const orderId = result.order.id;

      // Handle Online Payment (Razorpay)
      if (state.order.paymentMethod === 'card' || state.order.paymentMethod === 'upi') {
        try {
          const rzpOrder = await createPaymentOrder(orderId);
          
          await openCheckout({
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            name: 'PrinZex',
            description: `Payment for Order #${orderId.slice(-6).toUpperCase()}`,
            order_id: rzpOrder.razorpayOrderId,
            prefill: {
              name: user?.name,
              email: user?.email || undefined,
              contact: user?.phone || undefined,
            },
            handler: async (response: any) => {
              try {
                await verifyPayment({
                  orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                router.push(`/orders/confirmation/${orderId}`);
              } catch (err: any) {
                dispatch({ type: 'SET_ERROR', payload: `Payment verification failed: ${err.message}` });
                setPlacing(false);
              }
            },
            theme: { color: '#2563eb' }
          });
          return; // Stay on page until handler completes
        } catch (err: any) {
          // If payment initiation fails, we still have the order (status pending)
          // We could redirect to the order detail where they can try again
          console.error('Failed to initiate payment', err);
        }
      }

      router.push(`/orders/confirmation/${orderId}`);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      setPlacing(false);
    }
  };

  return (
    <div className="container-page py-6">
      <Breadcrumbs 
        items={[
          { label: 'Stores', href: '/stores' },
          { label: store.name, href: `/stores/${store.id}` },
          { label: 'Order', active: true }
        ]} 
        className="mb-5"
      />

      <div className="card mb-6 p-5">
        <OrderStepper
          current={state.step}
          maxReached={maxReached}
          onStepClick={(step) => dispatch({ type: 'SET_STEP', payload: step })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card p-6">
          {state.step === 1 && (
            <SpecificationsStep
              specs={specs}
              services={store.services}
              dispatch={dispatch}
              error={state.error}
            />
          )}
          {state.step === 2 && (
            <UploadStep
              file={state.order.file ?? null}
              instructions={state.order.specialInstructions ?? ''}
              dispatch={dispatch}
              error={state.error}
            />
          )}
          {state.step === 3 && (
            <DeliveryStep
              addresses={addresses}
              selectedAddress={state.order.address ?? null}
              speed={state.order.deliverySpeed ?? 'standard'}
              dispatch={dispatch}
              onAddAddress={() => router.push('/dashboard/addresses')}
              error={state.error}
            />
          )}
          {state.step === 4 && (
            <PaymentStep
              method={state.order.paymentMethod ?? 'upi'}
              cost={cost}
              dispatch={dispatch}
              agreed={agreed}
              onAgreedChange={setAgreed}
              error={state.error}
            />
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={state.step === 1 || placing}
              className="btn-secondary"
            >
              <IconArrowLeft className="h-4 w-4" /> Back
            </button>

            <button type="button" onClick={goNext} disabled={placing} className="btn-primary">
              {placing ? (
                'Placing order…'
              ) : state.step === TOTAL_STEPS ? (
                <>Place order · {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(cost.total)}</>
              ) : (
                <>
                  Continue <IconArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:block">
          <OrderSummarySidebar
            storeName={store.name}
            service={service}
            quantity={specs.quantity}
            cost={cost}
            isLoggedIn={!!token}
          />
        </div>
      </div>
    </div>
  );
}
