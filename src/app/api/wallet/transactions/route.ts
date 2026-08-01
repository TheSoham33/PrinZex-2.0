import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireUser } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const result = await query<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    amount: number;
    "createdAt": string;
  }>(
    `SELECT id, type, title, description, amount, "createdAt"::text
     FROM "transactions" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 100`,
    [guarded.user.id],
  );

  const data = result.rows.map((t) => ({
    id: t.id,
    type: t.type as 'credit' | 'debit',
    title: t.title,
    description: t.description ?? '',
    amount: t.amount,
    date: t.createdAt,
  }));

  return NextResponse.json({ data });
}
