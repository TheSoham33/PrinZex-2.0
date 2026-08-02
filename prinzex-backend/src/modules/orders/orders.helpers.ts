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
  quantity: number;
  finishing: string[];
  deliverySpeed: DeliverySpeed;
  commissionRate: number; // Seller.commissionRate
  discount: number; // validated coupon discount (0 when none)
}

/** Pure, deterministic quote math — fully unit-testable offline. */
export function computeQuote(input: QuoteComputationInput): QuoteResult {
  const finishingCharge = input.finishing.reduce(
    (sum, type) => sum + (FINISHING_UPCHARGES[type] ?? 0),
    0,
  );

  const subtotal = round2(input.basePrice * input.quantity + finishingCharge);
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
  };
}
