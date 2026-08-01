import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireRole } from '@/lib/api-helpers';
import type { SellerPayout } from '@/lib/types/admin-payouts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;

  const result = await query<{
    id: string;
    amount: number;
    status: string;
    "createdAt": string;
    storeName: string;
    sellerId: string;
    period: string | null;
  }>(
    `SELECT p.id, p.amount, p.status, p."createdAt"::text, s."storeName", p."sellerId", p.period
     FROM "payouts" p JOIN "sellers" s ON s.id=p."sellerId" ORDER BY p."createdAt" DESC`,
  );

  const data: SellerPayout[] = result.rows.map((p) => ({
    id: p.id,
    storeName: p.storeName,
    sellerId: p.sellerId,
    amount: p.amount,
    ordersIncluded: 0,
    status: p.status as SellerPayout['status'],
    requestedAt: p.createdAt,
    bankAccount: '●●●●••••',
    breakdown: [],
  }));

  return NextResponse.json({ data });
}
