import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminUsersService from './admin-users.service';
import type { SuspendBody, UsersQuery, WalletCreditBody } from './admin-users.routes';

/** Admin user management. logActivity is fire-and-forget (no await) per spec. */

export const listUsers = asyncHandler(async (req, res) => {
  const result = await adminUsersService.listUsers(req.query as unknown as UsersQuery);
  res.status(200).json(new ApiResponse(200, result, 'Users fetched'));
});

export const getUserDetail = asyncHandler(async (req, res) => {
  const detail = await adminUsersService.getUserDetail(req.params.userId);
  res.status(200).json(new ApiResponse(200, detail, 'User details fetched'));
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body as SuspendBody;
  const result = await adminUsersService.setUserActive(req.params.userId, false, reason);
  void logActivity({
    ...adminIdentity(req),
    action: 'user.suspended',
    entityType: 'user',
    entityId: req.params.userId,
    metadata: { reason },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'User suspended'));
});

export const unsuspendUser = asyncHandler(async (req, res) => {
  const result = await adminUsersService.setUserActive(req.params.userId, true);
  void logActivity({
    ...adminIdentity(req),
    action: 'user.unsuspended',
    entityType: 'user',
    entityId: req.params.userId,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'User unsuspended'));
});

export const walletCredit = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body as WalletCreditBody;
  const result = await adminUsersService.creditUserWallet(req.params.userId, { amount, reason });
  void logActivity({
    ...adminIdentity(req),
    action: 'wallet.credited',
    entityType: 'wallet',
    entityId: req.params.userId,
    metadata: { amount, reason, balance: result.balance },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, `₹${result.credited} credited — new balance ₹${result.balance}`));
});
