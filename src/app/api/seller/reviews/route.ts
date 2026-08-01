import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireSeller } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireSeller(req.headers);
  if ('response' in guarded) return guarded.response;

  const result = await query<{
    id: string;
    rating: number;
    body: string | null;
    "createdAt": string;
    name: string | null;
    response: string | null;
  }>(
    `SELECT r.id, r.rating, r.body, r."createdAt"::text, u.name, r.response
     FROM "reviews" r JOIN "users" u ON u.id = r."userId"
     WHERE r."sellerId" = $1 ORDER BY r."createdAt" DESC`,
    [guarded.sellerId],
  );

  const data = result.rows.map((r) => ({
    id: r.id,
    customerName: r.name ?? 'Customer',
    avatarInitials: (r.name ?? 'C')
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    rating: r.rating,
    date: r.createdAt,
    comment: r.body ?? '',
    reply: r.response,
  }));

  return NextResponse.json({ data });
}
