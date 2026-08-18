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
  colorOption: 'color' | 'bw';
  finishing: string[];
  totalPages?: number;
  // Binding-specific attributes — drive the page/binding split pricing.
  coverType?: string;
  spiralType?: string;
  coverColor?: string;
  coverDesignType?: string;
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

export const PAPER_TYPE_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  premium: 1.4,
  glossy: 1.8,
  matte: 1.6,
};

export const PAPER_SIZE_MULTIPLIERS: Record<string, number> = {
  A4: 1.0,
  A3: 1.9,
  A2: 3.4,
  custom: 2.2,
};

export const COLOR_OPTION_MULTIPLIERS: Record<string, number> = {
  bw: 1.0,
  color: 2.0,
};

export const RUSH_FEES: Record<DeliverySpeed, number> = {
  STANDARD: 0,
  EXPRESS: 50,
  SAME_DAY: 120,
  PICKUP: 0,
};

export const DELIVERY_FEES: Record<DeliverySpeed, number> = {
  STANDARD: 30,
  EXPRESS: 60,
  SAME_DAY: 100,
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

  const totalPages = Math.max(1, specifications.totalPages || 1);
  const quantity = input.quantity;

  let subtotal: number;
  let pageCost: number | undefined;
  let bindingCost: number | undefined;

  if (isBindingService(input.categoryId, input.serviceId)) {
    // ── Binding services: split pricing ──────────────────────────────────
    // Pages (printing) and binding (cover) are priced independently, both from
    // seller-set additive ₹ components stored in Seller.metadata.pricingOverrides.
    //   pages    = (paperType + colorOption) ₹/page × P × N
    //   binding  = (coverType + coilType + coverColor) ₹/binding × N
    const pageRate =
      (overrides.paperType?.[specifications.paperType] ?? 0) +
      (overrides.colorOption?.[specifications.colorOption] ?? 0);

    let bindingRate =
      (overrides.coverType?.[specifications.coverType] ?? 0) +
      (overrides.coilType?.[specifications.spiralType] ?? 0) +
      (overrides.coverColor?.[specifications.coverColor] ?? 0);

    // Legacy fallback: a seller who never configured cover add-ons keeps their
    // original per-document base price as the binding rate (never a free bind).
    if (bindingRate === 0 && input.basePrice > 0) {
      bindingRate = input.basePrice;
    }

    pageCost = round2(pageRate * totalPages * quantity);
    bindingCost = round2(bindingRate * quantity);
    subtotal = round2(pageCost + bindingCost + finishingCharge * quantity);
  } else {
    // ── Everything else: existing single-rate model ─────────────────────
    const paperPrice = overrides.paperType?.[specifications.paperType] ?? 0;
    const sizePrice = overrides.size?.[specifications.size] ?? 0;
    const colorPrice = overrides.colorOption?.[specifications.colorOption] ?? 0;
    const isPerPage = unit.toLowerCase().includes('page');
    const unitFactor = isPerPage ? totalPages : 1;

    subtotal = round2(
      (input.basePrice + paperPrice + sizePrice + colorPrice) * unitFactor * quantity +
        finishingCharge * quantity,
    );
  }

  const rushFee = RUSH_FEES[input.deliverySpeed];
  const deliveryFee = DELIVERY_FEES[input.deliverySpeed];
  const tax = round2(subtotal * GST_RATE);
  const commissionAmount = round2(subtotal * input.commissionRate);
  const total = round2(subtotal + rushFee + deliveryFee + tax - input.discount);

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
  };
}
