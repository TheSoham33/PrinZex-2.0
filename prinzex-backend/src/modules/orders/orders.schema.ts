import { z } from 'zod';
import { ORDER_STATUSES } from '../../types';

/**
 * Order module request schemas — customer order flow + admin order ops.
 *
 * Prices are NEVER accepted from the client: every money field is computed
 * server-side from the quote calculator in orders.helpers.
 */

const DELIVERY_SPEEDS = ['STANDARD', 'EXPRESS', 'SAME_DAY', 'PICKUP'] as const;

export const specificationsSchema = z.object({
  paperType: z.string().trim().min(1),
  size: z.string().trim().min(1),
  colorOption: z.enum(['color', 'bw', 'mixed']),
  finishing: z.array(z.string()),
  // Page count auto-detected from the uploaded PDF. Drives per-page pricing
  // and must flow through so removing/replacing the file updates the quote.
  totalPages: z.number().int().min(0).optional(),
  // "1, 5, 10-15" — pages printed in colour when colorOption === 'mixed'.
  colorPages: z.string().optional(),
  // Binding-specific attributes — drive the split page/binding pricing.
  coverType: z.string().optional(),
  spiralType: z.string().optional(),
  coverColor: z.string().optional(),
  coverTextColor: z.enum(['gold', 'silver', 'white']).optional(),
  coverDesignType: z.string().optional(),
  hardCoverFrontSource: z.enum(['first-page', 'upload']).optional(),
  frontCoverFileUrl: z.string().max(2048).optional(),
  backCoverFileUrl: z.string().max(2048).optional(),
  printSpineText: z.boolean().optional(),
  spineText: z.string().trim().max(50).optional(),
  paperGsm: z.union([z.literal(75), z.literal(100)]).optional(),
  hardBindingProofApproved: z.boolean().optional(),
});

// ── POST /api/orders/quote ────────────────────────────────────────────────

export const quoteBody = z.object({
  sellerId: z.string().min(1),
  sellerServiceId: z.string().min(1),
  quantity: z.number().int().positive(),
  specifications: specificationsSchema,
  deliverySpeed: z.enum(DELIVERY_SPEEDS),
  couponCode: z.string().trim().min(1).optional(),
});

// ── POST /api/orders ──────────────────────────────────────────────────────

export const createOrderBody = z.object({
  sellerId: z.string(),
  sellerServiceId: z.string(),
  quantity: z.number().int().positive(),
  specifications: z.object({
    paperType: z.string(),
    size: z.string(),
    colorOption: z.enum(['color', 'bw', 'mixed']),
    finishing: z.array(z.string()),
    totalPages: z.number().int().min(0).optional(),
    colorPages: z.string().optional(),
    coverType: z.string().optional(),
    spiralType: z.string().optional(),
    coverColor: z.string().optional(),
    coverTextColor: z.enum(['gold', 'silver', 'white']).optional(),
    coverDesignType: z.string().optional(),
    hardCoverFrontSource: z.enum(['first-page', 'upload']).optional(),
    frontCoverFileUrl: z.string().max(2048).optional(),
    backCoverFileUrl: z.string().max(2048).optional(),
    printSpineText: z.boolean().optional(),
    spineText: z.string().trim().max(50).optional(),
    paperGsm: z.union([z.literal(75), z.literal(100)]).optional(),
    hardBindingProofApproved: z.boolean().optional(),
  }),
  fileUrl: z.string().optional(),
  specialInstructions: z.string().max(500).optional(),
  deliveryAddressId: z.string(),
  deliverySpeed: z.enum(['STANDARD', 'EXPRESS', 'SAME_DAY', 'PICKUP']),
  paymentMethod: z.enum(['card', 'upi', 'wallet', 'cod']),
  couponCode: z.string().optional(),
});

// ── GET /api/orders ───────────────────────────────────────────────────────

export const listOrdersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── POST /api/orders/:orderId/cancel ──────────────────────────────────────

export const orderParams = z.object({ orderId: z.string().min(1) });

export const cancelOrderBody = z.object({
  reason: z.string().trim().min(3, 'Give a short cancellation reason').max(500),
});

// ── POST /api/orders/:orderId/reviews ─────────────────────────────────────

const ratingField = z.number().int().min(1).max(5);

export const createReviewBody = z.object({
  overallRating: ratingField,
  qualityRating: ratingField.optional(),
  deliveryRating: ratingField.optional(),
  communicationRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  comment: z.string().max(1000).optional(),
});

// ── Admin order ops ───────────────────────────────────────────────────────

export const adminOrdersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  sellerId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRush: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUpdateStatusBody = z.object({
  // Constrained to the platform's status vocabulary; unlike other actors the
  // admin may jump between ANY of these (no state-machine restriction).
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const adminRefundBody = z.object({
  amount: z
    .number()
    .positive('Refund amount must be greater than 0')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: 'Amount must have at most 2 decimal places',
    }),
  reason: z.string().trim().min(3).max(500),
});

export const adminDisputeBody = z.object({
  resolution: z.enum(['customer', 'seller']),
  note: z.string().trim().min(3).max(1000),
});

// ── Inferred DTO types ─────────────────────────────────────────────────────

export type QuoteBody = z.infer<typeof quoteBody>;
export type CreateOrderInput = z.infer<typeof createOrderBody>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
export type CancelOrderInput = z.infer<typeof cancelOrderBody>;
export type CreateReviewInput = z.infer<typeof createReviewBody>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuery>;
export type AdminUpdateStatusInput = z.infer<typeof adminUpdateStatusBody>;
export type AdminRefundInput = z.infer<typeof adminRefundBody>;
export type AdminDisputeInput = z.infer<typeof adminDisputeBody>;
