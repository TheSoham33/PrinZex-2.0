import { randomUUID } from 'crypto';
import type { Address, User, Wallet } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, comparePassword } from '../../utils/hash';
import { NotificationModel, type INotification } from '../../models/mongo/Notification.model';
import {
  buildPaginatedResponse,
  paginate,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';
import { revokeAllUserRefreshTokens } from '../auth/auth.helpers';
import type {
  AddMoneyInput,
  ChangePasswordInput,
  CreateAddressInput,
  NotificationsQuery,
  TransactionsQuery,
  UpdateAddressInput,
  UpdateProfileInput,
} from './customer.schema';

// ─── PROFILE ───────────────────────────────────────────────────────────────

type WalletSummary = Pick<Wallet, 'balance' | 'loyaltyPoints' | 'updatedAt'>;

export type CustomerProfile = Omit<User, 'passwordHash' | 'twoFactorSecret'> & {
  wallet: WalletSummary | null;
};

function toProfile(user: User & { wallet: Wallet | null }): CustomerProfile {
  const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, wallet, ...safe } = user;
  return {
    ...safe,
    wallet: wallet
      ? { balance: wallet.balance, loyaltyPoints: wallet.loyaltyPoints, updatedAt: wallet.updatedAt }
      : null,
  };
}

export async function getProfile(userId: string): Promise<CustomerProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toProfile(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<CustomerProfile> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, avatarUrl: input.avatarUrl },
    include: { wallet: true },
  });
  return toProfile(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (!user.passwordHash) {
    throw ApiError.badRequest('Password login is not set up for this account');
  }
  const matches = await comparePassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  // Force re-login on every other device.
  await revokeAllUserRefreshTokens(userId);
}

// ─── ADDRESSES ─────────────────────────────────────────────────────────────

export async function listAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
  const existingCount = await prisma.address.count({ where: { userId } });
  // The very first address is implicitly the default one.
  const makeDefault = input.isDefault === true || existingCount === 0;

  return prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: { ...input, lat: input.lat ?? null, lng: input.lng ?? null, isDefault: makeDefault, userId },
    });
  });
}

/** Ownership check — every mutation on an address goes through this. */
async function getOwnedAddress(userId: string, addressId: string): Promise<Address> {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    // 404 (not 403) so address existence is never leaked across users.
    throw ApiError.notFound('Address not found');
  }
  return address;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<Address> {
  await getOwnedAddress(userId, addressId);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id: addressId }, data: input });
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<{ deleted: true }> {
  const address = await getOwnedAddress(userId, addressId);
  const count = await prisma.address.count({ where: { userId } });

  if (count <= 1) {
    throw ApiError.badRequest('Cannot delete your only address');
  }
  if (address.isDefault) {
    throw ApiError.badRequest(
      'This is your default address — set another address as default before deleting it',
    );
  }

  await prisma.address.delete({ where: { id: addressId } });
  return { deleted: true };
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<Address> {
  await getOwnedAddress(userId, addressId);

  return prisma.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
  });
}

// ─── WALLET ────────────────────────────────────────────────────────────────

async function getWalletOrThrow(userId: string): Promise<Wallet> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw ApiError.notFound('Wallet not found');
  }
  return wallet;
}

export interface WalletOverview {
  balance: Wallet['balance'];
  loyaltyPoints: number;
  updatedAt: Date;
  transactions: PaginatedResponse<unknown>;
}

export async function getWallet(userId: string): Promise<WalletOverview> {
  const wallet = await getWalletOrThrow(userId);
  const [total, lastTen] = await prisma.$transaction([
    prisma.transaction.count({ where: { walletId: wallet.id } }),
    prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    balance: wallet.balance,
    loyaltyPoints: wallet.loyaltyPoints,
    updatedAt: wallet.updatedAt,
    transactions: buildPaginatedResponse(lastTen, total, { page: 1, limit: 10 }),
  };
}

export async function addMoney(userId: string, input: AddMoneyInput): Promise<{
  balance: Wallet['balance'];
  transactionReference: string;
}> {
  const wallet = await getWalletOrThrow(userId);
  const referenceId = `pay_stub_${randomUUID().slice(0, 8)}`;

  // TODO: integrate Razorpay order creation here; transaction should only be
  // committed after gateway confirmation (webhook / signature verification).
  // Balance update + ledger entry must commit atomically.
  const [updatedWallet] = await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: input.amount } },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        reason: 'WALLET_TOPUP',
        amount: input.amount,
        description: `Wallet top-up via ${input.paymentMethod} (simulated)`,
        referenceId,
      },
    });
    return [updated];
  });

  return { balance: updatedWallet.balance, transactionReference: referenceId };
}

export async function listTransactions(
  userId: string,
  query: TransactionsQuery,
): Promise<PaginatedResponse<unknown>> {
  const wallet = await getWalletOrThrow(userId);

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (query.startDate) createdAt.gte = query.startDate;
  if (query.endDate) createdAt.lte = query.endDate;

  const where = {
    walletId: wallet.id,
    ...(query.type ? { type: query.type } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, transactions] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);

  return buildPaginatedResponse(transactions, total, { page: query.page, limit: query.limit });
}

// ─── NOTIFICATIONS (MongoDB) ───────────────────────────────────────────────

interface NotificationFilter {
  recipientId: string;
  recipientType: 'customer';
  isRead?: boolean;
}

function buildNotificationFilter(userId: string): NotificationFilter {
  return { recipientId: userId, recipientType: 'customer' };
}

export async function listNotifications(
  userId: string,
  query: NotificationsQuery,
): Promise<{ notifications: PaginatedResponse<INotification>; unreadCount: number }> {
  const filter = buildNotificationFilter(userId);
  if (query.isRead !== 'all') {
    filter.isRead = query.isRead === 'true';
  }

  const params = { page: query.page, limit: query.limit };
  const [result, unreadCount] = await Promise.all([
    paginate<INotification>(
      params,
      () => NotificationModel.countDocuments(filter),
      (skip, take) =>
        NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    ),
    NotificationModel.countDocuments({ ...buildNotificationFilter(userId), isRead: false }),
  ]);

  return { notifications: result, unreadCount };
}

export async function markNotificationRead(userId: string, id: string): Promise<INotification> {
  const updated = await NotificationModel.findOneAndUpdate(
    { _id: id, ...buildNotificationFilter(userId) },
    { isRead: true, readAt: new Date() },
    { new: true },
  ).lean();
  if (!updated) {
    throw ApiError.notFound('Notification not found');
  }
  return updated;
}

export async function markAllNotificationsRead(userId: string): Promise<{ modified: number }> {
  const result = await NotificationModel.updateMany(
    { ...buildNotificationFilter(userId), isRead: false },
    { isRead: true, readAt: new Date() },
  );
  return { modified: result.modifiedCount };
}
