import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireSeller } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireSeller(req.headers);
  if ('response' in guarded) return guarded.response;

  const result = await query<{
    id: string;
    amount: number;
    status: string;
    "createdAt": string;
    period: string | null;
  }>(
    `SELECT id, amount, status, "createdAt"::text, period
     FROM "payouts" WHERE "sellerId" = $1 ORDER BY "createdAt" DESC`,
    [guarded.sellerId],
  );

  const data = result.rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    status: (r.status === 'paid' ? 'paid' : r.status === 'processing' ? 'processing' : 'pending') as
      | 'paid'
      | 'pending'
      | 'processing',
    date: r.createdAt,
    ordersIncluded: 0,
    bankAccount: '●●●●••••',
  }));

  return NextResponse.json({ data });
}
