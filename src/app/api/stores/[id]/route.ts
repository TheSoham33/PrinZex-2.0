import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { toStoreDetail, type StoreRow, type ServiceRow, type ReviewRow } from '@/lib/mappers';
import { fail } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const seller = await query<StoreRow>(
    `SELECT id, "storeName", "storeLogo", "storeBanner", city, status, "commissionRate"
     FROM "sellers" WHERE id = $1 AND status = 'APPROVED'`,
    [id],
  );
  if (!seller.rowCount) return fail('Store not found', 404);
  const row = seller.rows[0];

  const services = await query<ServiceRow>(
    `SELECT id, name, description, price, "priceUnit"
     FROM "services" WHERE "sellerId" = $1 AND active = true`,
    [id],
  );

  const reviews = await query<ReviewRow>(
    `SELECT r.id, r.rating, r.title, r.body, r."createdAt"::text, u.name
     FROM "reviews" r JOIN "users" u ON u.id = r."userId"
     WHERE r."sellerId" = $1 ORDER BY r."createdAt" DESC LIMIT 50`,
    [id],
  );

  const store = toStoreDetail(row, services.rows, reviews.rows);
  return NextResponse.json({ data: store });
}
