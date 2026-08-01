import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireSeller } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireSeller(req.headers);
  if ('response' in guarded) return guarded.response;

  const result = await query<{
    id: string;
    name: string;
    price: number;
    priceUnit: string | null;
  }>(
    `SELECT id, name, price, "priceUnit" FROM "services"
     WHERE "sellerId" = $1 ORDER BY name`,
    [guarded.sellerId],
  );

  const data = result.rows.map((r) => ({
    serviceId: r.id,
    serviceName: r.name,
    basePrice: r.price,
    unit: r.priceUnit ?? 'per page',
  }));

  return NextResponse.json({ data });
}
