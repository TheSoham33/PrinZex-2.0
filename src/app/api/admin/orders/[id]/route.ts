import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole, fail } from '@/lib/api-helpers';
import { normalizeAdminOrderStatus, buildAdminTimeline } from '@/lib/mappers';
import type { AdminOrder } from '@/lib/types/admin-orders';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
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
    customerId: string;
    storeName: string;
    storeId: string;
  }>(
    `SELECT o.id, o."orderNumber", o.status, o."createdAt"::text, o.total,
            COALESCE((SELECT SUM(oi.quantity) FROM "order_items" oi WHERE oi."orderId"=o.id),1)::int AS quantity,
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId"=o.id LIMIT 1) AS "itemName",
            u.name AS "customerName", o."userId" AS "customerId",
            s."storeName", o."sellerId" AS "storeId"
     FROM "orders" o JOIN "users" u ON u.id=o."userId" JOIN "sellers" s ON s.id=o."sellerId"
     WHERE o."orderNumber"=$1 OR o.id=$1`,
    [id],
  );
  if (!result.rowCount) return fail('Order not found', 404);

  const o = result.rows[0];
  const status = normalizeAdminOrderStatus(o.status);
  const data: AdminOrder = {
    id: o.orderNumber,
    customerName: o.customerName,
    customerId: o.customerId,
    storeName: o.storeName,
    storeId: o.storeId,
    serviceName: o.itemName ?? 'Print order',
    specifications: '',
    fileName: '',
    quantity: o.quantity,
    total: o.total,
    status,
    placedAt: o.createdAt,
    isRush: false,
    address: '',
    deliverySpeed: 'standard',
    deliveryBoyId: null,
    deliveryBoyName: null,
    refunded: false,
    refundAmount: 0,
    dispute: null,
    timeline: buildAdminTimeline(status, o.createdAt),
  };

  return NextResponse.json({ data });
}
