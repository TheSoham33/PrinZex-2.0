import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole, fail } from '@/lib/api-helpers';
import type { AdminSeller, SellerOrderRow, SellerReviewRow, SellerPayoutRow } from '@/lib/types/admin-sellers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;
  const { id } = await params;

  const seller = await query<{
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    phone: string | null;
    city: string | null;
    status: string;
    "commissionRate": number;
    "createdAt": string;
  }>(`SELECT * FROM "sellers" WHERE id=$1`, [id]);
  if (!seller.rowCount) return fail('Seller not found', 404);
  const s = seller.rows[0];

  const services = await query<{ name: string }>(`SELECT name FROM "services" WHERE "sellerId"=$1`, [id]);
  const orders = await query<{ "orderNumber": string; customer: string; service: string; total: number; status: string; "createdAt": string }>(
    `SELECT o."orderNumber", u.name AS customer,
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId"=o.id LIMIT 1) AS service,
            o.total, o.status, o."createdAt"::text
     FROM "orders" o JOIN "users" u ON u.id=o."userId" WHERE o."sellerId"=$1 ORDER BY o."createdAt" DESC`,
    [id],
  );
  const orderRows: SellerOrderRow[] = orders.rows.map((o) => ({
    id: o.orderNumber,
    customer: o.customer,
    service: o.service ?? 'Print order',
    total: o.total,
    status: o.status,
    placedAt: o.createdAt,
  }));

  const reviews = await query<{ id: string; customer: string; rating: number; body: string | null; "createdAt": string }>(
    `SELECT r.id, u.name AS customer, r.rating, r.body, r."createdAt"::text FROM "reviews" r JOIN "users" u ON u.id=r."userId" WHERE r."sellerId"=$1 ORDER BY r."createdAt" DESC`,
    [id],
  );
  const reviewRows: SellerReviewRow[] = reviews.rows.map((r) => ({
    id: r.id,
    customer: r.customer,
    rating: r.rating,
    comment: r.body ?? '',
    date: r.createdAt,
  }));

  const payouts = await query<{ id: string; amount: number; status: string; "createdAt": string }>(
    `SELECT id,amount,status,"createdAt"::text FROM "payouts" WHERE "sellerId"=$1 ORDER BY "createdAt" DESC`,
    [id],
  );
  const payoutRows: SellerPayoutRow[] = payouts.rows.map((p) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    date: p.createdAt,
  }));

  const data: AdminSeller = {
    id: s.id,
    storeName: s.storeName,
    ownerName: s.ownerName,
    email: s.email,
    phone: s.phone ?? '',
    city: s.city ?? '',
    address: `${s.city ?? ''}, India`,
    servicesCount: services.rows.length,
    services: services.rows.map((sv) => sv.name),
    totalOrders: orderRows.length,
    totalRevenue: orderRows.reduce((sum, o) => sum + o.total, 0),
    rating: reviews.rows.length ? Math.round(reviews.rows.reduce((sum, r) => sum + r.rating, 0) / reviews.rows.length * 10) / 10 : 0,
    status: (s.status.toLowerCase() as AdminSeller['status']),
    joinedAt: s.createdAt,
    commissionRate: s.commissionRate,
    completionRate: 0,
    onTimeDeliveryPct: 0,
    totalPaidOut: payoutRows.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pendingBalance: 0,
    documents: [],
    orders: orderRows,
    reviews: reviewRows,
    payouts: payoutRows,
  };

  return NextResponse.json({ data });
}
