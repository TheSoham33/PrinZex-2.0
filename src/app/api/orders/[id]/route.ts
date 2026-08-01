import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireUser, fail } from '@/lib/api-helpers';
import {
  toDashboardOrder,
  buildCustomerTimeline,
  normalizeOrderStatus,
} from '@/lib/mappers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;
  const { id } = await params;

  const result = await query<{
    id: string;
    orderNumber: string;
    status: string;
    "createdAt": string;
    total: number;
    quantity: number;
    itemName: string;
    storeName: string;
    storeId: string;
    "deliveredAt": string | null;
  }>(
    `SELECT o.id, o."orderNumber", o.status, o."createdAt"::text, o.total,
            COALESCE((SELECT SUM(oi.quantity) FROM "order_items" oi WHERE oi."orderId" = o.id),1)::int AS quantity,
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId" = o.id LIMIT 1) AS "itemName",
            s."storeName", o."sellerId" AS "storeId", o."deliveredAt"::text
     FROM "orders" o JOIN "sellers" s ON s.id = o."sellerId"
     WHERE o."userId" = $1 AND (o."orderNumber" = $2 OR o.id = $2)`,
    [guarded.user.id, id],
  );
  if (!result.rowCount) return fail('Order not found', 404);

  const o = result.rows[0];
  const data = toDashboardOrder({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    placedAt: o.createdAt,
    storeName: o.storeName,
    storeId: o.storeId,
    itemName: o.itemName ?? 'Print order',
    quantity: o.quantity,
    total: o.total,
    estimatedDelivery: o.deliveredAt,
    timeline: buildCustomerTimeline(normalizeOrderStatus(o.status), o.createdAt),
  });

  return NextResponse.json({ data });
}
