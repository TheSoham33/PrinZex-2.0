import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { CustomerTokenPayload } from '../../utils/jwt';
import * as trackingService from './tracking.service';

/** Customer routes mount authenticate + authorizeRoles('CUSTOMER'). */
function customerId(req: Request): string {
  const user = req.user as CustomerTokenPayload | undefined;
  if (!user || user.role !== 'CUSTOMER') {
    throw ApiError.unauthorized();
  }
  return user.userId;
}

export const getTracking = asyncHandler(async (req, res) => {
  const tracking = await trackingService.getTracking(customerId(req), req.params.orderId);
  res.status(200).json(new ApiResponse(200, tracking, 'Tracking fetched'));
});

export const getLocationHistory = asyncHandler(async (req, res) => {
  const history = await trackingService.getLocationHistory(customerId(req), req.params.orderId);
  res.status(200).json(new ApiResponse(200, history, 'Location history fetched'));
});
