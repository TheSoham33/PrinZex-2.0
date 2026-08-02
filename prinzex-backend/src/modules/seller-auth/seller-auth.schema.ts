import { z } from 'zod';
import { passwordField } from '../auth/auth.schema';

/** Seller auth request schemas. */

export const sellerLoginBody = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const sellerRefreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const sellerLogoutBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

/** Sellers change password with current + new password. */
export const sellerChangePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});

export type SellerLoginInput = z.infer<typeof sellerLoginBody>;
export type SellerRefreshInput = z.infer<typeof sellerRefreshBody>;
export type SellerLogoutInput = z.infer<typeof sellerLogoutBody>;
export type SellerChangePasswordInput = z.infer<typeof sellerChangePasswordBody>;
