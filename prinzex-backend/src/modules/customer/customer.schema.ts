import { z } from 'zod';
import { emailField, passwordField, phoneField } from '../auth/auth.schema';

/**
 * Customer module request schemas (profile, addresses, wallet, notifications).
 */

// ── Profile ────────────────────────────────────────────────────────────────

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    avatarUrl: z.string().trim().url('avatarUrl must be a valid URL').optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});

// ── Addresses ───────────────────────────────────────────────────────────────

export const addressParams = z.object({ addressId: z.string().min(1) });

export const createAddressBody = z.object({
  label: z.string().trim().min(2, 'Label must be at least 2 characters').max(30),
  fullAddress: z.string().trim().min(5, 'Address is too short').max(300),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  phone: phoneField,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressBody = createAddressBody
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

// ── Wallet ──────────────────────────────────────────────────────────────────

export const addMoneyBody = z.object({
  amount: z
    .number()
    .min(10, 'Minimum top-up is ₹10')
    .max(50000, 'Maximum top-up is ₹50,000')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: 'Amount must have at most 2 decimal places',
    }),
  paymentMethod: z.string().trim().min(1, 'Payment method is required'),
  // TODO: restrict to real gateway methods once Razorpay integration lands
});

const TRANSACTION_TYPES = ['CREDIT', 'DEBIT'] as const;
const TRANSACTION_REASONS = [
  'ORDER_PAYMENT',
  'REFUND',
  'CASHBACK',
  'REFERRAL_BONUS',
  'WALLET_TOPUP',
  'PAYOUT',
  'COMMISSION',
  'ADJUSTMENT',
] as const;

export const transactionsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(TRANSACTION_TYPES).optional(),
  reason: z.enum(TRANSACTION_REASONS).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ── Notifications ───────────────────────────────────────────────────────────

export const notificationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.enum(['true', 'false', 'all']).default('all'),
});

export const notificationParams = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid notification id'),
});

// ── Inferred DTO types ──────────────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileBody>;
export type ChangePasswordInput = z.infer<typeof changePasswordBody>;
export type CreateAddressInput = z.infer<typeof createAddressBody>;
export type UpdateAddressInput = z.infer<typeof updateAddressBody>;
export type AddMoneyInput = z.infer<typeof addMoneyBody>;
export type TransactionsQuery = z.infer<typeof transactionsQuery>;
export type NotificationsQuery = z.infer<typeof notificationsQuery>;
