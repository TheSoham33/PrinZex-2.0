import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole, fail } from '@/lib/api-helpers';
import type { PlatformUser, UserOrderSummary, UserTransaction, UserAddress } from '@/lib/types/admin-users';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;
  const { id } = await params;

  const user = await query<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    "createdAt": string;
  }>(`SELECT id,name,email,phone,status,"createdAt"::text FROM "users" WHERE id=$1`, [id]);
  if (!user.rowCount) return fail('User not found', 404);
  const u = user.rows[0];

  const orders = await query<{
    "orderNumber": string;
    "storeName": string;
    service: string;
    total: number;
    status: string;
    "createdAt": string;
  }>(
    `SELECT o."orderNumber", s."storeName",
            (SELECT oi.name FROM "order_items" oi WHERE oi."orderId"=o.id LIMIT 1) AS service,
            o.total, o.status, o."createdAt"::text
     FROM "orders" o JOIN "sellers" s ON s.id=o."sellerId"
     WHERE o."userId"=$1 ORDER BY o."createdAt" DESC`,
    [id],
  );
  const recentOrders: UserOrderSummary[] = orders.rows.map((o) => ({
    id: o.orderNumber,
    storeName: o.storeName,
    serviceName: o.service ?? 'Print order',
    total: o.total,
    status: o.status,
    placedAt: o.createdAt,
  }));

  const txn = await query<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    amount: number;
    "createdAt": string;
  }>(`SELECT id,type,title,description,amount,"createdAt"::text FROM "transactions" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 20`, [id]);
  const recentTransactions: UserTransaction[] = txn.rows.map((t) => ({
    id: t.id,
    type: t.type as 'credit' | 'debit',
    description: t.description ?? t.title,
    amount: t.amount,
    date: t.createdAt,
  }));

  const addresses = await query<{ id: string; label: string | null; street: string; city: string; state: string; pincode: string }>(
    `SELECT id,label,street,city,state,pincode FROM "addresses" WHERE "userId"=$1`, [id]);
  const addrList: UserAddress[] = addresses.rows.map((a) => ({
    id: a.id,
    label: a.label ?? 'Address',
    fullAddress: `${a.street}, ${a.city}, ${a.state} ${a.pincode}`,
  }));

  const balance = await query(`SELECT COALESCE((SELECT balance FROM "wallets" WHERE "userId"=$1),0)::float AS b`, [id]);

  const data: PlatformUser = {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    joinedAt: u.createdAt,
    ordersPlaced: recentOrders.length,
    walletBalance: balance.rows[0].b,
    status: u.status === 'BLOCKED' ? 'blocked' : 'active',
    lastLogin: '',
    lastDevice: '',
    lastIp: '',
    addresses: addrList,
    recentOrders,
    recentTransactions,
  };

  return NextResponse.json({ data });
}
