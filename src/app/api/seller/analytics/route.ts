import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireSeller } from '@/lib/api-helpers';
import type { SellerAnalytics } from '@/lib/types/seller-analytics';

export const dynamic = 'force-dynamic';

const DAYS = 60;

function emptySeries(): { date: string; revenue: number; orders: number }[] {
  const rows: { date: string; revenue: number; orders: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    rows.push({ date: date.toISOString().slice(0, 10), revenue: 0, orders: 0 });
  }
  return rows;
}

export async function GET(req: Request) {
  const guarded = await requireSeller(req.headers);
  if ('response' in guarded) return guarded.response;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DAYS - 1));

  const agg = await query<{
    total: number;
    status: string;
    "createdAt": string;
    "itemName": string;
  }>(
    `SELECT o.total, o.status, o."createdAt"::text,
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId" = o.id LIMIT 1) AS "itemName"
     FROM "orders" o WHERE o."sellerId" = $1 AND o."createdAt" >= $2`,
    [guarded.sellerId, start.toISOString()],
  );

  const orders = agg.rows;
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  const serviceCount = new Map<string, number>();

  for (const row of orders) {
    const day = row.createdAt.slice(0, 10);
    const bucket = dayMap.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue += Number(row.total);
    bucket.orders += 1;
    dayMap.set(day, bucket);
    serviceCount.set(row.itemName ?? 'Print order', (serviceCount.get(row.itemName ?? 'Print order') ?? 0) + 1);
  }

  const revenueByDay = emptySeries().map((entry) => {
    const bucket = dayMap.get(entry.date);
    return bucket ? { ...entry, revenue: bucket.revenue, orders: bucket.orders } : entry;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;

  const reviewAvg = await query(
    `SELECT COALESCE(AVG(rating),0)::float AS avg FROM "reviews" WHERE "sellerId" = $1`,
    [guarded.sellerId],
  );

  const serviceBreakdown = Array.from(serviceCount.entries()).map(([service, count]) => ({
    service,
    count,
    revenue: 0,
  }));

  const data: SellerAnalytics = {
    totalRevenueThisMonth: totalRevenue,
    totalOrdersThisMonth: totalOrders,
    averageOrderValue: avgOrderValue,
    completionRate: totalOrders ? Math.round((delivered / totalOrders) * 100) : 0,
    averageRating: Number(reviewAvg.rows[0]?.avg ?? 0),
    onTimeDeliveryPct: totalOrders ? Math.round((delivered / totalOrders) * 100) : 0,
    revenueByDay,
    ordersByDay: revenueByDay,
    serviceBreakdown,
  };

  return NextResponse.json({ data });
}
