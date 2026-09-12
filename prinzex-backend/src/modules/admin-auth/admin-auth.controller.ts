import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as adminAuthService from './admin-auth.service';

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await adminAuthService.login(req.body as adminAuthService.AdminLoginInput);
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.token || req.user.role !== 'ADMIN' || !('adminId' in req.user)) {
    throw ApiError.unauthorized();
  }
  const body = req.body as { refreshToken?: string };
  await adminAuthService.logout(req.user.adminId, req.token, body.refreshToken);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as { refreshToken: string };
  const result = await adminAuthService.refresh(body.refreshToken);
  res.status(200).json(new ApiResponse(200, result, 'Tokens refreshed'));
});

/** Returns the decoded admin payload incl. the full permissions map. */
export const me: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  res.status(200).json(new ApiResponse(200, req.user, 'Authenticated'));
});
