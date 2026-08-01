import {
  FINISHING_OPTIONS,
  PAPER_SIZES,
  PAPER_TYPES,
  TAX_RATE,
  type CostBreakdown,
  type DeliveryAddress,
  type DeliverySpeed,
  type Order,
  type OrderSpecifications,
  type PaymentMethod,
  type ServiceOffering,
  type UploadedFile,
} from '@/lib/types/stores';

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
        paperType: '',
        size: '',
        quantity: 1,
        colorOption: 'bw',
        finishing: [],
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
 * Price a job from its specifications. Paper type and size act as multipliers on
 * the service's base rate; colour doubles it; finishing is charged per unit.
 */
export function computeCost(
  specs: OrderSpecifications,
  service: ServiceOffering | undefined,
  deliveryFee: number,
  discount: number,
): CostBreakdown {
  const base = service?.startingPrice ?? 0;
  const paper = PAPER_TYPES.find((type) => type.value === specs.paperType)?.multiplier ?? 1;
  const size = PAPER_SIZES.find((entry) => entry.value === specs.size)?.multiplier ?? 1;
  const colour = specs.colorOption === 'color' ? 2 : 1;
  const quantity = Math.max(1, specs.quantity || 1);

  const finishingPerUnit = specs.finishing.reduce((sum, key) => {
    const option = FINISHING_OPTIONS.find((entry) => entry.value === key);
    return sum + (option?.price ?? 0);
  }, 0);

  const subtotal = Math.round(base * paper * size * colour * quantity + finishingPerUnit * quantity);
  const rushFee = 0;
  const tax = Math.round((subtotal + deliveryFee) * TAX_RATE);

  const cost: CostBreakdown = { subtotal, rushFee, deliveryFee, tax, discount, total: 0 };
  cost.total = recalcTotal(cost);
  return cost;
}

/** Coupon codes accepted at checkout (mock). */
export function applyCoupon(code: string, subtotal: number): { discount: number; error?: string } {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return { discount: 0, error: 'Enter a coupon code' };

  if (normalised === 'WELCOME10') {
    if (subtotal < 200) return { discount: 0, error: 'Valid on orders above ₹200' };
    return { discount: Math.min(Math.round(subtotal * 0.1), 100) };
  }
  if (normalised === 'FIRSTORDER') {
    return { discount: 50 };
  }
  return { discount: 0, error: 'That code isn’t valid' };
}
