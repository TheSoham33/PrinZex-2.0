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
 * Platform analytics. Heavy numbers come from the DATABASE — KPIs, order
 * breakdowns and seller rankings run inside PL/pgSQL-shaped functions
 * (admin_analytics_*, see migrations/…_admin_analytics_functions), plain time
 * series via $queryRaw + DATE_TRUNC — never in-memory summation over rows.
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

  // All 12 KPI numbers from one database call (see
  // migrations/…_admin_analytics_functions). Date windows are computed here
  // so server-local TZ semantics stay exactly as before.
  const [row] = await prisma.$queryRaw<Array<{ admin_analytics_kpi: string }>>`
    SELECT admin_analytics_kpi(${today}, ${tomorrow}, ${monthStart}, ${monthEnd})`;
  const n = JSON.parse(row?.admin_analytics_kpi ?? '{}') as Record<string, number>;

  const kpi: AdminKpi = {
    totalCustomers: Number(n.totalCustomers ?? 0),
    newCustomersThisMonth: Number(n.newCustomersThisMonth ?? 0),
    totalApprovedSellers: Number(n.totalApprovedSellers ?? 0),
    pendingSellersCount: Number(n.pendingSellersCount ?? 0),
    totalOrdersToday: Number(n.totalOrdersToday ?? 0),
    totalOrdersThisMonth: Number(n.totalOrdersThisMonth ?? 0),
    totalRevenueToday: roundMoney(n.totalRevenueToday ?? 0),
    totalRevenueThisMonth: roundMoney(n.totalRevenueThisMonth ?? 0),
    activeDeliveries: Number(n.activeDeliveries ?? 0),
    openSupportTickets: Number(n.openSupportTickets ?? 0),
    averageOrderValue: roundMoney(n.averageOrderValue ?? 0),
    platformCommissionThisMonth: roundMoney(n.platformCommissionThisMonth ?? 0),
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
      DATE_TRUNC(${Prisma.sql`${query.groupBy}`}, "createdAt") AS bucket,
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

export interface OrderAnalytics {
  volume: Array<{ date: Date; orders: number; byStatus: Record<string, number> }>;
  topSellers: Array<{ sellerId: string; storeName: string; orders: number }>;
  topServices: Array<{ serviceName: string; orders: number }>;
}

/** Shape of the admin_analytics_orders() JSON payload (ISO bucket strings). */
interface OrderAnalyticsPayload {
  volume: Array<{ bucket: string; status: string; count: number | string }>;
  topSellers: Array<{ sellerId: string; storeName: string | null; orders: number | string }>;
  topServices: Array<{ serviceName: string; orders: number | string }>;
}

export async function getOrderAnalytics(query: AnalyticsQuery): Promise<OrderAnalytics> {
  const since = periodStart(query.period);

  // Volume series + top sellers + top services in one database call; store
  // names are joined in SQL instead of a second round trip.
  const [row] = await prisma.$queryRaw<Array<{ admin_analytics_orders: string }>>`
    SELECT admin_analytics_orders(${since}, ${query.groupBy})`;
  const payload = JSON.parse(
    row?.admin_analytics_orders ?? '{"volume":[],"topSellers":[],"topServices":[]}',
  ) as OrderAnalyticsPayload;

  // Merge SQL-grouped rows into per-bucket shape (tiny result set: ≤ 90 buckets
  // × ~8 statuses — the aggregation itself already happened in Postgres).
  const byBucket = new Map<string, { date: Date; orders: number; byStatus: Record<string, number> }>();
  for (const v of payload.volume) {
    const date = new Date(v.bucket);
    const key = date.toISOString();
    const bucket = byBucket.get(key) ?? { date, orders: 0, byStatus: {} };
    bucket.orders += Number(v.count);
    bucket.byStatus[v.status] = Number(v.count);
    byBucket.set(key, bucket);
  }
  const volume = [...byBucket.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    volume,
    topSellers: payload.topSellers.map((row) => ({
      sellerId: row.sellerId,
      storeName: row.storeName ?? '(unknown store)',
      orders: Number(row.orders),
    })),
    topServices: payload.topServices.map((row) => ({
      serviceName: row.serviceName,
      orders: Number(row.orders),
    })),
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

  // Revenue / orders ranking — grouped, joined, sorted and paginated inside
  // admin_analytics_seller_ranking() (one call instead of three).
  interface RankingPayload {
    total: number | string;
    data: Array<{
      sellerId: string;
      storeName: string | null;
      city: string | null;
      revenue: number | string;
      orders: number | string;
      rating: number | string;
      completionRate: number | string;
    }>;
  }
  const [row] = await prisma.$queryRaw<Array<{ admin_analytics_seller_ranking: string }>>`
    SELECT admin_analytics_seller_ranking(${take}, ${skip}, ${query.sort})`;
  const payload = JSON.parse(
    row?.admin_analytics_seller_ranking ?? '{"total":0,"data":[]}',
  ) as RankingPayload;

  const data: SellerRankingEntry[] = payload.data.map((r) => ({
    sellerId: r.sellerId,
    storeName: r.storeName ?? '(unknown store)',
    city: r.city ?? '(unknown)',
    revenue: roundMoney(Number(r.revenue ?? 0)),
    orders: Number(r.orders ?? 0),
    rating: Number(r.rating ?? 0),
    completionRate: Number(r.completionRate ?? 0),
  }));
  return buildPaginatedResponse(data, Number(payload.total), { page: query.page, limit: query.limit });
}
