import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireUser } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const wallet = await query(
    `SELECT balance FROM "wallets" WHERE "userId" = $1`,
    [guarded.user.id],
  );

  const balance = wallet.rowCount ? wallet.rows[0].balance : 0;
  return NextResponse.json({ data: balance });
}
