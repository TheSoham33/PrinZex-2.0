import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireSeller, fail } from '@/lib/api-helpers';
import { toSellerOrder } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guarded = await requireSeller(req.headers);
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
    customerName: string;
    customerPhone: string;
    specifications: string;
  }>(
    `SELECT o.id, o."orderNumber", o.status, o."createdAt"::text, o.total,
            COALESCE((SELECT SUM(oi.quantity) FROM "order_items" oi WHERE oi."orderId" = o.id),1)::int AS quantity,
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId" = o.id LIMIT 1) AS "itemName",
            u.name AS "customerName", u.phone AS "customerPhone",
            COALESCE((SELECT oi.specs::text FROM "order_items" oi WHERE oi."orderId" = o.id LIMIT 1), '') AS specifications
     FROM "orders" o JOIN "users" u ON u.id = o."userId"
     WHERE o."sellerId" = $1 AND (o."orderNumber" = $2 OR o.id = $2)`,
    [guarded.sellerId, id],
  );
  if (!result.rowCount) return fail('Order not found', 404);

  const o = result.rows[0];
  return NextResponse.json({
    data: toSellerOrder({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      itemName: o.itemName ?? 'Print order',
      specifications: o.specifications,
      quantity: o.quantity,
      total: o.total,
      status: o.status,
      placedAt: o.createdAt,
    }),
  });
}
