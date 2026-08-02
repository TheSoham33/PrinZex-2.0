import { z } from 'zod';

/**
 * Customer auth request schemas (Zod). Valid parts get re-attached to the
 * request by the validate middleware; errors become 422 field details.
 */

const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

export const emailField = z.string().trim().toLowerCase().email('Invalid email address');
export const phoneField = z
  .string()
  .trim()
  .regex(phoneRegex, 'Invalid phone number (expected an Indian mobile, e.g. +919876543210)');
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters'); // bcrypt input limit
export const otpField = z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code');

/** Accepts either an email or a phone in one field. */
export const identifierField = z
  .string()
  .trim()
  .min(3, 'Identifier is required')
  .refine(
    (value) => emailField.safeParse(value).success || phoneRegex.test(value),
    'Must be a valid email or phone number',
  );

export const registerBody = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: emailField.optional(),
    phone: phoneField.optional(),
    password: passwordField,
  })
  .refine((value) => value.email !== undefined || value.phone !== undefined, {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export const loginBody = z.object({
  identifier: identifierField,
  password: z.string().min(1, 'Password is required'),
});

export const refreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const verifyEmailBody = z.object({
  identifier: identifierField,
  otp: otpField,
});

export const resendOtpBody = z.object({
  identifier: identifierField,
  purpose: z.enum(['email_verify', 'phone_verify'], {
    errorMap: () => ({ message: 'Purpose must be email_verify or phone_verify' }),
  }),
});

export const forgotPasswordBody = z.object({
  identifier: identifierField,
});

export const resetPasswordBody = z.object({
  identifier: identifierField,
  otp: otpField,
  newPassword: passwordField,
});

// ── Inferred DTO types ─────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
export type RefreshInput = z.infer<typeof refreshBody>;
export type LogoutInput = z.infer<typeof logoutBody>;
export type VerifyEmailInput = z.infer<typeof verifyEmailBody>;
export type ResendOtpInput = z.infer<typeof resendOtpBody>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBody>;
