'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DELIVERY_SPEEDS,
  MOCK_ADDRESSES,
  type DeliveryAddress,
  type Order,
  type OrderSpecifications,
  type StoreDetail,
} from '@/lib/mock-data/stores';
import OrderStepper from '@/components/order/OrderStepper';
import OrderSummarySidebar from '@/components/order/OrderSummarySidebar';
import SpecificationsStep from '@/components/order/SpecificationsStep';
import UploadStep from '@/components/order/UploadStep';
import DeliveryStep from '@/components/order/DeliveryStep';
import PaymentStep from '@/components/order/PaymentStep';
import {
  computeCost,
  createInitialState,
  orderReducer,
  EMPTY_COST,
} from '@/components/order/orderReducer';
import { IconArrowLeft, IconArrowRight, IconChevronRight } from '@/components/icons';

const TOTAL_STEPS = 4;

export default function OrderPageLogic({ store }: { store: StoreDetail }) {
  const router = useRouter();
  // Read the pre-selected service from the URL — never from window.location,
  // which would crash during server rendering.
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service') ?? '';

  const [state, dispatch] = useReducer(
    orderReducer,
    createInitialState(store.id, store.name, serviceParam),
  );
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(MOCK_ADDRESSES);
  const [agreed, setAgreed] = useState(false);
  const [maxReached, setMaxReached] = useState(1);
  const [placing, setPlacing] = useState(false);

  const specs = state.order.specifications as OrderSpecifications;
  const service = store.services.find((entry) => entry.id === specs.serviceId);
  const deliveryOption = DELIVERY_SPEEDS.find((option) => option.key === state.order.deliverySpeed);
  const cost = state.order.costBreakdown ?? EMPTY_COST;

  // Recalculate pricing whenever specs, delivery speed or discount change.
  const discount = cost.discount;
  const computed = useMemo(
    () => computeCost(specs, service, deliveryOption?.cost ?? 0, discount),
    [specs, service, deliveryOption, discount],
  );

  useEffect(() => {
    dispatch({ type: 'SET_COST_BREAKDOWN', payload: computed });
  }, [computed]);

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
    if (state.step < TOTAL_STEPS) {
      dispatch({ type: 'SET_STEP', payload: state.step + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      placeOrder();
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      dispatch({ type: 'SET_STEP', payload: state.step - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const placeOrder = () => {
    setPlacing(true);
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const etaDays = state.order.deliverySpeed === 'standard' ? 3 : 1;
    const estimated = new Date();
    estimated.setDate(estimated.getDate() + etaDays);

    const finalOrder: Order = {
      id: orderId,
      storeId: store.id,
      storeName: store.name,
      specifications: specs,
      file: state.order.file ?? null,
      specialInstructions: state.order.specialInstructions ?? '',
      address: state.order.address ?? null,
      deliverySpeed: state.order.deliverySpeed ?? 'standard',
      estimatedDeliveryDate: estimated.toISOString(),
      paymentMethod: state.order.paymentMethod ?? 'upi',
      costBreakdown: cost,
      placedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(orderId, JSON.stringify(finalOrder));
    } catch {
      /* storage unavailable — the confirmation page falls back gracefully */
    }

    setTimeout(() => router.push(`/orders/confirmation/${orderId}`), 900);
  };

  return (
    <div className="container-page py-6">
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <Link href="/stores" className="hover:text-blue-600">
              Stores
            </Link>
          </li>
          <IconChevronRight className="h-4 w-4" />
          <li>
            <Link href={`/stores/${store.id}`} className="hover:text-blue-600">
              {store.name}
            </Link>
          </li>
          <IconChevronRight className="h-4 w-4" />
          <li className="font-medium text-slate-900">Order</li>
        </ol>
      </nav>

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
              onAddAddress={(address) => {
                setAddresses((previous) => [...previous, address]);
                dispatch({ type: 'SET_ADDRESS', payload: address });
              }}
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
          />
        </div>
      </div>
    </div>
  );
}
