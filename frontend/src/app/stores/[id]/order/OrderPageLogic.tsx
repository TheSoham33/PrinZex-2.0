'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { type StoreDetail } from '@/lib/types';
import { createAddress, fetchAddresses } from '@/lib/api/customer';
import { getOrderQuote, placeOrder as placeOrderApi } from '@/lib/api/orders';
import { createPaymentOrder, verifyPayment } from '@/lib/api/payments';
import { useRazorpay } from '@/hooks/useRazorpay';
import { addToCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, toApiDeliverySpeed } from '@/lib/utils';
import OrderStepper from '@/components/order/OrderStepper';
import OrderSummarySidebar from '@/components/order/OrderSummarySidebar';
import SpecificationsStep from '@/components/order/SpecificationsStep';
import DeliveryStep from '@/components/order/DeliveryStep';
import PaymentStep from '@/components/order/PaymentStep';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import {
  createInitialState,
  orderReducer,
  EMPTY_COST,
  computeCost,
} from '@/components/order/orderReducer';
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronRight,
  IconLock,
  IconShoppingCart,
} from '@/components/icons';
import { useCatalogOptions } from '@/lib/api/catalog';
import { STAPLING_OPTIONS as STAPLING_OPTIONS_FALLBACK } from '@/lib/domain/stores';

const TOTAL_STEPS = 3;

export default function OrderPageLogic({ store }: { store: StoreDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const reduxDispatch = useAppDispatch();

  // Redirect or show error if store is closed
  useEffect(() => {
    if (!store.isOpen) {
      router.replace(`/stores/${store.id}`);
    }
  }, [store.isOpen, store.id, router]);

  const staplingOptionsCatalog = useCatalogOptions('stapling-options', STAPLING_OPTIONS_FALLBACK);
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service') ?? '';
  const token = useAppSelector((state) => state.auth.accessToken);

  const [state, dispatch] = useReducer(
    orderReducer,
    createInitialState(
      store.id,
      store.name,
      serviceParam,
      store.services.find((entry) => entry.id === serviceParam)?.minQuantity ??
        1,
    ),
  );

  const queryClient = useQueryClient();

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    enabled: !!token,
  });

  // Persist a new address (from the DeliveryStep modal), refresh the list and
  // auto-select it so the customer stays in the order flow.
  const handleAddAddress = async (address: {
    label: string;
    fullAddress: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
  }): Promise<boolean> => {
    try {
      const created = await createAddress({
        label: address.label,
        fullAddress: address.fullAddress,
        phone: address.phone,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      });
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      dispatch({
        type: 'SET_ADDRESS',
        payload: {
          id: created.id,
          label: created.label,
          fullAddress: created.fullAddress,
          phone: created.phone,
        },
      });
      showToast('Address saved');
      return true;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save address', 'error');
      return false;
    }
  };

  const [agreed, setAgreed] = useState(false);
  const [maxReached, setMaxReached] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const specs = state.order.specifications as any;
  const service = store.services.find((entry) => entry.id === specs.serviceId);
  // One specifications projection shared by the quote query and order
  // placement — a single source so the two server calls never drift.
  const specificationsPayload = {
    paperType: specs.paperType,
    size: specs.size,
    colorOption: specs.colorOption,
    printSides: specs.printSides,
    stapling: specs.stapling,
    totalPages: specs.totalPages,
    colorPages: specs.colorPages,
    coverType: specs.coverType,
    spiralType: specs.spiralType,
    coverColor: specs.coverColor,
    coverTextColor: specs.coverTextColor,
    coverDesignType: specs.coverDesignType,
    hardCoverFrontSource: specs.hardCoverFrontSource,
    frontCoverFileUrl: specs.frontCoverFileUrl,
    backCoverFileUrl: specs.backCoverFileUrl,
    printSpineText: specs.printSpineText,
    spineText: specs.spineText,
    paperGsm: specs.paperGsm,
    hardBindingProofApproved: specs.hardBindingProofApproved,
    tapeColor: specs.tapeColor,
    tapeCoverSource: specs.tapeCoverSource,
    tapeFrontCoverFileUrl: specs.tapeFrontCoverFileUrl,
    tapeBackCoverFileUrl: specs.tapeBackCoverFileUrl,
    glueCoverSource: specs.glueCoverSource,
    glueFrontCoverFileUrl: specs.glueFrontCoverFileUrl,
    glueBackCoverFileUrl: specs.glueBackCoverFileUrl,
    twinLoopWireColor: specs.twinLoopWireColor,
    twinLoopFrontCover: specs.twinLoopFrontCover,
    twinLoopBackCover: specs.twinLoopBackCover,
    twinLoopBindingEdge: specs.twinLoopBindingEdge,
    twinLoopPrintSides: specs.twinLoopPrintSides,
    twinLoopCalendarHanger: specs.twinLoopCalendarHanger,
    twinLoopConcealed: specs.twinLoopConcealed,
    twinLoopSafeZoneAcknowledged: specs.twinLoopSafeZoneAcknowledged,
    twinLoopCoverSubmission: specs.twinLoopCoverSubmission,
    twinLoopFrontPrintSides: specs.twinLoopFrontPrintSides,
    twinLoopBackPrintSides: specs.twinLoopBackPrintSides,
    twinLoopFrontFileUrl: specs.twinLoopFrontFileUrl,
    twinLoopBackFileUrl: specs.twinLoopBackFileUrl,
    twinLoopMirrorBack: specs.twinLoopMirrorBack,
    twinLoopCoverMaterial: specs.twinLoopCoverMaterial,
    twinLoopBleedAcknowledged: specs.twinLoopBleedAcknowledged,
    twinLoopFlipAcknowledged: specs.twinLoopFlipAcknowledged,
    cardShape: specs.cardShape,
    cardPaper: specs.cardPaper,
    cardSize: specs.cardSize,
    cardCorners: specs.cardCorners,
    cardPrintSides: specs.cardPrintSides,
    cardBackSameAsFront: specs.cardBackSameAsFront,
    cardDesignSource: specs.cardDesignSource,
    cardTemplate: specs.cardTemplate,
    cardFrontFileUrl: specs.cardFrontFileUrl,
    cardFrontFileName: specs.cardFrontFileName,
    cardBackFileUrl: specs.cardBackFileUrl,
    cardBackFileName: specs.cardBackFileName,
    cardStudioFront: specs.cardStudioFront,
    cardStudioBack: specs.cardStudioBack,
    cardProofApproved: specs.cardProofApproved,
  };


  // Real Quote Fetching
  const { data: quoteData, isFetching: quoteLoading } = useQuery({
    queryKey: [
      'order-quote',
      store.id,
      specs,
      state.order.deliverySpeed,
      couponCode,
    ],
    queryFn: () =>
      getOrderQuote({
        sellerId: store.id,
        sellerServiceId: specs.serviceId,
        quantity: Number(specs.quantity),
        specifications: specificationsPayload,
        deliverySpeed: toApiDeliverySpeed(state.order.deliverySpeed),
        couponCode: couponCode || undefined,
      }),
    enabled: !!token && !!specs.serviceId && !!specs.paperType && !!specs.size,
    retry: false,
  });

  // Backend-validated coupon feedback (quote returns coupon.valid / coupon.error).
  const couponError =
    couponCode && quoteData?.coupon && !quoteData.coupon.valid
      ? (quoteData.coupon.error ?? 'Coupon is not valid')
      : null;

  // Seller's cheapest per-page rate — fallback for binding services.
  const pageRateFallback = useMemo(() => {
    const pageServices = store.services.filter((s) =>
      s.unit?.toLowerCase().includes('page'),
    );
    if (pageServices.length === 0) return undefined;
    return Math.min(...pageServices.map((s) => s.startingPrice));
  }, [store.services]);

  // Calculate local cost for non-logged in users or while loading. While the
  // quote is refetching (e.g. right after the PDF was removed) we use the local
  // estimate so the summary resets immediately instead of showing stale prices.
  const cost = useMemo(() => {
    if (token && quoteData && !quoteLoading) return quoteData;
    return computeCost(specs, service, 0, 0, pageRateFallback, staplingOptionsCatalog);
  }, [token, quoteData, quoteLoading, specs, service, pageRateFallback]);

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
      if (!specs.quantity || specs.quantity < 1)
        return 'Quantity must be at least 1';
      if (specs.quantity < (service?.minQuantity ?? 1))
        return `Minimum order quantity for this service is ${service?.minQuantity}`;
      if (service?.minPages && (specs.totalPages ?? 0) < service.minPages)
        return `Minimum page count should be ${service.minPages} for ${service.name}`;
      if (!state.order.file && specs.serviceId !== 'cards-business')
        return 'Please upload the file you want printed';
      if (specs.serviceId === 'bind-hard') {
        if (!specs.coverColor)
          return 'Please choose a hard cover fabric colour';
        if (!specs.coverTextColor) return 'Please choose a foil font colour';
        if (!specs.hardCoverFrontSource)
          return 'Please choose the front cover source';
        if (
          specs.hardCoverFrontSource === 'upload' &&
          !specs.frontCoverFileUrl
        ) {
          return 'Please upload the single-page portrait front cover PDF';
        }
        if (specs.printSpineText && !specs.spineText?.trim()) {
          return 'Please enter the spine text';
        }
        if (!specs.hardBindingProofApproved) {
          return 'Please approve the hard binding cover proof';
        }
      }
      if (specs.serviceId === 'bind-tape') {
        if (!specs.tapeColor) return 'Please choose a tape colour';
        if (!specs.tapeCoverSource) return 'Please choose the front cover source';
        if (specs.tapeCoverSource === 'upload' && !specs.tapeFrontCoverFileUrl) {
          return 'Please upload the single-page front cover design (PDF/PNG/JPG)';
        }
      }
      if (specs.serviceId === 'bind-perfect') {
        if (!specs.glueCoverSource) return 'Please choose the front cover source';
        if (specs.glueCoverSource === 'upload' && !specs.glueFrontCoverFileUrl) {
          return 'Please upload the single-page front cover design (PDF/PNG/JPG)';
        }
      }
      if (specs.serviceId === 'bind-twin-loop') {
        if (
          !specs.twinLoopWireColor ||
          !specs.twinLoopFrontCover ||
          !specs.twinLoopBackCover
        ) {
          return 'Please choose the Twin Loop wire and cover options';
        }
        if (!specs.twinLoopBindingEdge || !specs.twinLoopPrintSides) {
          return 'Please choose the binding edge and inner-page print style';
        }
        if (!specs.twinLoopSafeZoneAcknowledged) {
          return 'Please confirm the 10 mm Twin Loop punch-margin safe zone';
        }
        if (!specs.twinLoopCoverSubmission) {
          return 'Please choose how you will submit the Twin Loop cover designs';
        }
        if (
          specs.twinLoopCoverSubmission === 'embedded' &&
          (specs.totalPages ?? 0) < 3
        ) {
          return 'The embedded master PDF must include front cover, inner pages, and back cover';
        }
        if (
          specs.twinLoopCoverSubmission === 'split' &&
          (!specs.twinLoopFrontFileUrl || !specs.twinLoopBackFileUrl)
        ) {
          return 'Please upload the separate front and back cover artwork';
        }
        if (!specs.twinLoopCoverMaterial) {
          return 'Please choose a printable Twin Loop cover material';
        }
        if (!specs.twinLoopBleedAcknowledged) {
          return 'Please confirm the 3 mm cover bleed requirement';
        }
        if (!specs.twinLoopFlipAcknowledged) {
          return 'Please confirm the back-cover 360-degree flip orientation';
        }
      }
      if (specs.serviceId === 'cards-business') {
        if (!specs.cardShape) return 'Please choose the card shape';
        if (!specs.cardPaper) return 'Please choose the card paper / texture';
        if (!specs.cardSize) return 'Please choose the card size';
        if (!specs.cardCorners) return 'Please choose the corners';
        if (!specs.cardPrintSides) {
          return 'Please choose single or double-sided printing';
        }
        if (specs.cardDesignSource === 'template' && !specs.cardTemplate) {
          return 'Please pick a ready template';
        }
        if (specs.cardDesignSource === 'upload') {
          if (!specs.cardFrontFileUrl) {
            return 'Please upload your front card design';
          }
          if (
            specs.cardPrintSides === 'double' &&
            !specs.cardBackSameAsFront &&
            !specs.cardBackFileUrl
          ) {
            return 'Please upload your back design, switch to single-sided, or choose back same as front';
          }
        }
        if (!specs.cardDesignSource) {
          return 'Please choose a design source';
        }
        if (!specs.cardProofApproved) {
          return 'Please approve the Business Card proof';
        }
      }
      return null;
    }
    if (step === 2) {
      if (state.order.deliverySpeed !== 'pickup' && !state.order.address) {
        return 'Please select a delivery address';
      }
      return null;
    }
    if (step === 3) {
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

    // Require login to proceed to Delivery (Step 2)
    if (state.step === 1 && !token) {
      router.push(
        `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
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
        specifications: specificationsPayload,
        deliveryAddressId: (state.order.address as any)?.id,
        deliverySpeed: toApiDeliverySpeed(state.order.deliverySpeed),
        paymentMethod: state.order.paymentMethod,
        specialInstructions: state.order.specialInstructions,
        couponCode: couponCode || undefined,
        // fileUrl would be real here after upload
        fileUrl: '/uploads/designs/demo.pdf',
      });

      const orderId = result.order.id;

      // Handle Online Payment (Razorpay)
      if (
        state.order.paymentMethod === 'card' ||
        state.order.paymentMethod === 'upi'
      ) {
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
                dispatch({
                  type: 'SET_ERROR',
                  payload: `Payment verification failed: ${err.message}`,
                });
                setPlacing(false);
              }
            },
            theme: { color: '#2563eb' },
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

  const handleAddToCart = () => {
    // Validate current step before allowing add to cart
    const error = validateStep(state.step);
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      return;
    }

    if (!state.order.file) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please upload a file before adding to cart',
      });
      return;
    }

    reduxDispatch(
      addToCart({
        id: `cart-${Date.now()}`,
        storeId: store.id,
        storeName: store.name,
        serviceId: specs.serviceId,
        serviceName: service?.name || 'Document Printing',
        specifications: specs,
        file: state.order.file,
        specialInstructions: state.order.specialInstructions || '',
        costBreakdown: cost,
      }),
    );

    showToast('Added to cart successfully!');
    router.push(`/stores/${store.id}`);
  };

  return (
    <div className="container-page py-6">
      <Breadcrumbs
        items={[
          { label: 'Stores', href: '/stores' },
          { label: store.name, href: `/stores/${store.id}` },
          { label: 'Order', active: true },
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
              file={state.order.file ?? null}
              instructions={state.order.specialInstructions ?? ''}
              dispatch={dispatch}
              error={state.error}
              availableCoverTypes={store.availableCoverTypes}
              availableCoilTypes={store.availableCoilTypes}
              availableCoverColors={store.availableCoverColors}
              availableHardCoverColors={store.availableHardCoverColors}
              availableHardFoilColors={store.availableHardFoilColors}
              availableTapeColors={store.availableTapeColors}
            />
          )}
          {state.step === 2 && (
            <DeliveryStep
              addresses={addresses}
              selectedAddress={state.order.address ?? null}
              speed={state.order.deliverySpeed ?? 'standard'}
              dispatch={dispatch}
              onAddAddress={handleAddAddress}
              error={state.error}
            />
          )}
          {state.step === 3 && (
            <PaymentStep
              method={state.order.paymentMethod ?? 'upi'}
              cost={cost}
              dispatch={dispatch}
              agreed={agreed}
              onAgreedChange={(value) => {
                setAgreed(value);
                // Checking the box clears the "accept the terms" error so the
                // Place order button re-enables immediately.
                if (value) dispatch({ type: 'SET_ERROR', payload: null });
              }}
              error={state.error}
              couponCode={couponCode}
              onCouponCodeChange={setCouponCode}
              couponError={couponError}
              couponLoading={quoteLoading}
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

            <div className="flex gap-2">
              {state.step === 1 &&
                specs.serviceId &&
                specs.paperType &&
                specs.size && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="btn-secondary px-6"
                  >
                    <IconShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </button>
                )}

              <button
                type="button"
                onClick={goNext}
                disabled={placing || state.error !== null}
                className="btn-primary"
              >
                {placing ? (
                  'Placing order…'
                ) : state.step === TOTAL_STEPS ? (
                  <>Place order · {formatCurrency(cost.total)}</>
                ) : (
                  <>
                    Continue <IconArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:block">
          <OrderSummarySidebar
            storeName={store.name}
            service={service}
            quantity={specs.quantity}
            cost={cost}
            isLoggedIn={!!token}
            specs={specs}
          />
        </div>
      </div>
    </div>
  );
}
