import { z } from 'zod';

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

export type SellerLoginInput = z.infer<typeof sellerLoginBody>;
export type SellerRefreshInput = z.infer<typeof sellerRefreshBody>;
export type SellerLogoutInput = z.infer<typeof sellerLogoutBody>;
