import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole } from '@/lib/api-helpers';
import type { PlatformAnalytics } from '@/lib/types/admin-analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;

  const [users, sellers, pendingSellers, ordersToday, ordersYesterday, revenueToday, revenueYesterday, tickets] =
    await Promise.all([
      query('SELECT COUNT(*)::int AS c FROM "users"'),
      query('SELECT COUNT(*)::int AS c FROM "sellers"'),
      query(`SELECT COUNT(*)::int AS c FROM "sellers" WHERE status='PENDING'`),
      query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(total),0)::float AS rev FROM "orders" WHERE "createdAt"::date = CURRENT_DATE`),
      query(`SELECT COUNT(*)::int AS c FROM "orders" WHERE "createdAt"::date = CURRENT_DATE - 1`),
      query(`SELECT COALESCE(SUM(total),0)::float AS rev FROM "orders" WHERE "createdAt"::date = CURRENT_DATE`),
      query(`SELECT COALESCE(SUM(total),0)::float AS rev FROM "orders" WHERE "createdAt"::date = CURRENT_DATE - 1`),
      query(`SELECT COUNT(*)::int AS c FROM "orders" WHERE status IN ('PENDING','PROCESSING')`),
    ]);

  const kpis = {
    totalUsers: users.rows[0].c,
    usersGrowthPct: 0,
    totalSellers: sellers.rows[0].c,
    pendingSellers: pendingSellers.rows[0].c,
    ordersToday: ordersToday.rows[0].c,
    ordersYesterday: ordersYesterday.rows[0].c,
    revenueToday: revenueToday.rows[0].rev,
    revenueYesterdayPct: revenueYesterday.rows[0].rev > 0
      ? ((revenueToday.rows[0].rev - revenueYesterday.rows[0].rev) / revenueYesterday.rows[0].rev) * 100
      : 0,
    activeDeliveries: 0,
    openTickets: tickets.rows[0].c,
  };

  const data: PlatformAnalytics = { kpis, daily: [], activity: [] };
  return NextResponse.json({ data });
}
