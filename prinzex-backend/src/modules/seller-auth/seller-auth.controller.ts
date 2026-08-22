import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as sellerAuthService from './seller-auth.service';
import type {
  SellerLoginInput,
  SellerLogoutInput,
  SellerRefreshInput,
} from './seller-auth.schema';

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await sellerAuthService.login(req.body as SellerLoginInput);
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.token || req.user.role !== 'SELLER' || !('userId' in req.user)) {
    throw ApiError.unauthorized();
  }
  await sellerAuthService.logout(req.user.userId, req.token, req.body as SellerLogoutInput);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const result = await sellerAuthService.refresh(req.body as SellerRefreshInput);
  res.status(200).json(new ApiResponse(200, result, 'Tokens refreshed'));
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  res.status(200).json(new ApiResponse(200, req.user, 'Authenticated'));
});
