import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schema';

/**
 * Customer auth controllers. Bodies arrive pre-validated (Zod) by the
 * validate middleware in auth.routes.
 */

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body as RegisterInput);
  res.status(201).json(new ApiResponse(201, result, 'Registration successful — please verify your account'));
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body as LoginInput);
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.token || req.user.role !== 'CUSTOMER' || !('userId' in req.user)) {
    throw ApiError.unauthorized();
  }
  await authService.logout(req.user.userId, req.token, req.body as LogoutInput);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body as RefreshInput);
  res.status(200).json(new ApiResponse(200, result, 'Tokens refreshed'));
});

export const verifyEmail: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body as VerifyEmailInput);
  res.status(200).json(new ApiResponse(200, result, 'Verification successful'));
});

export const resendOtp: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.body as ResendOtpInput);
  res.status(200).json(new ApiResponse(200, result, 'If the account exists, an OTP has been sent'));
});

export const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
  // Uniform 200 — never reveals whether the account exists.
  res.status(200).json(new ApiResponse(200, result, 'If the account exists, a reset code has been sent'));
});

export const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body as ResetPasswordInput);
  res.status(200).json(new ApiResponse(200, result, 'Password updated — please log in again'));
});

/** Demo of the authenticate guard: returns the decoded JWT payload. */
export const me: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  res.status(200).json(new ApiResponse(200, req.user, 'Authenticated'));
});
