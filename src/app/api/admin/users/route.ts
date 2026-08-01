import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole } from '@/lib/api-helpers';
import type { PlatformUser } from '@/lib/types/admin-users';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;

  const users = await query<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    "createdAt": string;
    orderCount: number;
    balance: number;
  }>(
    `SELECT u.id, u.name, u.email, u.phone, u.status, u."createdAt"::text,
            (SELECT COUNT(*)::int FROM "orders" o WHERE o."userId"=u.id) AS "orderCount",
            COALESCE((SELECT w.balance FROM "wallets" w WHERE w."userId"=u.id),0)::float AS balance
     FROM "users" u WHERE u.role='CUSTOMER' ORDER BY u."createdAt" DESC`,
  );

  const data: PlatformUser[] = users.rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    joinedAt: u.createdAt,
    ordersPlaced: u.orderCount,
    walletBalance: u.balance,
    status: u.status === 'BLOCKED' ? 'blocked' : 'active',
    lastLogin: '',
    lastDevice: '',
    lastIp: '',
    addresses: [],
    recentOrders: [],
    recentTransactions: [],
  }));

  return NextResponse.json({ data });
}
