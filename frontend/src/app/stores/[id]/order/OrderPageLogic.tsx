'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { type StoreDetail } from '@/lib/types';
import { createAddress, fetchAddresses } from '@/lib/api/customer';
import { getOrderQuote, placeOrder as placeOrderApi } from '@/lib/api/orders';
import { createPaymentOrder, verifyPayment } from '@/lib/api/payments';
import { fetchWalletBalance } from '@/lib/api/wallet';
import { fetchPublicPlatformSettings } from '@/lib/api/settings';
import { useRazorpay } from '@/hooks/useRazorpay';
import { addToCart } from '@/store/slices/cartSlice';
import { fileUrlsForOrder } from '@/lib/domain/files';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, getMediaUrl, scrollToField, toApiDeliverySpeed, walletCoverableMax } from '@/lib/utils';
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
  clearOrderDraft,
  loadOrderDraft,
  orderDraftKey,
  saveOrderDraft,
  serializeDraft,
} from '@/lib/domain/orderDraft';
import { IconArrowLeft, IconArrowRight, IconShoppingCart } from '@/components/icons';
import { useCatalogOptions } from '@/lib/api/catalog';
import {
  FILM_THICKNESS_OPTIONS as FILM_THICKNESS_OPTIONS_FALLBACK,
  PHOTO_TYPES as PHOTO_TYPES_FALLBACK,
  STAPLING_OPTIONS as STAPLING_OPTIONS_FALLBACK,
} from '@/lib/domain/stores';

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
  const filmOptionsCatalog = useCatalogOptions('film-thickness', FILM_THICKNESS_OPTIONS_FALLBACK);
  const photoTypesCatalog = useCatalogOptions('photo-types', PHOTO_TYPES_FALLBACK);
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service') ?? '';
  const token = useAppSelector((state) => state.auth.accessToken);
  const draftUserId = useAppSelector((state) => state.auth.user?.id);

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

  // Wallet balance powers the partial-wallet option at the payment step.
  const { data: walletBalance = 0 } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: fetchWalletBalance,
    enabled: !!token,
  });
  // Admin-configured platform fee + whether the wallet may cover it (the
  // Settings → Platform checkbox). Public, so guests see the same numbers.
  const { data: platformSettings } = useQuery({
    queryKey: ['public-platform-settings'],
    queryFn: fetchPublicPlatformSettings,
    staleTime: 60_000,
  });
  const platformFee = platformSettings?.platformFee ?? 0;
  const feeFromWallet = platformSettings?.platformFeeFromWallet ?? false;
  // Default ON: if there is balance, most customers want it used first (they
  // can untick it at the payment step).
  const [useWallet, setUseWallet] = useState(true);

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

  // ── Draft persistence: refresh keeps the step + all entered details ──
  // Restore runs AFTER hydration (localStorage is client-only), then every
  // change writes back. Browser-side PDF/image files can't survive refresh
  // — only Office files already on the server persist, and the customer is
  // asked to re-attach the rest in step 1. NAVIGATING AWAY from the page
  // resets the flow (unmount cleanup below) — the draft exists only to
  // survive a refresh of THIS page.
  //
  // NOTE the key includes the user id, and auth rehydrates ASYNC
  // (ClientWrapper#restoreSession runs after this page mounts): the first
  // render drafts/lookup under :guest, then the key flips to the real user
  // id. Restore therefore runs once PER KEY (a boolean ref would latch on
  // the guest lookup and never read the user's actual draft), and the save
  // effect never writes to a key before that key was read — otherwise the
  // fresh empty state would overwrite the user's real draft on entry.
  // ANY live identity flip (guest → user on sign-in, user → guest on
  // sign-out) restarts the flow: data entered under one identity never
  // leaks into the other (ClientWrapper also wipes all drafts at sign-out).
  const draftKey = useMemo(
    () => orderDraftKey(store.id, draftUserId),
    [store.id, draftUserId],
  );
  const draftRestoredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (draftRestoredKeyRef.current === draftKey) return;
    const previousKey = draftRestoredKeyRef.current;
    draftRestoredKeyRef.current = draftKey;
    if (previousKey !== null) {
      // Identity flipped while this page is open — sign-IN or sign-OUT:
      // restart the flow. Nothing entered under the previous identity is
      // kept: a fresh sign-in discards everything typed as a guest, a
      // sign-out drops the account's attachments. A first page load
      // (previousKey === null) skips this and just restores below.
      const fresh = createInitialState(
        store.id,
        store.name,
        serviceParam,
        store.services.find((entry) => entry.id === serviceParam)?.minQuantity ?? 1,
      );
      dispatch({ type: 'RESTORE', payload: { step: fresh.step, order: fresh.order } });
      setMaxReached(1);
      setAgreed(false);
      setCouponCode('');
      if (!draftUserId) return; // signed out — clean form, nothing to load
      clearOrderDraft(orderDraftKey(store.id, null)); // signed in — wipe the guest slot
    }
    const draft = loadOrderDraft(draftKey, store.id);
    if (!draft) return;
    // Server-backed files (uploaded at attach time) preview straight from
    // the stored URL — the revivable kind after a refresh.
    const restoredOrder = {
      ...draft.order,
      files: (draft.order.files ?? []).map((file) =>
        file.serverFileUrl
          ? { ...file, previewUrl: getMediaUrl(file.serverFileUrl) ?? undefined }
          : file,
      ),
    };
    dispatch({ type: 'RESTORE', payload: { step: draft.step, order: restoredOrder } });
    setMaxReached((previous) => Math.max(previous, draft.step));
    setAgreed(draft.agreed);
    setCouponCode(draft.couponCode);
    if (draft.droppedFiles > 0) {
      showToast(
        `Your details were kept — please re-attach your ${draft.droppedFiles} file(s) in step 1 (browsers clear files on refresh).`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, store.id]);

  useEffect(() => {
    // Read-before-write: only persist once the restore attempt for THIS
    // key has run, so the initial empty state never clobbers a saved draft
    // (the save runs with the pre-restore state in the same commit).
    if (draftRestoredKeyRef.current !== draftKey) return;
    saveOrderDraft(draftKey, serializeDraft(state, { agreed, couponCode }));
  }, [state, agreed, couponCode, draftKey]);

  // Leaving the order page (in-app navigation, store switch, closing the
  // flow) resets everything: the draft is wiped on unmount, so coming back
  // starts a clean order. A hard refresh/breakdown never runs React
  // cleanups, which is exactly why refresh keeps working. The closure must
  // NOT depend on draftKey — the cleanup for the old key would also run on
  // every login/logout key flip and wipe the draft before the restore
  // effect reads it — so the latest key is tracked in a ref instead.
  const draftKeyLiveRef = useRef(draftKey);
  useEffect(() => {
    draftKeyLiveRef.current = draftKey;
  }, [draftKey]);
  useEffect(() => {
    return () => {
      clearOrderDraft(draftKeyLiveRef.current);
    };
  }, [store.id]);

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
    filmThickness: specs.filmThickness,
    photoType: specs.photoType,
    photosPerSheet: specs.photosPerSheet,
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
    return computeCost(specs, service, 0, 0, pageRateFallback, staplingOptionsCatalog, filmOptionsCatalog, photoTypesCatalog, platformFee);
  }, [token, quoteData, quoteLoading, specs, service, pageRateFallback, staplingOptionsCatalog, filmOptionsCatalog, photoTypesCatalog, platformFee]);

  // Wallet split for the chosen method — mirrors PaymentStep's math so the
  // Place-order button and the payload both tell the truth. The wallet may
  // only cover up to coverableMax (platform fee excluded unless the admin
  // checkbox allows wallet-paid fees).
  const method = state.order.paymentMethod ?? 'upi';
  const methodIsOnline = method === 'card' || method === 'upi';
  const coverableMax = walletCoverableMax(
    cost.total,
    cost.platformFee ?? platformFee,
    feeFromWallet,
  );
  const walletApplied =
    method === 'wallet' || (methodIsOnline && useWallet)
      ? Math.min(walletBalance, coverableMax)
      : 0;
  const onlineDue = Math.max(0, cost.total - walletApplied);

  useEffect(() => {
    if (quoteData) {
      dispatch({ type: 'SET_COST_BREAKDOWN', payload: quoteData });
    }
  }, [quoteData]);

  useEffect(() => {
    setMaxReached((previous) => Math.max(previous, state.step));
  }, [state.step]);

  // First failure wins: { field } is the id of the owning input — the
  // message renders UNDER that field and the page scrolls to it.
  const validateStep = (step: number): { field: string; message: string } | null => {
    if (step === 1) {
      if (!specs.serviceId) return { field: 'service', message: 'Please choose a service' };
      if (!specs.paperType) return { field: 'order-paper-type', message: 'Please choose a paper type' };
      if (!specs.size) return { field: 'order-paper-size', message: 'Please choose a size' };
      if (!specs.quantity || specs.quantity < 1)
        return { field: 'quantity', message: 'Quantity must be at least 1' };
      if (specs.quantity < (service?.minQuantity ?? 1))
        return { field: 'quantity', message: `Minimum order quantity for this service is ${service?.minQuantity}` };
      if (service?.minPages && (specs.totalPages ?? 0) < service.minPages)
        return { field: 'order-files', message: `Minimum page count should be ${service.minPages} for ${service.name}` };
      if (specs.serviceId === 'spec-photo-prints') {
        const configuredTypes = photoTypesCatalog.filter(
          (option) => option.value in (service?.photoTypeOptions ?? {}),
        );
        if (configuredTypes.length === 0)
          return { field: 'photo-type', message: 'This store has not set up Photo Print yet — try another store' };
        if (!specs.photoType) return { field: 'photo-type', message: 'Choose a photo type' };
      }
      if ((state.order.files?.length ?? 0) === 0 && specs.serviceId !== 'cards-business')
        return { field: 'order-files', message: 'Please upload the file you want printed' };
      if (specs.serviceId === 'bind-hard') {
        if (!specs.coverColor)
          return { field: 'order-cover-panel', message: 'Please choose a hard cover fabric colour' };
        if (!specs.coverTextColor) return { field: 'order-cover-panel', message: 'Please choose a foil font colour' };
        if (!specs.hardCoverFrontSource)
          return { field: 'order-cover-panel', message: 'Please choose the front cover source' };
        if (
          specs.hardCoverFrontSource === 'upload' &&
          !specs.frontCoverFileUrl
        ) {
          return { field: 'order-cover-panel', message: 'Please upload the single-page portrait front cover PDF' };
        }
        if (specs.printSpineText && !specs.spineText?.trim()) {
          return { field: 'spine-text', message: 'Please enter the spine text' };
        }
        if (!specs.hardBindingProofApproved) {
          return { field: 'order-cover-panel', message: 'Please approve the hard binding cover proof' };
        }
      }
      if (specs.serviceId === 'lam-film' && !specs.filmThickness) {
        return { field: 'order-film-thickness', message: 'Please choose a film thickness' };
      }
      if (specs.serviceId === 'bind-tape') {
        if (!specs.tapeColor) return { field: 'order-tape-panel', message: 'Please choose a tape colour' };
        if (!specs.tapeCoverSource) return { field: 'order-tape-panel', message: 'Please choose the front cover source' };
        if (specs.tapeCoverSource === 'upload' && !specs.tapeFrontCoverFileUrl) {
          return { field: 'order-tape-panel', message: 'Please upload the single-page front cover design (PDF/PNG/JPG)' };
        }
      }
      if (specs.serviceId === 'bind-perfect') {
        if (!specs.glueCoverSource) return { field: 'order-glue-panel', message: 'Please choose the front cover source' };
        if (specs.glueCoverSource === 'upload' && !specs.glueFrontCoverFileUrl) {
          return { field: 'order-glue-panel', message: 'Please upload the single-page front cover design (PDF/PNG/JPG)' };
        }
      }
      if (specs.serviceId === 'bind-twin-loop') {
        if (
          !specs.twinLoopWireColor ||
          !specs.twinLoopFrontCover ||
          !specs.twinLoopBackCover
        ) {
          return { field: 'order-twinloop-panel', message: 'Please choose the Twin Loop wire and cover options' };
        }
        if (!specs.twinLoopBindingEdge || !specs.twinLoopPrintSides) {
          return { field: 'order-twinloop-panel', message: 'Please choose the binding edge and inner-page print style' };
        }
        if (!specs.twinLoopSafeZoneAcknowledged) {
          return { field: 'order-twinloop-panel', message: 'Please confirm the 10 mm Twin Loop punch-margin safe zone' };
        }
        if (!specs.twinLoopCoverSubmission) {
          return { field: 'order-twinloop-panel', message: 'Please choose how you will submit the Twin Loop cover designs' };
        }
        if (
          specs.twinLoopCoverSubmission === 'embedded' &&
          (specs.totalPages ?? 0) < 3
        ) {
          return { field: 'order-files', message: 'The embedded master PDF must include front cover, inner pages, and back cover' };
        }
        if (
          specs.twinLoopCoverSubmission === 'split' &&
          (!specs.twinLoopFrontFileUrl || !specs.twinLoopBackFileUrl)
        ) {
          return { field: 'order-twinloop-panel', message: 'Please upload the separate front and back cover artwork' };
        }
        if (!specs.twinLoopCoverMaterial) {
          return { field: 'order-twinloop-panel', message: 'Please choose a printable Twin Loop cover material' };
        }
        if (!specs.twinLoopBleedAcknowledged) {
          return { field: 'order-twinloop-panel', message: 'Please confirm the 3 mm cover bleed requirement' };
        }
        if (!specs.twinLoopFlipAcknowledged) {
          return { field: 'order-twinloop-panel', message: 'Please confirm the back-cover 360-degree flip orientation' };
        }
      }
      if (specs.serviceId === 'cards-business') {
        if (!specs.cardShape) return { field: 'order-card-panel', message: 'Please choose the card shape' };
        if (!specs.cardPaper) return { field: 'order-card-panel', message: 'Please choose the card paper / texture' };
        if (!specs.cardSize) return { field: 'order-card-panel', message: 'Please choose the card size' };
        if (!specs.cardCorners) return { field: 'order-card-panel', message: 'Please choose the corners' };
        if (!specs.cardPrintSides) {
          return { field: 'order-card-panel', message: 'Please choose single or double-sided printing' };
        }
        if (specs.cardDesignSource === 'template' && !specs.cardTemplate) {
          return { field: 'order-card-panel', message: 'Please pick a ready template' };
        }
        if (specs.cardDesignSource === 'upload') {
          if (!specs.cardFrontFileUrl) {
            return { field: 'order-card-panel', message: 'Please upload your front card design' };
          }
          if (
            specs.cardPrintSides === 'double' &&
            !specs.cardBackSameAsFront &&
            !specs.cardBackFileUrl
          ) {
            return { field: 'order-card-panel', message: 'Please upload your back design, switch to single-sided, or choose back same as front' };
          }
        }
        if (!specs.cardDesignSource) {
          return { field: 'order-card-panel', message: 'Please choose a design source' };
        }
        if (!specs.cardProofApproved) {
          return { field: 'order-card-panel', message: 'Please approve the Business Card proof' };
        }
      }
      return null;
    }
    if (step === 2) {
      if (state.order.deliverySpeed !== 'pickup' && !state.order.address) {
        return { field: 'order-address', message: 'Please select a delivery address' };
      }
      return null;
    }
    if (step === 3) {
      if (!agreed) return { field: 'order-terms', message: 'Please accept the terms to place your order' };
      return null;
    }
    return null;
  };

  /** Block with the message UNDER the invalid field and scroll it into view. */
  const blockWithFieldError = (failure: { field: string; message: string }) => {
    dispatch({
      type: 'SET_ERROR',
      payload: { error: failure.message, field: failure.field },
    });
    scrollToField(failure.field);
  };

  // Sign-in is mandatory for every real order action — attach, Continue,
  // Add to Cart, Place order. A guest attempt only SHOWS the validation
  // (toast); the customer stays exactly where they are — no /login bounce.
  // (A toast, not SET_ERROR: the sign-in nudge has no owning input field,
  // and a toast vanishes on its own once the customer signs in.)
  const requireLogin = (message: string): boolean => {
    if (token) return true;
    showToast(message, 'error');
    return false;
  };

  const goNext = () => {
    if (!requireLogin('Please sign in to continue with your order.')) return;

    const failure = validateStep(state.step);
    if (failure) {
      blockWithFieldError(failure);
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
        // Partial wallet: only meaningful on online methods with balance —
        // the backend ignores this flag for 'wallet' (full) and 'cod'.
        useWallet: methodIsOnline && useWallet && walletBalance > 0 ? true : undefined,
        specialInstructions: state.order.specialInstructions,
        couponCode: couponCode || undefined,
        // Office files were converted to PDF and stored at attach time;
        // other types keep the pre-existing client-side stub for now.
        fileUrls: fileUrlsForOrder(state.order.files ?? []),
      });

      const orderId = result.order.id;

      // Wallet may have covered the whole total — the backend flips such
      // orders straight to 'paid', and the Razorpay popup must NOT open.
      const settledWithoutGateway = result.order?.paymentStatus === 'paid';

      // Handle Online Payment (Razorpay)
      if (
        !settledWithoutGateway &&
        (state.order.paymentMethod === 'card' ||
        state.order.paymentMethod === 'upi')
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
                clearOrderDraft(draftKey);
                router.push(`/orders/confirmation/${orderId}`);
              } catch (err: any) {
                dispatch({
                  type: 'SET_ERROR',
                  payload: { error: `Payment verification failed: ${err.message}` },
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

      clearOrderDraft(draftKey);
      router.push(`/orders/confirmation/${orderId}`);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message } });
      setPlacing(false);
    }
  };

  const handleAddToCart = () => {
    if (!requireLogin('Please sign in to add items to your cart.')) return;

    // Validate current step before allowing add to cart
    const failure = validateStep(state.step);
    if (failure) {
      blockWithFieldError(failure);
      return;
    }

    if ((state.order.files?.length ?? 0) === 0) {
      blockWithFieldError({
        field: 'order-files',
        message: 'Please upload a file before adding to cart',
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
        files: state.order.files ?? [],
        specialInstructions: state.order.specialInstructions || '',
        costBreakdown: cost,
      }),
    );

    showToast('Added to cart successfully!');
    clearOrderDraft(draftKey);
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
              files={state.order.files ?? []}
              instructions={state.order.specialInstructions ?? ''}
              dispatch={dispatch}
              error={state.error}
              errorField={state.errorField}
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
              errorField={state.errorField}
            />
          )}
          {state.step === 3 && (
            <PaymentStep
              method={state.order.paymentMethod ?? 'upi'}
              cost={cost}
              dispatch={dispatch}
              errorField={state.errorField}
              agreed={agreed}
              onAgreedChange={(value) => {
                setAgreed(value);
                // Checking the box clears the "accept the terms" error so the
                // Place order button re-enables immediately.
                if (value) dispatch({ type: 'SET_ERROR', payload: { error: null } });
              }}
              error={state.error}
              couponCode={couponCode}
              onCouponCodeChange={setCouponCode}
              couponError={couponError}
              couponLoading={quoteLoading}
              wallet={{ balance: walletBalance, useWallet, onToggle: setUseWallet }}
              platformFeeFromWallet={feeFromWallet}
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

              {/* Never disabled by validation: clicks are blocked with an
                  under-field message instead (site-wide rule). `placing`
                  stays — it guards a real in-flight order. */}
              <button
                type="button"
                onClick={goNext}
                disabled={placing}
                className="btn-primary"
              >
                {placing ? (
                  'Placing order…'
                ) : state.step === TOTAL_STEPS ? (
                  walletApplied > 0 && onlineDue === 0 ? (
                    <>Place order — pay from wallet</>
                  ) : walletApplied > 0 ? (
                    <>Place order · pay {formatCurrency(onlineDue)} online</>
                  ) : (
                    <>Place order · {formatCurrency(cost.total)}</>
                  )
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
