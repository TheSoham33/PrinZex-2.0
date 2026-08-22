import { z } from 'zod';

/**
 * Payment module request schemas — gateway checkout lifecycle, refunds,
 * wallet top-ups. Amounts originate server-side from Order/Wallet state;
 * client-sent amounts are only ever cross-checked, never trusted.
 */

export const createPaymentOrderBody = z.object({
  orderId: z.string().min(1),
});

export const verifyPaymentBody = z.object({
  orderId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const adminRefundBody = z.object({
  orderId: z.string(),
  amount: z
    .number()
    .positive('Refund amount must be greater than 0')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: 'Amount must have at most 2 decimal places',
    }),
  reason: z.string().trim().min(3).max(500),
});

export const paymentHistoryQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Wallet top-up ──────────────────────────────────────────────────────────

export const topupInitiateBody = z.object({
  amount: z
    .number()
    .min(10, 'Minimum top-up is ₹10')
    .max(50000, 'Maximum top-up is ₹50,000')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: 'Amount must have at most 2 decimal places',
    }),
});

export const topupVerifyBody = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  topupAmount: z.number().positive(),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderBody>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentBody>;
export type AdminRefundInput = z.infer<typeof adminRefundBody>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuery>;
export type TopupInitiateInput = z.infer<typeof topupInitiateBody>;
export type TopupVerifyInput = z.infer<typeof topupVerifyBody>;
