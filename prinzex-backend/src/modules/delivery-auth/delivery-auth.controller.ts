import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as deliveryAuthService from './delivery-auth.service';

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await deliveryAuthService.login(req.body as deliveryAuthService.DeliveryLoginInput);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'If this number is registered, an OTP has been sent'));
});

export const verifyOtp: RequestHandler = asyncHandler(async (req, res) => {
  const result = await deliveryAuthService.verifyOtpLogin(
    req.body as deliveryAuthService.DeliveryVerifyOtpInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.token || req.user.role !== 'DELIVERY_BOY' || !('userId' in req.user)) {
    throw ApiError.unauthorized();
  }
  const body = req.body as { refreshToken?: string };
  await deliveryAuthService.logout(req.user.userId, req.token, body.refreshToken);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as { refreshToken: string };
  const result = await deliveryAuthService.refresh(body.refreshToken);
  res.status(200).json(new ApiResponse(200, result, 'Tokens refreshed'));
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  res.status(200).json(new ApiResponse(200, req.user, 'Authenticated'));
});
