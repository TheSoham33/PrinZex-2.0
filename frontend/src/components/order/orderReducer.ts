import { FINISHING_OPTIONS, TAX_RATE } from '@/lib/domain/stores';
import { countColorPages } from '@/lib/utils';
import type {
  CostBreakdown,
  DeliveryAddress,
  DeliverySpeed,
  Order,
  OrderSpecifications,
  PaymentMethod,
  ServiceOffering,
  UploadedFile,
} from '@/lib/types';

export interface OrderState {
  step: number;
  order: Partial<Order>;
  error: string | null;
}

/**
 * Fully typed action union — replaces the `payload: any` entries flagged as
 * technical debt in the project docs.
 */
export type OrderAction =
  | { type: 'SET_SPEC'; payload: Partial<OrderSpecifications> }
  | { type: 'SET_FILE'; payload: UploadedFile | null }
  | { type: 'SET_INSTRUCTIONS'; payload: string }
  | { type: 'SET_ADDRESS'; payload: DeliveryAddress }
  | { type: 'SET_SPEED'; payload: DeliverySpeed }
  | { type: 'SET_PAYMENT'; payload: PaymentMethod }
  | { type: 'SET_COST'; payload: { field: keyof CostBreakdown; value: number } }
  | { type: 'SET_COST_BREAKDOWN'; payload: CostBreakdown }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null };

export const EMPTY_COST: CostBreakdown = {
  subtotal: 0,
  rushFee: 0,
  deliveryFee: 0,
  tax: 0,
  discount: 0,
  total: 0,
};

export function createInitialState(
  storeId: string,
  storeName: string,
  serviceId: string,
): OrderState {
  return {
    step: 1,
    error: null,
    order: {
      storeId,
      storeName,
      specifications: {
        serviceId,
        paperType: 'standard',
        size: 'A4',
        quantity: 1,
        colorOption: 'bw',
        finishing: [],
        // Binding defaults — applied for every new job.
        spiralType: 'plastic',
        coverType: 'clear',
        coverDesignType: 'default',
      },
      file: null,
      specialInstructions: '',
      address: null,
      deliverySpeed: 'standard',
      paymentMethod: 'upi',
      costBreakdown: EMPTY_COST,
    },
  };
}

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_SPEC':
      return {
        ...state,
        error: null,
        order: {
          ...state.order,
          specifications: {
            ...(state.order.specifications as OrderSpecifications),
            ...action.payload,
          },
        },
      };

    case 'SET_FILE':
      return { ...state, error: null, order: { ...state.order, file: action.payload } };

    case 'SET_INSTRUCTIONS':
      return { ...state, order: { ...state.order, specialInstructions: action.payload } };

    case 'SET_ADDRESS':
      return { ...state, error: null, order: { ...state.order, address: action.payload } };

    case 'SET_SPEED':
      return { ...state, order: { ...state.order, deliverySpeed: action.payload } };

    case 'SET_PAYMENT':
      return { ...state, error: null, order: { ...state.order, paymentMethod: action.payload } };

    case 'SET_COST': {
      const current = state.order.costBreakdown ?? EMPTY_COST;
      const next: CostBreakdown = { ...current, [action.payload.field]: action.payload.value };
      next.total = recalcTotal(next);
      return { ...state, order: { ...state.order, costBreakdown: next } };
    }

    case 'SET_COST_BREAKDOWN':
      return { ...state, order: { ...state.order, costBreakdown: action.payload } };

    case 'SET_STEP':
      return { ...state, step: action.payload, error: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

export function recalcTotal(cost: CostBreakdown): number {
  return Math.max(
    0,
    Math.round(cost.subtotal + cost.rushFee + cost.deliveryFee + cost.tax - cost.discount),
  );
}

/**
 * Rough client-side estimate for signed-out visitors (the signed-in quote
 * replaces it with the seller's real per-page rates). B&W pages use the
 * service's base rate; colour pages ≈ 2× that.
 */
export function computeCost(
  specs: OrderSpecifications,
  service: ServiceOffering | undefined,
  deliveryFee: number,
  discount: number,
  /** Seller's cheapest per-page rate — used for binding services, whose own
   *  starting price is per-document (never a per-page rate). */
  pageRateFallback?: number,
): CostBreakdown {
  const base = service?.startingPrice ?? 0;
  const quantity = Math.max(1, specs.quantity || 1);
  // No uploaded file ⇒ 0 pages ⇒ page cost ₹0 (mirrors the backend quote).
  const totalPages = Math.max(0, specs.totalPages || 0);

  const isPerPage = service?.unit.toLowerCase().includes('page') ?? false;
  // A page service's base price IS the B&W page rate; a binding service's base
  // price is the per-document binding rate, so its pages use the seller's
  // page-service rate instead (never the binding price).
  const bwPageRate = isPerPage ? base : (pageRateFallback ?? 0);
  const colorPageRate = bwPageRate * 2;

  const colorPageCount =
    specs.colorOption === 'color'
      ? totalPages
      : specs.colorOption === 'mixed'
        ? Math.min(countColorPages(specs.colorPages, totalPages), totalPages)
        : 0;
  const bwPageCount = totalPages - colorPageCount;

  const finishingPerUnit = specs.finishing.reduce((sum, key) => {
    const option = FINISHING_OPTIONS.find((entry) => entry.value === key);
    return sum + (option?.price ?? 0);
  }, 0);

  const isBinding = Boolean(service?.id?.startsWith('bind-'));

  let subtotal: number;
  let pageCost: number | undefined;
  let bindingCost: number | undefined;

  if (isBinding) {
    pageCost = Math.round((bwPageRate * bwPageCount + colorPageRate * colorPageCount) * quantity);
    const bindingRate = base;
    bindingCost = Math.round(bindingRate * quantity);
    subtotal = Math.round(pageCost + bindingCost + finishingPerUnit * quantity);
  } else if (service?.unit.toLowerCase().includes('page')) {
    subtotal = Math.round(
      (bwPageRate * bwPageCount + colorPageRate * colorPageCount) * quantity +
        finishingPerUnit * quantity,
    );
  } else {
    subtotal = Math.round(base * quantity + finishingPerUnit * quantity);
  }

  const rushFee = 0;
  const tax = Math.round((subtotal + deliveryFee) * TAX_RATE);

  const cost: CostBreakdown = {
    subtotal,
    rushFee,
    deliveryFee,
    tax,
    discount,
    total: 0,
    ...(pageCost !== undefined ? { pageCost } : {}),
    ...(bindingCost !== undefined ? { bindingCost } : {}),
  };
  cost.total = recalcTotal(cost);
  return cost;
}
