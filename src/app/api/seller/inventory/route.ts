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
    category: string | null;
    quantity: number;
    unit: string | null;
    "minStock": number;
    "createdAt": string;
  }>(
    `SELECT id, name, category, quantity, unit, "minStock", "createdAt"::text
     FROM "inventory_items" WHERE "sellerId" = $1 ORDER BY name`,
    [guarded.sellerId],
  );

  const data = result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? 'Paper',
    currentStock: r.quantity,
    unit: r.unit ?? 'reams',
    lowStockThreshold: r.minStock,
    lastRestocked: r.createdAt,
  }));

  return NextResponse.json({ data });
}
