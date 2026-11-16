import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { TokenPayload } from '../../utils/jwt';
import type { DeleteDeviceInput, RegisterDeviceInput } from './devices.schema';
import * as devicesService from './devices.service';

/**
 * Push-token endpoints for the three device-owning actor lanes. The recipient
 * identity ALWAYS comes from the verified JWT (never the request body) — a
 * token can only be registered or deleted against the caller's own id.
 */
function recipientFrom(req: Request): devicesService.DeviceRecipient {
  const user = req.user as TokenPayload | undefined;
  if (!user) throw ApiError.unauthorized();

  if (user.role === 'CUSTOMER') {
    return { recipientType: 'customer', recipientId: user.userId };
  }
  if (user.role === 'SELLER') {
    return { recipientType: 'seller', recipientId: user.sellerId };
  }
  if (user.role === 'DELIVERY_BOY') {
    return { recipientType: 'delivery_boy', recipientId: user.deliveryBoyId };
  }
  throw ApiError.unauthorized();
}

const userAgent = (req: Request): string | undefined =>
  typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 400) : undefined;

export const registerToken = asyncHandler(async (req, res) => {
  const token = await devicesService.registerDeviceToken(
    recipientFrom(req),
    req.body as RegisterDeviceInput,
    userAgent(req),
  );
  res.status(200).json(new ApiResponse(200, { id: token.id, platform: token.platform }, 'Device registered for push'));
});

export const deleteToken = asyncHandler(async (req, res) => {
  const result = await devicesService.deleteDeviceToken(
    recipientFrom(req),
    (req.body as DeleteDeviceInput).token,
  );
  res.status(200).json(new ApiResponse(200, result, 'Device unregistered'));
});

export const listTokens = asyncHandler(async (req, res) => {
  const tokens = await devicesService.listDeviceTokens(recipientFrom(req));
  res.status(200).json(new ApiResponse(200, tokens, 'Devices fetched'));
});
