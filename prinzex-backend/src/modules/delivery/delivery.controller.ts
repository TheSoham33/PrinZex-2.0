import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ActivityLogModel } from '../../models/mongo/ActivityLog.model';
import type { AdminTokenPayload, DeliveryTokenPayload } from '../../utils/jwt';
import type { DeliveryDocumentType } from '../../utils/fileUpload';
import * as deliveryService from './delivery.service';
import * as assignment from './delivery.assignment';
import type {
  AdminDeliveryBoysQuery,
  AdminDeliveryBoyStatusInput,
  AdminVerifyDocumentInput,
  AvailabilityInput,
  DeliverInput,
  EarningsQuery,
  FailDeliveryInput,
  LocationPingInput,
  PayoutsQuery,
  RegisterDeliveryInput,
  UpdateBankInput,
  UpdateDeliveryProfileInput,
} from './delivery.schema';

/** Delivery routes mount authenticate + authorizeRoles('DELIVERY_BOY'). */
function deliveryBoyId(req: Request): string {
  const user = req.user as DeliveryTokenPayload | undefined;
  if (!user || user.role !== 'DELIVERY_BOY') {
    throw ApiError.unauthorized();
  }
  return user.deliveryBoyId;
}

function adminMeta(req: Request): deliveryService.AdminActionMeta {
  const user = req.user as AdminTokenPayload | undefined;
  if (!user || user.role !== 'ADMIN') {
    throw ApiError.unauthorized();
  }
  return {
    adminId: user.adminId,
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(typeof req.headers['user-agent'] === 'string' ? { userAgent: req.headers['user-agent'] } : {}),
  };
}

// ══ PUBLIC REGISTRATION ═══════════════════════════════════════════════════

export const register = asyncHandler(async (req, res) => {
  const result = await deliveryService.register(req.body as RegisterDeliveryInput);
  res.status(201).json(new ApiResponse(201, result, result.message));
});

// ══ RIDER SELF-SERVICE ════════════════════════════════════════════════════

export const uploadDocuments = asyncHandler(async (req, res) => {
  const files = req.files as Partial<Record<DeliveryDocumentType, Express.Multer.File[]>> | undefined;
  const result = await deliveryService.uploadDocuments(deliveryBoyId(req), files);
  res.status(200).json(new ApiResponse(200, result, 'Documents uploaded'));
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await deliveryService.getProfile(deliveryBoyId(req));
  res.status(200).json(new ApiResponse(200, profile, 'Profile fetched'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await deliveryService.updateProfile(
    deliveryBoyId(req),
    req.body as UpdateDeliveryProfileInput,
  );
  res.status(200).json(new ApiResponse(200, profile, 'Profile updated'));
});

export const updateBank = asyncHandler(async (req, res) => {
  const bank = await deliveryService.updateBankDetails(deliveryBoyId(req), req.body as UpdateBankInput);
  res.status(200).json(new ApiResponse(200, bank, 'Bank details updated'));
});

export const setAvailability = asyncHandler(async (req, res) => {
  const result = await deliveryService.setAvailability(
    deliveryBoyId(req),
    req.body as AvailabilityInput,
  );
  res
    .status(200)
    .json(new ApiResponse(200, result, result.isOnline ? 'You are online' : 'You are offline'));
});

export const getActiveDelivery = asyncHandler(async (req, res) => {
  const active = await deliveryService.getActiveDelivery(deliveryBoyId(req));
  res.status(200).json(new ApiResponse(200, active, 'Active delivery fetched'));
});

export const pingLocation = asyncHandler(async (req, res) => {
  const result = await deliveryService.pingLocation(deliveryBoyId(req), req.body as LocationPingInput);
  res.status(200).json(new ApiResponse(200, result, 'Location updated'));
});

export const confirmPickup = asyncHandler(async (req, res) => {
  const result = await deliveryService.confirmPickup(deliveryBoyId(req));
  res.status(200).json(new ApiResponse(200, result, 'Pickup confirmed — on the way'));
});

export const confirmDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.confirmDelivery(deliveryBoyId(req), req.body as DeliverInput);
  res
    .status(200)
    .json(new ApiResponse(200, result, `Delivered — ₹${result.earned} credited to pending earnings`));
});

export const failDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.failDelivery(deliveryBoyId(req), req.body as FailDeliveryInput);
  res.status(200).json(new ApiResponse(200, result, 'Delivery marked failed'));
});

export const getEarnings = asyncHandler(async (req, res) => {
  const earnings = await deliveryService.getEarnings(
    deliveryBoyId(req),
    req.query as unknown as EarningsQuery,
  );
  res.status(200).json(new ApiResponse(200, earnings, 'Earnings fetched'));
});

export const listPayouts = asyncHandler(async (req, res) => {
  const payouts = await deliveryService.listPayouts(
    deliveryBoyId(req),
    req.query as unknown as PayoutsQuery,
  );
  res.status(200).json(new ApiResponse(200, payouts, 'Payouts fetched'));
});

export const requestPayout = asyncHandler(async (req, res) => {
  const payout = await deliveryService.requestPayout(deliveryBoyId(req));
  res.status(201).json(new ApiResponse(201, payout, 'Payout requested'));
});

// ══ ADMIN ═════════════════════════════════════════════════════════════════

export const adminListDeliveryBoys = asyncHandler(async (req, res) => {
  const boys = await deliveryService.adminListDeliveryBoys(
    req.query as unknown as AdminDeliveryBoysQuery,
  );
  res.status(200).json(new ApiResponse(200, boys, 'Delivery partners fetched'));
});

export const adminGetDeliveryBoy = asyncHandler(async (req, res) => {
  const boy = await deliveryService.adminGetDeliveryBoy(req.params.id);
  res.status(200).json(new ApiResponse(200, boy, 'Delivery partner fetched'));
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const result = await deliveryService.adminUpdateDeliveryBoyStatus(
    adminMeta(req),
    req.params.id,
    req.body as AdminDeliveryBoyStatusInput,
  );
  res.status(200).json(new ApiResponse(200, result, `Status set to ${result.status}`));
});

export const adminVerifyDocument = asyncHandler(async (req, res) => {
  const result = await deliveryService.adminVerifyDocument(
    adminMeta(req),
    req.params.id,
    req.body as AdminVerifyDocumentInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Document verification updated'));
});

export const adminListActiveDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.adminListActiveDeliveries();
  res.status(200).json(new ApiResponse(200, deliveries, 'Active deliveries fetched'));
});

export const adminAssignDelivery = asyncHandler(async (req, res) => {
  const { deliveryBoyId: riderId } = req.body as { deliveryBoyId: string };
  const meta = adminMeta(req);
  const result = await assignment.manualAssignDelivery(req.params.orderId, riderId);
  await ActivityLogModel.create({
    adminId: meta.adminId,
    action: 'order.delivery_assigned',
    entityType: 'order',
    entityId: req.params.orderId,
    metadata: { deliveryBoyId: riderId, deliveryId: result.deliveryId, manual: true },
    ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
  res.status(200).json(new ApiResponse(200, result, 'Delivery assigned'));
});
