import type { DeliverySpeed, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';

/**
 * Quote calculation, pricing constants, commission logic and coupon
 * validation. Everything here is deterministic: identical inputs always
 * produce an identical quote.
 */

export interface QuoteSpecifications {
  paperType: string;
  size: string;
  colorOption: 'color' | 'bw' | 'mixed';
  finishing: string[];
  totalPages?: number;
  // "1, 5, 10-15" — pages printed in colour when colorOption === 'mixed'.
  colorPages?: string;
  // Binding-specific attributes — drive the page/binding split pricing.
  coverType?: string;
  spiralType?: string;
  coverColor?: string;
  coverTextColor?: string;
  coverDesignType?: string;
  hardCoverFrontSource?: 'first-page' | 'upload';
  frontCoverFileUrl?: string;
  backCoverFileUrl?: string;
  printSpineText?: boolean;
  spineText?: string;
  paperGsm?: 75 | 100;
  hardBindingProofApproved?: boolean;
  twinLoopWireColor?: string;
  twinLoopFrontCover?: string;
  twinLoopBackCover?: string;
  twinLoopBindingEdge?: 'left' | 'top';
  twinLoopPrintSides?: 'single' | 'double';
  twinLoopCalendarHanger?: boolean;
  twinLoopConcealed?: boolean;
  twinLoopSafeZoneAcknowledged?: boolean;
  twinLoopCoverSubmission?: 'embedded' | 'split' | 'mirror';
  twinLoopFrontPrintSides?: 'outside' | 'both';
  twinLoopBackPrintSides?: 'outside' | 'both';
  twinLoopFrontFileUrl?: string;
  twinLoopBackFileUrl?: string;
  twinLoopMirrorBack?: 'wire-color' | 'blank-white';
  twinLoopCoverMaterial?: 'gloss-300' | 'matte-350';
  twinLoopBleedAcknowledged?: boolean;
  twinLoopFlipAcknowledged?: boolean;
}

export interface QuoteInput {
  sellerServiceId: string;
  quantity: number;
  specifications: QuoteSpecifications;
  deliverySpeed: DeliverySpeed;
  couponCode?: string;
  sellerId: string;
}

export interface QuoteResult {
  subtotal: number;
  rushFee: number;
  deliveryFee: number;
  /** 18% GST on subtotal. */
  tax: number;
  discount: number;
  /** Platform commission: subtotal * Seller.commissionRate. */
  commissionAmount: number;
  total: number;
  /** Binding services only — page printing component (pageRate × pages × copies). */
  pageCost?: number;
  /** Binding services only — binding/cover component (bindingRate × copies). */
  bindingCost?: number;
  /** Hard Binding: estimated finished spine width from page count and paper GSM. */
  spineWidthMm?: number;
  twinLoopPitch?: '3:1' | '2:1';
  twinLoopWireSize?: string;
  twinLoopTotalSheets?: number;
  /** Twin Loop: inner sheets charged after single/duplex selection. */
  billablePages?: number;
}

// ── Pricing constants ──────────────────────────────────────────────────────

export const GST_RATE = 0.18; // 18% GST on subtotal

/** Flat per-finishing upcharges (added ONCE per finishing type selected). */
export const FINISHING_UPCHARGES: Record<string, number> = {
  lamination: 20,
  spiral_binding: 60,
  hard_binding: 120,
  stapling: 5,
  folding: 10,
  cutting: 15,
};

// These are the ONLY customer-facing delivery charges and must match the
// DELIVERY_SPEEDS costs shown on the store page and at checkout.
// Standard and pickup are free; express/same-day carry a flat premium.
export const RUSH_FEES: Record<DeliverySpeed, number> = {
  STANDARD: 0,
  EXPRESS: 0,
  SAME_DAY: 0,
  PICKUP: 0,
};

export const DELIVERY_FEES: Record<DeliverySpeed, number> = {
  STANDARD: 0,
  EXPRESS: 50,
  SAME_DAY: 120,
  PICKUP: 0,
};

/** Hours from order placement to the estimated delivery/pickup moment. */
export const ESTIMATED_DELIVERY_HOURS: Record<DeliverySpeed, number> = {
  STANDARD: 48,
  EXPRESS: 12,
  SAME_DAY: 6,
  PICKUP: 4,
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Quote timestamp + speed → estimated delivery instant. */
export function estimatedDeliveryFor(speed: DeliverySpeed, from = new Date()): Date {
  return new Date(from.getTime() + ESTIMATED_DELIVERY_HOURS[speed] * 60 * 60 * 1000);
}

/**
 * Binding services (spiral, hard, perfect) use the split page+binding pricing
 * model. Detected by the service's category (seeded as "binding") or its
 * serviceId prefix ("bind-") so it also works for historical rows.
 */
export function isBindingService(categoryId?: string | null, serviceId?: string | null): boolean {
  if (categoryId === 'binding') return true;
  if (serviceId && serviceId.startsWith('bind-')) return true;
  return false;
}

/**
 * Parse a "particular pages in colour" spec such as "1, 5, 10-15" into the
 * number of distinct pages that fall within [1, totalPages].
 */
export function countColorPages(spec: string | undefined, totalPages: number): number {
  if (!spec) return 0;
  const pages = new Set<number>();

  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!Number.isFinite(a)) continue;
      const end = Number.isFinite(b) ? b : a;
      const start = Math.min(a, end);
      const stop = Math.max(a, end);
      for (let p = start; p <= stop; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
      }
    } else {
      const n = parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= totalPages) pages.add(n);
    }
  }

  return pages.size;
}

/** Count duplex sheets containing at least one requested colour page. */
export function countDuplexColorSheets(
  spec: string | undefined,
  totalDocumentPages: number,
): number {
  if (!spec) return 0;
  const sheets = new Set<number>();

  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const addPage = (page: number) => {
      if (page >= 1 && page <= totalDocumentPages) sheets.add(Math.ceil(page / 2));
    };

    if (part.includes('-')) {
      const [a, b] = part.split('-').map((value) => parseInt(value.trim(), 10));
      if (!Number.isFinite(a)) continue;
      const end = Number.isFinite(b) ? b : a;
      for (let page = Math.min(a, end); page <= Math.max(a, end); page++) addPage(page);
    } else {
      const page = parseInt(part, 10);
      if (Number.isFinite(page)) addPage(page);
    }
  }

  return sheets.size;
}

/** How many pages print B&W vs colour for the selected colour option. */
export function colorPageSplit(
  colorOption: string,
  colorPagesSpec: string | undefined,
  totalPages: number,
): { bwPages: number; colorPages: number } {
  if (colorOption === 'color') return { bwPages: 0, colorPages: totalPages };
  if (colorOption === 'mixed') {
    const colorPages = Math.min(countColorPages(colorPagesSpec, totalPages), totalPages);
    return { bwPages: totalPages - colorPages, colorPages };
  }
  return { bwPages: totalPages, colorPages: 0 };
}

/** Validate finishing selections — unknown types make quotes non-deterministic. */
export function assertKnownFinishing(finishing: string[]): void {
  const unknown = finishing.filter((type) => !(type in FINISHING_UPCHARGES));
  if (unknown.length > 0) {
    throw ApiError.badRequest(
      `Unknown finishing option(s): ${unknown.join(', ')} — allowed: ${Object.keys(FINISHING_UPCHARGES).join(', ')}`,
    );
  }
}

// ── Coupon validation (shared by quote + order creation) ──────────────────

export interface CouponValidation {
  valid: boolean;
  discountAmount: number;
  coupon: Prisma.CouponGetPayload<object> | null;
  error?: string;
}

/**
 * Full coupon validation against the Coupon table:
 *   exists + active → not expired → global usageLimit → per-user limit
 *   (counted from past non-cancelled orders carrying this code) →
 *   minOrderValue → discount math (percentage|flat, capped by maxDiscount,
 *   and never more than the subtotal itself).
 *
 * This NEVER increments usage — that happens only at order creation.
 */
export async function validateCoupon(
  code: string,
  customerId: string,
  orderSubtotal: number,
): Promise<CouponValidation> {
  const invalid = (error: string): CouponValidation => ({
    valid: false,
    discountAmount: 0,
    coupon: null,
    error,
  });

  const normalized = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });

  if (!coupon || !coupon.isActive) {
    return invalid('Coupon code is not valid');
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return invalid('Coupon has expired');
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return invalid('Coupon usage limit has been reached');
  }

  // Per-user usage record = past non-cancelled orders carrying this code
  // (a cancelled order returns the usage slot to the customer).
  const userUsages = await prisma.order.count({
    where: {
      customerId,
      couponCode: normalized,
      status: { not: 'cancelled' },
    },
  });
  if (userUsages >= coupon.perUserLimit) {
    return invalid('You have already used this coupon the maximum number of times');
  }

  if (coupon.minOrderValue !== null && orderSubtotal < Number(coupon.minOrderValue)) {
    return invalid(`Minimum order value for this coupon is ₹${Number(coupon.minOrderValue)}`);
  }

  let discount: number;
  if (coupon.discountType === 'percentage') {
    discount = (orderSubtotal * Number(coupon.discountValue)) / 100;
  } else {
    discount = Number(coupon.discountValue);
  }
  if (coupon.maxDiscount !== null) {
    discount = Math.min(discount, Number(coupon.maxDiscount));
  }
  discount = Math.min(discount, orderSubtotal); // never discount more than the subtotal

  return { valid: true, discountAmount: round2(discount), coupon };
}

// ── Quote calculation ──────────────────────────────────────────────────────

export interface QuoteComputationInput {
  basePrice: number; // SellerService.basePrice
  unit: string;
  categoryId?: string; // SellerService.categoryId — routes the pricing model
  serviceId?: string; // SellerService.serviceId — fallback signal for binding
  quantity: number;
  specifications: QuoteSpecifications;
  deliverySpeed: DeliverySpeed;
  commissionRate: number; // Seller.commissionRate
  discount: number; // validated coupon discount (0 when none)
  sellerMetadata?: Prisma.JsonValue | null;
  /** Seller's cheapest per-page rate — fallback for binding services, whose
   *  own basePrice is per-document and must never be used as a page rate. */
  pageRateFallback?: number;
}

/** Pure, deterministic quote math — fully unit-testable offline. */
export function computeQuote(input: QuoteComputationInput): QuoteResult {
  const { specifications, sellerMetadata, unit } = input;

  // Extract overrides from metadata if they exist
  let overrides: any = {};
  if (sellerMetadata && typeof sellerMetadata === 'object' && !Array.isArray(sellerMetadata)) {
    overrides = (sellerMetadata as any).pricingOverrides || {};
  }

  const finishingCharge = specifications.finishing.reduce(
    (sum, type) => sum + (FINISHING_UPCHARGES[type] ?? 0),
    0,
  );

  // No uploaded file ⇒ 0 pages ⇒ page cost ₹0 (the summary resets). Once a PDF
  // is chosen the page count is set and pricing scales with it.
  const totalPages = Math.max(0, specifications.totalPages || 0);
  const quantity = input.quantity;

  const isPerPage = unit.toLowerCase().includes('page');
  const servicePaperOptions =
    overrides.servicePaperOptions?.[input.serviceId ?? ''] ?? {};
  const paperOptionExtra =
    (servicePaperOptions.paperTypes?.[specifications.paperType] ?? 0) +
    (servicePaperOptions.paperSizes?.[specifications.size] ?? 0);

  // Seller-set per-page rates, common across all page services. A page is
  // either B&W or colour; every colour option is priced from these two rates.
  // Fallbacks: legacy colorOption add-ons, then the service's own base price
  // (per-page services) or the seller's cheapest page-service rate (binding
  // services). A binding service's basePrice is per-document and must never
  // be used as a per-page rate.
  const baseBwRate =
    overrides.pageRate?.bw ??
    overrides.colorOption?.bw ??
    (isPerPage ? input.basePrice : input.pageRateFallback ?? 0);
  const baseColorRate =
    overrides.pageRate?.color ??
    overrides.colorOption?.color ??
    baseBwRate * 2;
  const bwRate = baseBwRate + paperOptionExtra;
  const colorRate = baseColorRate + paperOptionExtra;

  // Twin Loop duplex printing puts two PDF pages on one physical sheet. Per the
  // marketplace pricing model, its inner-page charge follows that physical
  // sheet count rather than the original PDF page count.
  const twinLoopInnerPages =
    input.serviceId === 'bind-twin-loop' && specifications.twinLoopCoverSubmission === 'embedded'
      ? Math.max(0, totalPages - 2)
      : totalPages;
  const isTwinLoopDuplex =
    input.serviceId === 'bind-twin-loop' && specifications.twinLoopPrintSides === 'double';
  const pricedDocumentPages = input.serviceId === 'bind-twin-loop' ? twinLoopInnerPages : totalPages;
  const billablePages = isTwinLoopDuplex
    ? Math.ceil(pricedDocumentPages / 2)
    : pricedDocumentPages;
  const split =
    isTwinLoopDuplex && specifications.colorOption === 'mixed'
      ? (() => {
          const colorSheets = Math.min(
            countDuplexColorSheets(specifications.colorPages, pricedDocumentPages),
            billablePages,
          );
          return { bwPages: billablePages - colorSheets, colorPages: colorSheets };
        })()
      : colorPageSplit(
          specifications.colorOption,
          specifications.colorPages,
          billablePages,
        );

  let subtotal: number;
  let pageCost: number | undefined;
  let bindingCost: number | undefined;

  if (isBindingService(input.categoryId, input.serviceId)) {
    // ── Binding services: pages + binding priced separately ──────────────
    //   pages    = (bwRate × B&W pages + colorRate × colour pages) × N
    //   binding  = (coverType + coilType + coverColor) ₹/binding × N
    pageCost = round2((bwRate * split.bwPages + colorRate * split.colorPages) * quantity);

    // Binding price = the service's per-document base price (e.g. ₹60/piece)
    // PLUS any cover-customization extras (cover type, coil type, cover colour).
    // The base is always included so a seller's set price is never replaced by
    // the add-ons.
    // Seller-defined cover/coil/colour customization prices belong only to
    // Spiral Binding. Other binding services use their own base price without
    // inheriting Spiral Binding add-ons.
    const spiralCustomizationRate =
      input.serviceId === 'bind-spiral'
        ? (overrides.coverType?.[specifications.coverType ?? ''] ?? 0) +
          (overrides.coilType?.[specifications.spiralType ?? ''] ?? 0) +
          (overrides.coverColor?.[specifications.coverColor ?? ''] ?? 0)
        : 0;
    const twinLoop = overrides.twinLoopOptions ?? {};
    const twinLoopCustomizationRate =
      input.serviceId === 'bind-twin-loop'
        ? (twinLoop.wireColors?.[specifications.twinLoopWireColor ?? ''] ?? 0) +
          (twinLoop.frontCovers?.[specifications.twinLoopFrontCover ?? ''] ?? 0) +
          (twinLoop.backCovers?.[specifications.twinLoopBackCover ?? ''] ?? 0) +
          (specifications.twinLoopCalendarHanger ? twinLoop.hangerPrice ?? 0 : 0) +
          (specifications.twinLoopConcealed ? twinLoop.concealedPrice ?? 0 : 0)
        : 0;
    const bindingRate =
      input.basePrice + spiralCustomizationRate + twinLoopCustomizationRate;

    bindingCost = round2(bindingRate * quantity);
    subtotal = round2(pageCost + bindingCost + finishingCharge * quantity);
  } else if (unit.toLowerCase().includes('page')) {
    // ── Per-page services: B&W/colour page rates are the whole price ─────
    subtotal = round2(
      (bwRate * split.bwPages + colorRate * split.colorPages) * quantity +
        finishingCharge * quantity,
    );
  } else {
    // ── Per-piece / per-set / per-sqft services: single base rate ────────
    subtotal = round2(
      (input.basePrice + paperOptionExtra) * quantity + finishingCharge * quantity,
    );
  }

  const rushFee = RUSH_FEES[input.deliverySpeed];
  const deliveryFee = DELIVERY_FEES[input.deliverySpeed];
  const tax = round2(subtotal * GST_RATE);
  const commissionAmount = round2(subtotal * input.commissionRate);
  const total = round2(subtotal + rushFee + deliveryFee + tax - input.discount);
  const spineWidthMm =
    input.serviceId === 'bind-hard' && totalPages > 0
      ? Math.max(
          2,
          round2((totalPages / 2) * (specifications.paperGsm === 100 ? 0.13 : 0.1)),
        )
      : undefined;

  const twinLoopTotalSheets =
    input.serviceId === 'bind-twin-loop' && twinLoopInnerPages > 0
      ? billablePages + 2
      : undefined;
  const twinLoopPitch: '3:1' | '2:1' | undefined =
    twinLoopTotalSheets !== undefined
      ? twinLoopInnerPages <= 120
        ? '3:1'
        : '2:1'
      : undefined;
  const twinLoopStackMm =
    twinLoopTotalSheets !== undefined
      ? twinLoopTotalSheets * (specifications.paperGsm === 100 ? 0.13 : 0.1) + 0.6
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

  return {
    subtotal,
    rushFee,
    deliveryFee,
    tax,
    discount: round2(input.discount),
    commissionAmount,
    total,
    ...(pageCost !== undefined ? { pageCost } : {}),
    ...(bindingCost !== undefined ? { bindingCost } : {}),
    ...(spineWidthMm !== undefined ? { spineWidthMm } : {}),
    ...(twinLoopPitch !== undefined ? { twinLoopPitch } : {}),
    ...(twinLoopWireSize !== undefined ? { twinLoopWireSize } : {}),
    ...(twinLoopTotalSheets !== undefined ? { twinLoopTotalSheets } : {}),
    ...(input.serviceId === 'bind-twin-loop' ? { billablePages } : {}),
  };
}
