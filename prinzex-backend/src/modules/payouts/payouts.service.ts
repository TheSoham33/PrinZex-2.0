import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { ActivityLogModel } from '../../models/mongo/ActivityLog.model';
import { ApiError } from '../../utils/ApiError';
import { emitNotificationNew, emitPayoutProcessed } from '../../realtime/realtime.emitters';
import { getCache, setCache } from '../../utils/cache';
import { roundMoney } from '../../utils/financial';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';

/**
 * Admin payout operations + financial reporting.
 * Payout record lifecycle: PENDING → (approve) PROCESSING → (mark-paid) PAID
 *                                                   ↘ (fail) FAILED — failed
 * payouts release their locked orders/deliveries so balances become
 * requestable again.
 */

export interface AdminActionMeta {
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
}

async function logActivity(
  meta: AdminActionMeta,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await ActivityLogModel.create({
    adminId: meta.adminId,
    action,
    entityType: 'payout',
    entityId,
    metadata,
    ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
}

async function notifyRecipient(
  payout: { recipientType: string; sellerId: string | null; deliveryBoyId: string | null; amount: unknown; id: string },
  type: string,
  title: string,
  body: string,
): Promise<void> {
  const recipientId = payout.recipientType === 'seller' ? payout.sellerId : payout.deliveryBoyId;
  if (!recipientId) return;
  const recipientType = payout.recipientType === 'seller' ? 'seller' : 'delivery_boy';
  const data = { payoutId: payout.id, amount: Number(payout.amount) };
  await NotificationModel.create({
    recipientId,
    recipientType,
    type,
    title,
    body,
    data,
    channel: ['push'],
  });
  emitNotificationNew(recipientType, recipientId, { type, title, body, data }); // step 9 realtime
}

// ── GET /api/admin/payouts ─────────────────────────────────────────────────

export interface PayoutsQueryInput {
  recipientType?: 'seller' | 'delivery_boy';
  status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  page: number;
  limit: number;
}

export async function listPayouts(query: PayoutsQueryInput): Promise<PaginatedResponse<unknown>> {
  const where: Prisma.PayoutWhereInput = {
    ...(query.recipientType ? { recipientType: query.recipientType } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, payouts] = await prisma.$transaction([
    prisma.payout.count({ where }),
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        seller: { select: { id: true, storeName: true, ownerName: true } },
        deliveryBoy: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  return buildPaginatedResponse(
    payouts.map((payout) => ({
      id: payout.id,
      recipientType: payout.recipientType,
      recipient:
        payout.recipientType === 'seller'
          ? { id: payout.seller?.id ?? null, name: payout.seller?.storeName ?? null, owner: payout.seller?.ownerName ?? null }
          : { id: payout.deliveryBoy?.id ?? null, name: payout.deliveryBoy?.name ?? null },
      amount: Number(payout.amount),
      ordersIncluded: payout.ordersIncluded,
      status: payout.status,
      bankAccount: payout.bankAccount,
      transactionRef: payout.transactionRef,
      initiatedAt: payout.initiatedAt,
      processedAt: payout.processedAt,
      failReason: payout.failReason,
      createdAt: payout.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ── GET /api/admin/payouts/summary ─────────────────────────────────────────

/** Weekly payout runs land on Mondays — next scheduled run helper (pure). */
export function nextPayoutDate(from = new Date()): Date {
  const next = new Date(from);
  next.setHours(10, 0, 0, 0);
  const day = next.getDay(); // 0 = Sunday, 1 = Monday
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  next.setDate(next.getDate() + daysUntilMonday);
  return next;
}

export async function payoutsSummary() {
  const grouped = await prisma.payout.groupBy({
    by: ['recipientType', 'status'],
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const amountOf = (type: string) =>
    roundMoney(
      grouped
        .filter((row) => row.recipientType === type)
        .reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0),
    );
  const pendingCount = grouped
    .filter((row) => row.status === 'PENDING')
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    pending: {
      sellers: amountOf('seller'),
      deliveryBoys: amountOf('delivery_boy'),
      total: roundMoney(amountOf('seller') + amountOf('delivery_boy')),
      requestCount: pendingCount,
    },
    // TODO(cron): weekly payout run — schedule bulk processing for this date.
    nextScheduledPayoutDate: nextPayoutDate(),
  };
}

// ── Approve / bulk ─────────────────────────────────────────────────────────

export async function approvePayout(meta: AdminActionMeta, payoutId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw ApiError.notFound('Payout not found');
  }
  if (payout.status !== 'PENDING') {
    throw ApiError.conflict(`Only PENDING payouts can be approved — current status is ${payout.status}`);
  }

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'PROCESSING', initiatedAt: new Date() },
  });

  await Promise.all([
    logActivity(meta, 'payout.approved', payoutId, { recipientType: payout.recipientType, amount: Number(payout.amount) }),
    notifyRecipient(payout, 'payout_processing', 'Payout being processed', `Your payout request of ₹${Number(payout.amount)} is being processed.`),
  ]);

  return { payoutId, status: 'PROCESSING' };
}

export async function bulkApprovePayouts(meta: AdminActionMeta, payoutIds: string[]) {
  // ONE database round-trip per spec — never a per-id update loop.
  const result = await prisma.payout.updateMany({
    where: { id: { in: payoutIds }, status: 'PENDING' },
    data: { status: 'PROCESSING', initiatedAt: new Date() },
  });

  await logActivity(meta, 'payout.bulk_approved', 'bulk', {
    requested: payoutIds.length,
    approved: result.count,
    payoutIds,
  });

  return { requested: payoutIds.length, approved: result.count };
}

// ── Mark paid ──────────────────────────────────────────────────────────────

export async function markPayoutPaid(meta: AdminActionMeta, payoutId: string, transactionRef: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw ApiError.notFound('Payout not found');
  }
  if (payout.status !== 'PROCESSING') {
    throw ApiError.conflict(`Only PROCESSING payouts can be marked paid — current status is ${payout.status}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id: payoutId },
      data: { status: 'PAID', processedAt: new Date(), transactionRef },
    });

    // Informational virtual ledger entry for sellers (DEBIT against their
    // user wallet if one exists — sellers may not have a wallet row).
    if (payout.recipientType === 'seller' && payout.sellerId) {
      const seller = await tx.seller.findUnique({ where: { id: payout.sellerId }, select: { userId: true } });
      if (seller) {
        const wallet = await tx.wallet.findUnique({ where: { userId: seller.userId } });
        if (wallet) {
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEBIT',
              reason: 'PAYOUT',
              amount: Number(payout.amount),
              description: `Payout ${payout.id} transferred to bank (${transactionRef})`,
              referenceId: payout.id,
            },
          });
        }
      }
    }
  });

  await Promise.all([
    logActivity(meta, 'payout.marked_paid', payoutId, {
      transactionRef,
      amount: Number(payout.amount),
      recipientType: payout.recipientType,
    }),
    notifyRecipient(
      payout,
      'payout_paid',
      'Payout transferred',
      `Your payout of ₹${Number(payout.amount)} has been transferred (ref ${transactionRef}).`,
    ),
  ]);

  // Real-time (step 9): payout:processed → the seller's /orders room (rider
  // payouts go to the delivery room — rooms already exist there).
  const recipientId = payout.recipientType === 'seller' ? payout.sellerId : payout.deliveryBoyId;
  if (recipientId) {
    emitPayoutProcessed(
      payout.recipientType === 'seller' ? 'seller' : 'delivery_boy',
      recipientId,
      { payoutId: payout.id, amount: Number(payout.amount), transactionRef, timestamp: new Date() },
    );
  }

  return { payoutId, status: 'PAID', transactionRef };
}

// ── Fail ───────────────────────────────────────────────────────────────────

export async function failPayout(meta: AdminActionMeta, payoutId: string, reason: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw ApiError.notFound('Payout not found');
  }
  if (payout.status === 'PAID') {
    throw ApiError.conflict('A PAID payout cannot be failed');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id: payoutId },
      data: { status: 'FAILED', failReason: reason },
    });

    // Release the locked earnings so the recipient can re-request them.
    if (payout.recipientType === 'seller') {
      await tx.order.updateMany({ where: { payoutId }, data: { payoutId: null } });
    } else if (payout.recipientType === 'delivery_boy' && payout.deliveryBoyId) {
      await tx.delivery.updateMany({ where: { payoutId }, data: { payoutId: null } });
      await tx.deliveryBoy.update({
        where: { id: payout.deliveryBoyId },
        data: { pendingEarnings: { increment: Number(payout.amount) } },
      });
    }
  });

  await Promise.all([
    logActivity(meta, 'payout.failed', payoutId, { reason, amount: Number(payout.amount) }),
    notifyRecipient(
      payout,
      'payout_failed',
      'Payout could not be completed',
      `Your payout of ₹${Number(payout.amount)} failed: ${reason}. The amount is back in your pending balance.`,
    ),
  ]);

  return { payoutId, status: 'FAILED' };
}

// ══════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTING
// ══════════════════════════════════════════════════════════════════════════

export interface DateRange {
  start: Date;
  end: Date;
}

/** Explicit range, or the current calendar month by default. */
export function financialPeriod(startDate?: Date, endDate?: Date): DateRange {
  const now = new Date();
  return {
    start: startDate ?? new Date(now.getFullYear(), now.getMonth(), 1),
    end: endDate ?? now,
  };
}

export async function financialOverview(range: DateRange) {
  const completed = { status: 'delivered', createdAt: { gte: range.start, lt: range.end } };

  const [orders, payouts, pendingPayouts, refunds] = await prisma.$transaction([
    prisma.order.aggregate({
      where: completed,
      _sum: { total: true, commissionAmount: true, deliveryFee: true },
    }),
    prisma.payout.aggregate({
      where: { status: 'PAID', processedAt: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    // Approximation: refunded/partially-refunded orders' totals. A dedicated
    // refund ledger (with exact amounts) is a TODO for the reporting step.
    prisma.order.aggregate({
      where: {
        paymentStatus: { in: ['refunded', 'partially_refunded'] },
        updatedAt: { gte: range.start, lt: range.end },
      },
      _sum: { total: true },
    }),
  ]);

  const totalCommission = roundMoney(Number(orders._sum.commissionAmount ?? 0));
  const totalDeliveryRevenue = roundMoney(Number(orders._sum.deliveryFee ?? 0));

  return {
    period: { start: range.start, end: range.end },
    totalGMV: roundMoney(Number(orders._sum.total ?? 0)),
    totalCommission,
    totalDeliveryRevenue,
    totalPayouts: roundMoney(Number(payouts._sum.amount ?? 0)),
    netRevenue: roundMoney(totalCommission + totalDeliveryRevenue),
    pendingPayouts: roundMoney(Number(pendingPayouts._sum.amount ?? 0)),
    refundsIssued: roundMoney(Number(refunds._sum.total ?? 0)),
  };
}

export interface CommissionReportEntry {
  sellerId: string;
  storeName: string;
  grossRevenue: number;
  commissionRate: number;
  commissionEarned: number;
  ordersCount: number;
  payoutsPaid: number;
  pendingBalance: number;
}

export async function commissionReport(range: DateRange): Promise<CommissionReportEntry[]> {
  const cacheKey = `${REDIS_KEYS.ADMIN_COMMISSION_REPORT()}:${range.start.toISOString().slice(0, 10)}:${range.end.toISOString().slice(0, 10)}`;
  const cached = await getCache<CommissionReportEntry[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Aggregate at the database: groupBy + _sum (never in-memory sums).
  // Note: these run as standalone awaited queries rather than inside
  // prisma.$transaction([...]) because the Prisma 5 client groupBy generics
  // fail to infer aggregate types from within a transaction array literal.
  // They are read-only aggregates, so back-to-back reads are safe here.
  const sales = await prisma.order.groupBy({
    by: ['sellerId'],
    where: { status: 'delivered', createdAt: { gte: range.start, lt: range.end } },
    _sum: { total: true, commissionAmount: true },
    _count: { _all: true },
  });
  const unpaid = await prisma.order.groupBy({
    by: ['sellerId'],
    where: { status: 'delivered', payoutId: null },
    _sum: { total: true, commissionAmount: true, deliveryFee: true },
  });
  const payouts = await prisma.payout.groupBy({
    by: ['sellerId'],
    where: { recipientType: 'seller', status: 'PAID' },
    _sum: { amount: true },
  });

  const sellerIds = [...new Set([...sales, ...unpaid, ...payouts].map((row) => row.sellerId).filter((id): id is string => id !== null))];
  const sellers = await prisma.seller.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, storeName: true, commissionRate: true },
  });
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));

  const report: CommissionReportEntry[] = sales.map((row) => {
    const seller = sellerById.get(row.sellerId);
    const unpaidRow = unpaid.find((u) => u.sellerId === row.sellerId);
    const payoutRow = payouts.find((p) => p.sellerId === row.sellerId);
    const pendingBalance = roundMoney(
      Number(unpaidRow?._sum.total ?? 0) -
        Number(unpaidRow?._sum.commissionAmount ?? 0) -
        Number(unpaidRow?._sum.deliveryFee ?? 0),
    );

    return {
      sellerId: row.sellerId,
      storeName: seller?.storeName ?? '(unknown store)',
      grossRevenue: roundMoney(Number(row._sum.total ?? 0)),
      commissionRate: Number(seller?.commissionRate ?? 0),
      commissionEarned: roundMoney(Number(row._sum.commissionAmount ?? 0)),
      ordersCount: row._count._all,
      payoutsPaid: roundMoney(Number(payoutRow?._sum.amount ?? 0)),
      pendingBalance,
    };
  });

  report.sort((a, b) => b.grossRevenue - a.grossRevenue);
  await setCache(cacheKey, report, REDIS_TTL.CACHE_COMMISSION_REPORT);
  return report;
}
