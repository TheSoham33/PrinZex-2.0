import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../../config/redis';
import { getCache, invalidateCachePattern, setCache } from '../../../utils/cache';
import { roundMoney } from '../../../utils/financial';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../../utils/pagination';
import type { AnalyticsQuery, SellerRankingQuery } from './admin-analytics.routes';

/**
 * Platform analytics. Heavy numbers come from the DATABASE (Prisma aggregate/
 * groupBy for KPIs, $queryRaw + DATE_TRUNC for time series) — never in-memory
 * summation over loaded rows.
 */

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(anchor = new Date()): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

function nextMonth(anchor = new Date()): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
}

export function periodStart(period: AnalyticsQuery['period']): Date {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = startOfToday();
  start.setDate(start.getDate() - days);
  return start;
}

// ── GET /api/admin/analytics/kpi ───────────────────────────────────────────

export interface AdminKpi {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalApprovedSellers: number;
  pendingSellersCount: number;
  totalOrdersToday: number;
  totalOrdersThisMonth: number;
  totalRevenueToday: number;
  totalRevenueThisMonth: number;
  activeDeliveries: number;
  openSupportTickets: number;
  averageOrderValue: number;
  platformCommissionThisMonth: number;
}

/**
 * KPI totals — Redis cached for 60s (REDIS_KEYS.ADMIN_STATS) and actively
 * invalidated on significant events: new order (orders module), seller
 * registration (seller-registration module), seller approve/reject (admin).
 * startDate/endDate override the default current-month window.
 */
export async function getKpi(range: { startDate?: Date; endDate?: Date }): Promise<AdminKpi> {
  const cacheKey =
    range.startDate || range.endDate
      ? `${REDIS_KEYS.ADMIN_STATS()}:${range.startDate?.toISOString().slice(0, 10) ?? ''}:${range.endDate?.toISOString().slice(0, 10) ?? ''}`
      : REDIS_KEYS.ADMIN_STATS();
  const cached = await getCache<AdminKpi>(cacheKey);
  if (cached) {
    return cached;
  }

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = range.startDate ?? startOfMonth();
  const monthEnd = range.endDate ?? nextMonth(monthStart);

  const [
    totalCustomers,
    newCustomersThisMonth,
    totalApprovedSellers,
    pendingSellersCount,
    totalOrdersToday,
    totalOrdersThisMonth,
    revenueToday,
    revenueMonth,
    activeDeliveries,
    openSupportTickets,
    averageOrderValueAgg,
    commissionMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.seller.count({ where: { status: 'APPROVED' } }),
    prisma.seller.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.order.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.order.aggregate({
      where: { status: 'delivered', createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { status: 'delivered', createdAt: { gte: monthStart, lt: monthEnd } },
      _sum: { total: true },
    }),
    prisma.delivery.count({ where: { status: 'out_for_delivery' } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.order.aggregate({
      where: { status: 'delivered', createdAt: { gte: monthStart, lt: monthEnd } },
      _avg: { total: true },
    }),
    prisma.order.aggregate({
      where: { status: 'delivered', createdAt: { gte: monthStart, lt: monthEnd } },
      _sum: { commissionAmount: true },
    }),
  ]);

  const kpi: AdminKpi = {
    totalCustomers,
    newCustomersThisMonth,
    totalApprovedSellers,
    pendingSellersCount,
    totalOrdersToday,
    totalOrdersThisMonth,
    totalRevenueToday: roundMoney(Number(revenueToday._sum.total ?? 0)),
    totalRevenueThisMonth: roundMoney(Number(revenueMonth._sum.total ?? 0)),
    activeDeliveries,
    openSupportTickets,
    averageOrderValue: roundMoney(Number(averageOrderValueAgg._avg.total ?? 0)),
    platformCommissionThisMonth: roundMoney(Number(commissionMonth._sum.commissionAmount ?? 0)),
  };

  await setCache(cacheKey, kpi, REDIS_TTL.CACHE_ADMIN); // 60s
  return kpi;
}

/** Significant-event hook: new order / new seller / approval lane. */
export async function invalidateAdminStats(): Promise<void> {
  await invalidateCachePattern(`${REDIS_KEYS.ADMIN_STATS()}*`); // base key + ranged variants
}

// ── GET /api/admin/analytics/revenue ───────────────────────────────────────

interface RevenueBucketRow {
  bucket: Date;
  revenue: number;
  orders: number;
  commission: number;
}

export interface RevenuePoint {
  date: Date;
  revenue: number;
  orders: number;
  commission: number;
}

/** DATE_TRUNC time series straight from PostgreSQL (spec: no in-memory grouping). */
export async function getRevenueAnalytics(query: AnalyticsQuery): Promise<RevenuePoint[]> {
  const since = periodStart(query.period);
  // groupBy is zod-enum validated ('day'|'week'|'month') before this point.
  const rows = await prisma.$queryRaw<RevenueBucketRow[]>`
    SELECT
      DATE_TRUNC(${Prisma.raw(`'${query.groupBy}'`)}, "createdAt") AS bucket,
      COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::float AS revenue,
      COUNT(*)::int AS orders,
      COALESCE(SUM("commissionAmount") FILTER (WHERE status = 'delivered'), 0)::float AS commission
    FROM "Order"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC`;

  return rows.map((row) => ({
    date: row.bucket,
    revenue: roundMoney(Number(row.revenue)),
    orders: Number(row.orders),
    commission: roundMoney(Number(row.commission)),
  }));
}

// ── GET /api/admin/analytics/orders ────────────────────────────────────────

interface OrderVolumeRow {
  bucket: Date;
  status: string;
  count: number;
}

export interface OrderAnalytics {
  volume: Array<{ date: Date; orders: number; byStatus: Record<string, number> }>;
  topSellers: Array<{ sellerId: string; storeName: string; orders: number }>;
  topServices: Array<{ serviceName: string; orders: number }>;
}

export async function getOrderAnalytics(query: AnalyticsQuery): Promise<OrderAnalytics> {
  const since = periodStart(query.period);

  // Volume + status distribution — grouped in SQL.
  const volumeRows = await prisma.$queryRaw<OrderVolumeRow[]>`
    SELECT
      DATE_TRUNC(${Prisma.raw(`'${query.groupBy}'`)}, "createdAt") AS bucket,
      status,
      COUNT(*)::int AS count
    FROM "Order"
    WHERE "createdAt" >= ${since}
    GROUP BY 1, 2
    ORDER BY 1 ASC`;

  // Merge SQL-grouped rows into per-bucket shape (tiny result set: ≤ 90 buckets
  // × ~8 statuses — the aggregation itself already happened in Postgres).
  const byBucket = new Map<string, { date: Date; orders: number; byStatus: Record<string, number> }>();
  for (const row of volumeRows) {
    const key = row.bucket.toISOString();
    const bucket = byBucket.get(key) ?? { date: row.bucket, orders: 0, byStatus: {} };
    bucket.orders += Number(row.count);
    bucket.byStatus[row.status] = Number(row.count);
    byBucket.set(key, bucket);
  }
  const volume = [...byBucket.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Top 5 sellers by order count (database groupBy).
  const topSellerRows = await prisma.order.groupBy({
    by: ['sellerId'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const topSellersData = await prisma.seller.findMany({
    where: { id: { in: topSellerRows.map((row) => row.sellerId) } },
    select: { id: true, storeName: true },
  });
  const storeNameById = new Map(topSellersData.map((seller) => [seller.id, seller.storeName]));

  // Top 5 services by order count (database groupBy on order lines).
  const topServiceRows = await prisma.orderItem.groupBy({
    by: ['serviceName'],
    where: { order: { createdAt: { gte: since } } },
    _count: { orderId: true },
    orderBy: { _count: { orderId: 'desc' } },
    take: 5,
  });

  return {
    volume,
    topSellers: topSellerRows.map((row) => ({
      sellerId: row.sellerId,
      storeName: storeNameById.get(row.sellerId) ?? '(unknown store)',
      orders: row._count.id,
    })),
    topServices: topServiceRows.map((row) => ({ serviceName: row.serviceName, orders: row._count.orderId })),
  };
}

// ── GET /api/admin/analytics/geography ─────────────────────────────────────

interface GeographyRow {
  city: string | null;
  orders: number;
  revenue: number;
}

export interface GeographyPoint {
  city: string;
  orders: number;
  revenue: number;
}

/** City heatmap source — city lives in the deliveryAddress JSON snapshot. */
export async function getGeographyAnalytics(): Promise<GeographyPoint[]> {
  const rows = await prisma.$queryRaw<GeographyRow[]>`
    SELECT
      deliveryAddress->>'city' AS city,
      COUNT(*)::int AS orders,
      COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::float AS revenue
    FROM "Order"
    GROUP BY 1
    ORDER BY revenue DESC`;

  return rows.map((row) => ({
    city: row.city && row.city.trim().length > 0 ? row.city : '(unknown)',
    orders: Number(row.orders),
    revenue: roundMoney(Number(row.revenue)),
  }));
}

// ── GET /api/admin/analytics/sellers ───────────────────────────────────────

export interface SellerRankingEntry {
  sellerId: string;
  storeName: string;
  city: string;
  revenue: number;
  orders: number;
  rating: number;
  completionRate: number;
}

export async function getSellerRanking(query: SellerRankingQuery): Promise<PaginatedResponse<SellerRankingEntry>> {
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });

  if (query.sort === 'rating') {
    // Rating order lives on the Seller row → paginate sellers, then aggregate.
    const total = await prisma.seller.count({ where: { status: 'APPROVED' } });
    const sellers = await prisma.seller.findMany({
      where: { status: 'APPROVED' },
      orderBy: { averageRating: 'desc' },
      skip,
      take,
      select: { id: true, storeName: true, city: true, averageRating: true, completionRate: true },
    });
    const stats = await prisma.order.groupBy({
      by: ['sellerId'],
      where: { sellerId: { in: sellers.map((s) => s.id) }, status: 'delivered' },
      _sum: { total: true },
      _count: { id: true },
    });
    const statsById = new Map(stats.map((row) => [row.sellerId, row]));
    const data: SellerRankingEntry[] = sellers.map((seller) => {
      const stat = statsById.get(seller.id);
      return {
        sellerId: seller.id,
        storeName: seller.storeName,
        city: seller.city,
        revenue: roundMoney(Number(stat?._sum.total ?? 0)),
        orders: stat?._count.id ?? 0,
        rating: Number(seller.averageRating),
        completionRate: Number(seller.completionRate),
      };
    });
    return buildPaginatedResponse(data, total, { page: query.page, limit: query.limit });
  }

  // Revenue / orders ranking — sorted + paginated AT THE DATABASE via groupBy.
  const totalRows = await prisma.$queryRaw<Array<{ sellers: number }>>`
    SELECT COUNT(DISTINCT "sellerId")::int AS sellers FROM "Order" WHERE status = 'delivered'`;
  const total = Number(totalRows[0]?.sellers ?? 0);

  const grouped = await prisma.order.groupBy({
    by: ['sellerId'],
    where: { status: 'delivered' },
    _sum: { total: true },
    _count: { id: true },
    orderBy: query.sort === 'revenue' ? { _sum: { total: 'desc' } } : { _count: { id: 'desc' } },
    skip,
    take,
  });
  const sellers = await prisma.seller.findMany({
    where: { id: { in: grouped.map((row) => row.sellerId) } },
    select: { id: true, storeName: true, city: true, averageRating: true, completionRate: true },
  });
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));

  const data: SellerRankingEntry[] = grouped.map((row) => {
    const seller = sellerById.get(row.sellerId);
    return {
      sellerId: row.sellerId,
      storeName: seller?.storeName ?? '(unknown store)',
      city: seller?.city ?? '(unknown)',
      revenue: roundMoney(Number(row._sum.total ?? 0)),
      orders: row._count.id,
      rating: Number(seller?.averageRating ?? 0),
      completionRate: Number(seller?.completionRate ?? 0),
    };
  });
  return buildPaginatedResponse(data, total, { page: query.page, limit: query.limit });
}
