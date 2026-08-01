import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireUser, readBody, fail } from '@/lib/api-helpers';
import {
  toDashboardOrder,
  buildCustomerTimeline,
  normalizeOrderStatus,
  type StoreRow,
} from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const orders = await query<{
    id: string;
    orderNumber: string;
    status: string;
    "createdAt": string;
    total: number;
    quantity: number;
    itemName: string;
    storeName: string;
    storeId: string;
    "estimatedDelivery": string | null;
  }>(
    `SELECT o.id, o."orderNumber", o.status, o."createdAt"::text, o.total,
            COALESCE(SUM(oi.quantity),1)::int AS quantity,
            (SELECT oi2.name FROM "order_items" oi2 WHERE oi2."orderId" = o.id LIMIT 1) AS "itemName",
            s."storeName", o."sellerId" AS "storeId", o."deliveredAt"::text AS "estimatedDelivery"
     FROM "orders" o
     JOIN "sellers" s ON s.id = o."sellerId"
     LEFT JOIN "order_items" oi ON oi."orderId" = o.id
     WHERE o."userId" = $1
     GROUP BY o.id, s."storeName"
     ORDER BY o."createdAt" DESC`,
    [guarded.user.id],
  );

  const data = orders.rows.map((o) =>
    toDashboardOrder({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      placedAt: o.createdAt,
      storeName: o.storeName,
      storeId: o.storeId,
      itemName: o.itemName ?? 'Print order',
      quantity: o.quantity,
      total: o.total,
      estimatedDelivery: o.estimatedDelivery,
      timeline: buildCustomerTimeline(normalizeOrderStatus(o.status), o.createdAt),
    }),
  );

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const body = await readBody<{
    storeId?: string;
    serviceName?: string;
    quantity?: number;
    total?: number;
    addressId?: string;
    deliverySpeed?: string;
    notes?: string;
    items?: { name: string; quantity: number; unitPrice: number }[];
  }>(req);
  const { storeId, serviceName, quantity, total, addressId, deliverySpeed, notes, items } = body;

  if (!storeId) return fail('storeId is required');
  const seller = await query<StoreRow>(
    `SELECT id, "storeName" FROM "sellers" WHERE id = $1 AND status = 'APPROVED'`,
    [storeId],
  );
  if (!seller.rowCount) return fail('Store not found', 404);

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const subtotal = total ?? 0;
  const tax = Math.round(subtotal * 0.18);
  const deliveryFee = deliverySpeed && deliverySpeed !== 'standard' ? 50 : 0;
  const grandTotal = subtotal + tax + deliveryFee;

  const inserted = await query(
    `INSERT INTO "orders"
      ("orderNumber","userId","sellerId",status,"paymentStatus",subtotal,tax,"deliveryFee",total,"addressId","deliverySpeed","deliveryNotes")
     VALUES ($1,$2,$3,'PENDING','UNPAID',$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, "orderNumber", "createdAt"::text`,
    [
      orderNumber,
      guarded.user.id,
      storeId,
      subtotal,
      tax,
      deliveryFee,
      grandTotal,
      addressId ?? null,
      deliverySpeed ?? 'standard',
      notes ?? null,
    ],
  );
  const order = inserted.rows[0];

  const lineItems = items?.length ? items : [{ name: serviceName ?? 'Print order', quantity: quantity ?? 1, unitPrice: subtotal }];
  for (const item of lineItems) {
    await query(
      `INSERT INTO "order_items" ("orderId", name, quantity, "unitPrice", "totalPrice")
       VALUES ($1,$2,$3,$4,$5)`,
      [order.id, item.name, item.quantity, item.unitPrice, item.unitPrice * item.quantity],
    );
  }
  await query(
    `INSERT INTO "order_timeline" ("orderId", status, label) VALUES ($1,'PLACED','Order placed')`,
    [order.id],
  );

  return NextResponse.json({ data: { id: order.orderNumber, orderId: order.id } }, { status: 201 });
}
