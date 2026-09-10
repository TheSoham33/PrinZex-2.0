import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { NotificationModel } from '../../../models/mongo/Notification.model';
import { ApiError } from '../../../utils/ApiError';
import { roundMoney } from '../../../utils/financial';
import { getWalletLimits } from '../../../utils/platformSettings';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../../utils/pagination';
import type { UsersQuery } from './admin-users.routes';

/**
 * Admin user management — every platform account (customers, sellers-as-users,
 * riders) with suspension + goodwill wallet credits. Identity always comes
 * from the URL param; cross-checks happen against the database row, never
 * the request body.
 */

async function notifyUser(
  userId: string,
  role: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  const recipientType = role === 'SELLER' ? 'seller' : role === 'DELIVERY_BOY' ? 'delivery_boy' : 'customer';
  await NotificationModel.create({ recipientId: userId, recipientType, type, title, body, data, channel: ['push'] });
}

// ── GET /api/admin/users ───────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  ordersCount: number;
  walletBalance: number;
}

export async function listUsers(query: UsersQuery): Promise<PaginatedResponse<AdminUserListItem>> {
  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  if (query.status) where.isActive = query.status === 'active';
  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.startDate || query.endDate) {
    where.createdAt = {
      ...(query.startDate ? { gte: query.startDate } : {}),
      ...(query.endDate ? { lt: query.endDate } : {}),
    };
  }

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      wallet: { select: { balance: true } },
      _count: { select: { orders: true } },
    },
  });

  return buildPaginatedResponse(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      ordersCount: user._count.orders,
      walletBalance: Number(user.wallet?.balance ?? 0),
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ── GET /api/admin/users/:userId ───────────────────────────────────────────

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      referralCode: true,
      createdAt: true,
      addresses: { orderBy: { createdAt: 'asc' } },
      wallet: {
        select: {
          id: true,
          balance: true,
          loyaltyPoints: true,
          transactions: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          total: true,
          paymentStatus: true,
          createdAt: true,
          seller: { select: { storeName: true } },
        },
      },
      _count: { select: { orders: true, supportTickets: true } },
    },
  });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const { wallet, ...rest } = user;
  return {
    ...rest,
    ordersCount: user._count.orders,
    supportTicketsCount: user._count.supportTickets,
    wallet: wallet ? { balance: Number(wallet.balance), loyaltyPoints: wallet.loyaltyPoints } : null,
    recentTransactions: (wallet?.transactions ?? []).map((txn) => ({
      ...txn,
      amount: Number(txn.amount),
    })),
    recentOrders: rest.orders.map((order) => ({
      id: order.id,
      status: order.status,
      total: Number(order.total),
      paymentStatus: order.paymentStatus,
      storeName: order.seller.storeName,
      createdAt: order.createdAt,
    })),
  };
}

// ── PATCH /:userId/suspend + /unsuspend ────────────────────────────────────

export async function setUserActive(
  userId: string,
  active: boolean,
  reason?: string,
): Promise<{ userId: string; isActive: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.role === 'ADMIN') {
    throw ApiError.badRequest('Admin accounts are managed under /api/admin/admins');
  }
  if (user.isActive === active) {
    throw ApiError.conflict(active ? 'This account is already active' : 'This account is already suspended');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isActive: active } }),
    // Suspension revokes sessions; unsuspension does NOT restore them (log in again).
    ...(active
      ? []
      : [prisma.refreshToken.updateMany({ where: { userId: user.id, isRevoked: false }, data: { isRevoked: true } })]),
  ]);

  try {
    await notifyUser(
      user.id,
      user.role,
      active ? 'account_reactivated' : 'account_suspended',
      active ? 'Your account is active again' : 'Your account has been suspended',
      active
        ? 'Welcome back — your PrinZex account has been reactivated.'
        : `Your PrinZex account was suspended${reason ? `: ${reason}` : '.'} Contact support if this seems wrong.`,
      { reason: reason ?? null },
    );
  } catch {
    // Notification is best-effort; the suspension itself already committed.
  }

  return { userId: user.id, isActive: active };
}

// ── POST /:userId/wallet-credit ────────────────────────────────────────────

export async function creditUserWallet(
  userId: string,
  input: { amount: number; reason: string },
): Promise<{ userId: string; credited: number; balance: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  const amount = roundMoney(input.amount);
  // Admin-configured credit cap (Settings → Platform).
  const { maxCredit } = await getWalletLimits();
  if (amount > maxCredit) {
    throw ApiError.badRequest(
      `A single credit may not exceed ₹${maxCredit.toLocaleString('en-IN')} — adjust the limit under Settings → Platform.`,
    );
  }

  const balance = await prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.wallet.findUnique({ where: { userId: user.id } })) ??
      (await tx.wallet.create({ data: { userId: user.id } }));
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        reason: 'ADJUSTMENT',
        amount,
        description: `Admin credit: ${input.reason}`,
      },
    });
    const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
    return Number(updated.balance);
  });

  try {
    await notifyUser(
      user.id,
      user.role,
      'wallet_credit',
      `₹${amount} credited to your wallet`,
      `Admin credit: ${input.reason}. New balance: ₹${balance}.`,
      { amount, balance },
    );
  } catch {
    // best-effort
  }

  return { userId: user.id, credited: amount, balance };
}

// ── POST /wallet-credit-bulk ───────────────────────────────────────────────

/**
 * Credit many wallets at once — an explicit user-id list or every customer.
 * Only CUSTOMER accounts are eligible: wallet balances exist for buyers, so
 * random ids / staff accounts are rejected loudly instead of silently skipped.
 * Credits run sequentially through creditUserWallet so every wallet gets its
 * own journal entry, balance update and notification; one bad id aborts the
 * whole call (already-processed users stay credited — amounts are real money,
 * never auto-reverted).
 */
export async function creditWalletsBulk(input: {
  userIds?: string[];
  allCustomers?: boolean;
  amount: number;
  reason: string;
}): Promise<{ credited: number; amount: number; totalCredited: number }> {
  // Fail fast on the configured caps before any wallet is touched — the
  // amount cap is re-checked per credit in creditUserWallet as well.
  const { maxCredit, maxBatchSize } = await getWalletLimits();
  if (roundMoney(input.amount) > maxCredit) {
    throw ApiError.badRequest(
      `A single credit may not exceed ₹${maxCredit.toLocaleString('en-IN')} — adjust the limit under Settings → Platform.`,
    );
  }
  if (!input.allCustomers && [...new Set(input.userIds ?? [])].length > maxBatchSize) {
    throw ApiError.badRequest(
      `A bulk credit may target at most ${maxBatchSize} users per call — adjust the limit under Settings → Platform.`,
    );
  }

  let targetIds: string[];
  if (input.allCustomers) {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', isActive: true },
      select: { id: true },
    });
    targetIds = customers.map((customer) => customer.id);
    if (targetIds.length === 0) {
      throw ApiError.badRequest('No active customers to credit');
    }
  } else {
    const ids = [...new Set(input.userIds ?? [])];
    const found = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });
    const byId = new Map(found.map((user) => [user.id, user.role]));
    for (const id of ids) {
      const role = byId.get(id);
      if (!role) throw ApiError.notFound(`User ${id} not found — bulk credit aborted`);
      if (role !== 'CUSTOMER') {
        throw ApiError.badRequest(`User ${id} is a ${role.toLowerCase()} — wallets belong to customers`);
      }
    }
    targetIds = ids;
  }

  for (const id of targetIds) {
    await creditUserWallet(id, { amount: input.amount, reason: input.reason });
  }

  const amount = roundMoney(input.amount);
  return {
    credited: targetIds.length,
    amount,
    totalCredited: roundMoney(amount * targetIds.length),
  };
}
