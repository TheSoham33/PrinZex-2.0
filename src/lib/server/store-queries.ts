import { query } from '@/lib/db/postgres';
import { toStoreDetail, type StoreRow, type ServiceRow, type ReviewRow } from '@/lib/mappers';
import type { StoreDetail } from '@/lib/types/stores';

/**
 * Server-side store lookup for the dynamic store-detail routes. Queries
 * PostgreSQL directly (no HTTP round-trip) and returns null when the store
 * doesn't exist or the database is unreachable during a cold start.
 */
export async function getStoreDetail(id: string): Promise<StoreDetail | null> {
  try {
    const seller = await query<StoreRow>(
      `SELECT id, "storeName", "storeLogo", "storeBanner", city, status, "commissionRate"
       FROM "sellers" WHERE id = $1 AND status = 'APPROVED'`,
      [id],
    );
    if (!seller.rowCount) return null;
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

    return toStoreDetail(row, services.rows, reviews.rows);
  } catch {
    return null;
  }
}
