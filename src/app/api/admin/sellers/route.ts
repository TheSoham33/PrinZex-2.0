import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole } from '@/lib/api-helpers';
import type { AdminSeller } from '@/lib/types/admin-sellers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;

  const sellers = await query<{
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    phone: string | null;
    city: string | null;
    status: string;
    "commissionRate": number;
    "createdAt": string;
    serviceCount: number;
    orderCount: number;
    revenue: number;
    avgRating: number;
  }>(
    `SELECT s.id, s."storeName", s."ownerName", s.email, s.phone, s.city, s.status,
            s."commissionRate", s."createdAt"::text,
            (SELECT COUNT(*)::int FROM "services" sv WHERE sv."sellerId"=s.id) AS "serviceCount",
            (SELECT COUNT(*)::int FROM "orders" o WHERE o."sellerId"=s.id) AS "orderCount",
            (SELECT COALESCE(SUM(o.total),0)::float FROM "orders" o WHERE o."sellerId"=s.id) AS revenue,
            (SELECT COALESCE(AVG(r.rating),0)::float FROM "reviews" r WHERE r."sellerId"=s.id) AS "avgRating"
     FROM "sellers" s ORDER BY s."createdAt" DESC`,
  );

  const data: AdminSeller[] = sellers.rows.map((s) => ({
    id: s.id,
    storeName: s.storeName,
    ownerName: s.ownerName,
    email: s.email,
    phone: s.phone ?? '',
    city: s.city ?? '',
    address: `${s.city ?? ''}, India`,
    servicesCount: s.serviceCount,
    services: [],
    totalOrders: s.orderCount,
    totalRevenue: s.revenue,
    rating: s.avgRating,
    status: (s.status.toLowerCase() as AdminSeller['status']),
    joinedAt: s.createdAt,
    commissionRate: s.commissionRate,
    completionRate: 0,
    onTimeDeliveryPct: 0,
    totalPaidOut: 0,
    pendingBalance: 0,
    documents: [],
    orders: [],
    reviews: [],
    payouts: [],
  }));

  return NextResponse.json({ data });
}
