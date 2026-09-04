import { STAPLING_OPTIONS, TAX_RATE } from '@/lib/domain/stores';
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

/** Same "from qty → per-piece rate" picker as backend pricing.slabs. */
export function pickSlabRate(
  slabs: { qty: number; rate: number }[] | undefined,
  quantity: number,
): number | undefined {
  if (!slabs?.length) return undefined;
  const sorted = [...slabs].sort((a, b) => a.qty - b.qty);
  const tier = [...sorted].reverse().find((s) => quantity >= s.qty) ?? sorted[0];
  return tier.rate;
}

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
  minQuantity = 1,
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
        quantity: Math.max(1, minQuantity),
        colorOption: 'bw',
        // Binding defaults — applied for every new job.
        spiralType: 'plastic',
        coverType: 'clear',
        coverColor: 'navy',
        coverTextColor: 'gold',
        coverDesignType: 'default',
        hardCoverFrontSource: 'first-page',
        printSpineText: false,
        spineText: '',
        paperGsm: 75,
        hardBindingProofApproved: false,
        twinLoopWireColor: 'black',
        twinLoopFrontCover: 'clear-gloss',
        twinLoopBackCover: 'matching-front',
        twinLoopBindingEdge: 'left',
        twinLoopPrintSides: 'double',
        twinLoopCalendarHanger: false,
        twinLoopConcealed: false,
        twinLoopSafeZoneAcknowledged: false,
        twinLoopCoverSubmission: 'embedded',
        twinLoopFrontPrintSides: 'outside',
        twinLoopBackPrintSides: 'outside',
        twinLoopMirrorBack: 'wire-color',
        twinLoopCoverMaterial: 'gloss-300',
        twinLoopBleedAcknowledged: false,
        twinLoopFlipAcknowledged: false,
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

export function orderReducer(
  state: OrderState,
  action: OrderAction,
): OrderState {
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
      return {
        ...state,
        error: null,
        order: { ...state.order, file: action.payload },
      };

    case 'SET_INSTRUCTIONS':
      return {
        ...state,
        order: { ...state.order, specialInstructions: action.payload },
      };

    case 'SET_ADDRESS':
      return {
        ...state,
        error: null,
        order: { ...state.order, address: action.payload },
      };

    case 'SET_SPEED':
      return {
        ...state,
        order: { ...state.order, deliverySpeed: action.payload },
      };

    case 'SET_PAYMENT':
      return {
        ...state,
        error: null,
        order: { ...state.order, paymentMethod: action.payload },
      };

    case 'SET_COST': {
      const current = state.order.costBreakdown ?? EMPTY_COST;
      const next: CostBreakdown = {
        ...current,
        [action.payload.field]: action.payload.value,
      };
      next.total = recalcTotal(next);
      return { ...state, order: { ...state.order, costBreakdown: next } };
    }

    case 'SET_COST_BREAKDOWN':
      return {
        ...state,
        order: { ...state.order, costBreakdown: action.payload },
      };

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
    Math.round(
      cost.subtotal +
        cost.rushFee +
        cost.deliveryFee +
        cost.tax -
        cost.discount,
    ),
  );
}

function countDuplexColorSheets(
  spec: string | undefined,
  totalPages: number,
): number {
  if (!spec) return 0;
  const sheets = new Set<number>();
  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const add = (page: number) => {
      if (page >= 1 && page <= totalPages) sheets.add(Math.ceil(page / 2));
    };
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((value) => parseInt(value.trim(), 10));
      if (!Number.isFinite(a)) continue;
      const end = Number.isFinite(b) ? b : a;
      for (let page = Math.min(a, end); page <= Math.max(a, end); page++)
        add(page);
    } else {
      const page = parseInt(part, 10);
      if (Number.isFinite(page)) add(page);
    }
  }
  return sheets.size;
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
  /** Admin-catalogue stapling list; falls back to the shipped constant. */
  staplingOptions: ReadonlyArray<{ value: string; price: number }> = STAPLING_OPTIONS,
): CostBreakdown {
  const base = service?.startingPrice ?? 0;
  const quantity = Math.max(1, specs.quantity || 1);
  // No uploaded file ⇒ 0 pages ⇒ page cost ₹0 (mirrors the backend quote).
  const totalPages = Math.max(0, specs.totalPages || 0);

  const isPerPage = service?.unit.toLowerCase().includes('page') ?? false;
  const paperOptionExtra =
    (service?.paperTypePrices?.[specs.paperType] ?? 0) +
    (service?.paperSizePrices?.[specs.size] ?? 0);
  // A page service's base price IS the B&W page rate; a binding service's base
  // price is the per-document binding rate, so its pages use the seller's
  // page-service rate instead (never the binding price).
  const baseBwPageRate = isPerPage ? base : (pageRateFallback ?? 0);
  const bwPageRate = baseBwPageRate + paperOptionExtra;
  const colorPageRate = baseBwPageRate * 2 + paperOptionExtra;

  const twinLoopInnerPages =
    service?.id === 'bind-twin-loop' &&
    specs.twinLoopCoverSubmission === 'embedded'
      ? Math.max(0, totalPages - 2)
      : totalPages;
  const isTwinLoopDuplex =
    service?.id === 'bind-twin-loop' && specs.twinLoopPrintSides === 'double';
  // Document Printing duplex also bills per physical sheet: page count halves
  // (sheet holds two sides), odd PDF page counts round up to one more sheet.
  const isDocPrintDuplex = service?.id === 'doc-print' && specs.printSides === 'double';
  const isDuplexSheets = isTwinLoopDuplex || isDocPrintDuplex;
  const pricedDocumentPages =
    service?.id === 'bind-twin-loop' ? twinLoopInnerPages : totalPages;
  const billablePages = isDuplexSheets
    ? Math.ceil(pricedDocumentPages / 2)
    : pricedDocumentPages;
  const colorPageCount =
    specs.colorOption === 'color'
      ? billablePages
      : specs.colorOption === 'mixed'
        ? Math.min(
            isDuplexSheets
              ? countDuplexColorSheets(specs.colorPages, pricedDocumentPages)
              : countColorPages(specs.colorPages, pricedDocumentPages),
            billablePages,
          )
        : 0;
  const bwPageCount = billablePages - colorPageCount;

  // Mandatory Document Printing stapling choice — the seller's per-set price
  // wins over the catalogue default; 'loose' is always free. Mirrors the
  // backend computeQuote stapling branch.
  const staplingKey = specs.stapling ?? 'loose';
  const staplingPerUnit =
    staplingKey === 'loose'
      ? 0
      : (service?.staplingOptions?.[staplingKey] ??
        staplingOptions.find((entry) => entry.value === staplingKey)?.price ??
        0);

  const isBinding = Boolean(service?.id?.startsWith('bind-'));
  const slabRate = pickSlabRate(service?.quantitySlabs, quantity);
  const twinLoop = service?.twinLoopOptions;
  const twinLoopExtra =
    service?.id === 'bind-twin-loop'
      ? (twinLoop?.wireColors?.[specs.twinLoopWireColor ?? ''] ?? 0) +
        (twinLoop?.frontCovers?.[specs.twinLoopFrontCover ?? ''] ?? 0) +
        (twinLoop?.backCovers?.[specs.twinLoopBackCover ?? ''] ?? 0) +
        (specs.twinLoopCalendarHanger ? (twinLoop?.hangerPrice ?? 0) : 0) +
        (specs.twinLoopConcealed ? (twinLoop?.concealedPrice ?? 0) : 0)
      : 0;

  let subtotal: number;
  let pageCost: number | undefined;
  let bindingCost: number | undefined;

  if (isBinding) {
    pageCost = Math.round(
      (bwPageRate * bwPageCount + colorPageRate * colorPageCount) * quantity,
    );
    const bindingRate = base + twinLoopExtra;
    bindingCost = Math.round(bindingRate * quantity);
    subtotal = Math.round(
      pageCost + bindingCost + staplingPerUnit * quantity,
    );
  } else if (service?.unit.toLowerCase().includes('page')) {
    subtotal = Math.round(
      (bwPageRate * bwPageCount + colorPageRate * colorPageCount) * quantity +
        staplingPerUnit * quantity,
    );
  } else if (slabRate !== undefined) {
    // Slab-priced services (Business Cards): per-piece rate from the seller's
    // quantity tiers — mirrors the backend quote branch.
    subtotal = Math.round(
      slabRate * quantity + staplingPerUnit * quantity,
    );
  } else {
    subtotal = Math.round(
      (base + paperOptionExtra) * quantity +
        staplingPerUnit * quantity,
    );
  }

  const rushFee = 0;
  const tax = Math.round((subtotal + deliveryFee) * TAX_RATE);
  const twinLoopTotalSheets =
    service?.id === 'bind-twin-loop' && twinLoopInnerPages > 0
      ? billablePages + 2
      : undefined;
  const twinLoopPitch =
    twinLoopTotalSheets !== undefined
      ? twinLoopInnerPages <= 120
        ? '3:1'
        : '2:1'
      : undefined;
  const twinLoopStackMm =
    twinLoopTotalSheets !== undefined
      ? twinLoopTotalSheets * ((specs.paperGsm ?? 75) === 100 ? 0.13 : 0.1) +
        0.6
      : undefined;
  const twinLoopWireSize =
    twinLoopStackMm === undefined
      ? undefined
      : twinLoopStackMm <= 4.5
        ? '1/4"'
        : twinLoopStackMm <= 6
          ? '5/16"'
          : twinLoopStackMm <= 8
            ? '3/8"'
            : twinLoopStackMm <= 10.5
              ? '1/2"'
              : twinLoopStackMm <= 13
                ? '5/8"'
                : twinLoopStackMm <= 16
                  ? '3/4"'
                  : '1"';

  const cost: CostBreakdown = {
    subtotal,
    rushFee,
    deliveryFee,
    tax,
    discount,
    total: 0,
    ...(pageCost !== undefined ? { pageCost } : {}),
    ...(bindingCost !== undefined ? { bindingCost } : {}),
    ...(twinLoopPitch !== undefined ? { twinLoopPitch } : {}),
    ...(twinLoopWireSize !== undefined ? { twinLoopWireSize } : {}),
    ...(twinLoopTotalSheets !== undefined ? { twinLoopTotalSheets } : {}),
    ...(service?.id === 'bind-twin-loop' || isDocPrintDuplex ? { billablePages } : {}),
  };
  cost.total = recalcTotal(cost);
  return cost;
}
