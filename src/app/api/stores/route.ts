import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { toStore, type StoreRow, type ServiceRow } from '@/lib/mappers';
import { cacheGet, cacheSet } from '@/lib/db/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cached = await cacheGet<unknown>('stores:list');
  if (cached) return NextResponse.json({ data: cached });

  const sellers = await query<StoreRow>(
    `SELECT id, "storeName", "storeLogo", "storeBanner", city, status, "commissionRate"
     FROM "sellers" WHERE status = 'APPROVED' ORDER BY "createdAt" DESC`,
  );
  const services = await query<ServiceRow & { sellerId: string }>(
    `SELECT id, "sellerId", name, description, price, "priceUnit"
     FROM "services" WHERE active = true`,
  );

  const bySeller = new Map<string, ServiceRow[]>();
  for (const s of services.rows) {
    if (!bySeller.has(s.sellerId)) bySeller.set(s.sellerId, []);
    bySeller.get(s.sellerId)!.push(s);
  }

  const stores = sellers.rows.map((seller) =>
    toStore(seller, bySeller.get(seller.id) ?? []),
  );

  await cacheSet('stores:list', stores, 60);
  return NextResponse.json({ data: stores });
}
