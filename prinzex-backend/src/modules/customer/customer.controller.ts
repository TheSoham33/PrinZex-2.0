import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { CustomerTokenPayload } from '../../utils/jwt';
import * as customerService from './customer.service';
import type {
  AddMoneyInput,
  ChangePasswordInput,
  CreateAddressInput,
  NotificationsQuery,
  UpdateAddressInput,
  UpdateProfileInput,
} from './customer.schema';
import type { TransactionsQuery } from './customer.schema';

/** Narrowed request — routes mount authenticate + authorizeRoles('CUSTOMER'). */
function customerId(req: Request): string {
  const user = req.user as CustomerTokenPayload | undefined;
  if (!user || user.role !== 'CUSTOMER') {
    throw ApiError.unauthorized();
  }
  return user.userId;
}

// ── Profile ────────────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await customerService.getProfile(customerId(req));
  res.status(200).json(new ApiResponse(200, profile, 'Profile fetched'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await customerService.updateProfile(customerId(req), req.body as UpdateProfileInput);
  res.status(200).json(new ApiResponse(200, profile, 'Profile updated'));
});

export const changePassword = asyncHandler(async (req, res) => {
  await customerService.changePassword(customerId(req), req.body as ChangePasswordInput);
  res.status(200).json(new ApiResponse(200, null, 'Password changed — please log in again on other devices'));
});

// ── Addresses ───────────────────────────────────────────────────────────────

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await customerService.listAddresses(customerId(req));
  res.status(200).json(new ApiResponse(200, addresses, 'Addresses fetched'));
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await customerService.createAddress(customerId(req), req.body as CreateAddressInput);
  res.status(201).json(new ApiResponse(201, address, 'Address added'));
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await customerService.updateAddress(
    customerId(req),
    req.params.addressId,
    req.body as UpdateAddressInput,
  );
  res.status(200).json(new ApiResponse(200, address, 'Address updated'));
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await customerService.deleteAddress(customerId(req), req.params.addressId);
  res.status(200).json(new ApiResponse(200, result, 'Address deleted'));
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await customerService.setDefaultAddress(customerId(req), req.params.addressId);
  res.status(200).json(new ApiResponse(200, address, 'Default address updated'));
});

// ── Wallet ──────────────────────────────────────────────────────────────────

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await customerService.getWallet(customerId(req));
  res.status(200).json(new ApiResponse(200, wallet, 'Wallet fetched'));
});

export const addMoney = asyncHandler(async (req, res) => {
  const result = await customerService.addMoney(customerId(req), req.body as AddMoneyInput);
  res.status(200).json(new ApiResponse(200, result, 'Money added to wallet (simulated)'));
});

export const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await customerService.listTransactions(
    customerId(req),
    req.query as unknown as TransactionsQuery,
  );
  res.status(200).json(new ApiResponse(200, transactions, 'Transactions fetched'));
});

// ── Notifications ───────────────────────────────────────────────────────────

export const listNotifications = asyncHandler(async (req, res) => {
  const { notifications, unreadCount } = await customerService.listNotifications(
    customerId(req),
    req.query as unknown as NotificationsQuery,
  );
  res.set('X-Unread-Count', String(unreadCount));
  res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched'));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await customerService.markNotificationRead(customerId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await customerService.markAllNotificationsRead(customerId(req));
  res.status(200).json(new ApiResponse(200, result, 'All notifications marked as read'));
});
