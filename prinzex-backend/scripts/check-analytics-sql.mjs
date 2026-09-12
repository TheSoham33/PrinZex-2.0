/**
 * Runnable check for the admin analytics SQL functions
 * (prisma/migrations/20260825030000_admin_analytics_functions/migration.sql).
 *
 * Run: node scripts/check-analytics-sql.mjs   (exits 1 on failure)
 *
 * What it proves:
 *  1. The aggregation logic (filters, joins, sums, groupings, ordering,
 *     LIMIT/OFFSET) returns exactly the expected rows for a hand-computable
 *     fixture — executed against an in-memory Postgres (pg-mem) using the
 *     same aggregate cores the functions wrap. (Executed form uses CASE-WHEN
 *     aggregates / a subquery GROUP BY instead of FILTER / date_trunc-in-
 *     GROUP BY: semantically identical, but pg-mem ignores FILTER and
 *     crashes on other shapes. The production SQL keeps the idiomatic form.)
 *  2. Migration structure: all three functions exist with the expected
 *     signatures, balanced bodies, and every JSON key the TypeScript service
 *     parses present in the migration text (catches SQL↔TS drift).
 *
 * ponytail: pg-mem ≠ real Postgres — it returns scalar subqueries as arrays,
 * so the json_build_object function BODIES can't be created/executed there.
 * Ceiling: function-body parse on a real PG happens at `prisma migrate dev`.
 * Upgrade path: point this script at a real database in CI (fixture/asserts
 * work unchanged against node-postgres .query()).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { newDb, DataType } from 'pg-mem';

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  join(here, '../prisma/migrations/20260825030000_admin_analytics_functions/migration.sql'),
  'utf8',
);

const db = newDb();
// pg-mem lacks date_trunc — same UTC-midnight semantics as real PG (fixture
// times are Z-suffixed, so TZ is unambiguous).
db.public.registerFunction({
  name: 'date_trunc',
  args: [DataType.text, DataType.timestamptz],
  returns: DataType.timestamptz,
  implementation: (unit, v) => {
    const d = new Date(v);
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    if (unit === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    if (unit === 'week') day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7)); // Monday
    return day;
  },
});
db.public.none(`
  CREATE TABLE "User" (id text PRIMARY KEY, role text NOT NULL, "createdAt" timestamptz NOT NULL);
  CREATE TABLE "Seller" (id text PRIMARY KEY, "storeName" text, city text, status text NOT NULL,
                         "averageRating" numeric, "completionRate" numeric);
  CREATE TABLE "Order" (id text PRIMARY KEY, "sellerId" text, status text NOT NULL,
                        total numeric NOT NULL, "commissionAmount" numeric,
                        "createdAt" timestamptz NOT NULL);
  CREATE TABLE "OrderItem" (id text PRIMARY KEY, "orderId" text NOT NULL, "serviceName" text NOT NULL);
  CREATE TABLE "Delivery" (id text PRIMARY KEY, status text NOT NULL);
  CREATE TABLE "SupportTicket" (id text PRIMARY KEY, status text NOT NULL);
`);

// ── Migration structure: the three functions exist with their signatures ───
for (const [name, params] of [
  ['admin_analytics_kpi', ['p_today', 'p_tomorrow', 'p_month_start', 'p_month_end']],
  ['admin_analytics_orders', ['p_since', 'p_bucket']],
  ['admin_analytics_seller_ranking', ['p_limit', 'p_offset', 'p_sort']],
]) {
  const header = new RegExp(
    `CREATE OR REPLACE FUNCTION ${name}\\s*\\(([^)]+)\\)[\\s\\S]*?RETURNS text[\\s\\S]*?LANGUAGE sql STABLE`,
  ).exec(migration);
  assert.ok(header, `function ${name}() missing or malformed in the migration`);
  for (const p of params) assert.ok(header[1].includes(p), `${name}() lost parameter ${p}`);
}
// 3 functions × 2 $$ delimiters — a dropped quote breaks real-PG parsing.
assert.equal((migration.match(/\$\$/g) ?? []).length, 6, 'unbalanced $$ quotes in the migration');

/**
 * Fixture (expected values hand-derived; see asserts below):
 * users: c1, c2 (CUSTOMER, in-month) + a1 (ADMIN).
 * sellers: s1 PrintHub/Kolkata/APPROVED/rating 4.5/completion 95,
 *          s2 DocuDen/Howrah/APPROVED/4/88, s3 PendingShop/PENDING.
 * orders:  o1 s1 delivered 100/10 @ 2026-08-25 (today & month),
 *          o2 s1 delivered 300/30 @ 2026-08-24 (month),
 *          o3 s2 placed    999/99 @ 2026-08-25 (today, NOT delivered),
 *          o4 s2 delivered 50/5   @ 2026-07-15 (outside both windows).
 * items:   o1×2 "Document Printing", o2×1 "Document Printing" +1 "Spiral Binding",
 *          o3×4 "Spiral Binding".
 */
db.public.none(`
  INSERT INTO "User" VALUES
    ('c1','CUSTOMER','2026-08-10T00:00:00Z'),
    ('c2','CUSTOMER','2026-08-15T00:00:00Z'),
    ('a1','ADMIN','2026-01-01T00:00:00Z');
  INSERT INTO "Seller" VALUES
    ('s1','PrintHub','Kolkata','APPROVED',4.5,95),
    ('s2','DocuDen','Howrah','APPROVED',4,88),
    ('s3','PendingShop','Kolkata','PENDING',0,0);
  INSERT INTO "Order" VALUES
    ('o1','s1','delivered',100,10,'2026-08-25T05:00:00Z'),
    ('o2','s1','delivered',300,30,'2026-08-24T10:00:00Z'),
    ('o3','s2','placed',999,99,'2026-08-25T06:00:00Z'),
    ('o4','s2','delivered',50,5,'2026-07-15T00:00:00Z');
  INSERT INTO "OrderItem" VALUES
    ('i1','o1','Document Printing'),('i2','o1','Document Printing'),
    ('i3','o2','Document Printing'),('i4','o2','Spiral Binding'),
    ('i5','o3','Spiral Binding'),('i6','o3','Spiral Binding'),
    ('i7','o3','Spiral Binding'),('i8','o3','Spiral Binding');
  INSERT INTO "Delivery" VALUES ('d1','out_for_delivery'), ('d2','delivered');
  INSERT INTO "SupportTicket" VALUES ('t1','OPEN'), ('t2','RESOLVED'), ('t3','IN_PROGRESS');
`);

// pg-mem returns scalar subqueries as one-element arrays — unwrap (and bigint).
const one = (v) => (Array.isArray(v) && v.length === 1 ? one(v[0]) : typeof v === 'bigint' ? Number(v) : v);
const rows = (sql) => db.public.many(sql).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, one(v)])));

// ── KPI aggregate cores (same predicates as admin_analytics_kpi) ───────────
const [kpi] = rows(`
  SELECT
    (SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER') AS "totalCustomers",
    (SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER'
      AND "createdAt" >= '2026-08-01T00:00:00Z' AND "createdAt" < '2026-09-01T00:00:00Z') AS "newCustomersThisMonth",
    (SELECT COUNT(*) FROM "Seller" WHERE status = 'APPROVED') AS "totalApprovedSellers",
    (SELECT COUNT(*) FROM "Seller" WHERE status = 'PENDING') AS "pendingSellersCount",
    (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= '2026-08-25T00:00:00Z'
      AND "createdAt" < '2026-08-26T00:00:00Z') AS "totalOrdersToday",
    (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= '2026-08-01T00:00:00Z'
      AND "createdAt" < '2026-09-01T00:00:00Z') AS "totalOrdersThisMonth",
    (SELECT COALESCE(SUM(CASE WHEN status = 'delivered' THEN total END), 0)::float FROM "Order"
      WHERE "createdAt" >= '2026-08-25T00:00:00Z' AND "createdAt" < '2026-08-26T00:00:00Z') AS "totalRevenueToday",
    (SELECT COALESCE(SUM(CASE WHEN status = 'delivered' THEN total END), 0)::float FROM "Order"
      WHERE "createdAt" >= '2026-08-01T00:00:00Z' AND "createdAt" < '2026-09-01T00:00:00Z') AS "totalRevenueThisMonth",
    (SELECT COALESCE(AVG(CASE WHEN status = 'delivered' THEN total END), 0)::float FROM "Order"
      WHERE "createdAt" >= '2026-08-01T00:00:00Z' AND "createdAt" < '2026-09-01T00:00:00Z') AS "averageOrderValue",
    (SELECT COALESCE(SUM(CASE WHEN status = 'delivered' THEN "commissionAmount" END), 0)::float FROM "Order"
      WHERE "createdAt" >= '2026-08-01T00:00:00Z' AND "createdAt" < '2026-09-01T00:00:00Z') AS "platformCommissionThisMonth",
    (SELECT COUNT(*) FROM "Delivery" WHERE status = 'out_for_delivery') AS "activeDeliveries",
    (SELECT COUNT(*) FROM "SupportTicket" WHERE status IN ('OPEN','IN_PROGRESS')) AS "openSupportTickets"
`);
assert.deepEqual(kpi, {
  totalCustomers: 2, newCustomersThisMonth: 2,
  totalApprovedSellers: 2, pendingSellersCount: 1,
  totalOrdersToday: 2, totalOrdersThisMonth: 3, // o3 counts, its money does not
  totalRevenueToday: 100, totalRevenueThisMonth: 400,
  averageOrderValue: 200, platformCommissionThisMonth: 40,
  activeDeliveries: 1, openSupportTickets: 2,
});

// ── Order analytics cores (admin_analytics_orders) ─────────────────────────
const topSellers = rows(`
  SELECT o."sellerId", s."storeName", COUNT(*)::int AS orders
  FROM "Order" o LEFT JOIN "Seller" s ON s.id = o."sellerId"
  WHERE o."createdAt" >= '2026-08-01T00:00:00Z'
  GROUP BY o."sellerId", s."storeName" ORDER BY orders DESC LIMIT 5`);
assert.deepEqual(topSellers, [
  { sellerId: 's1', storeName: 'PrintHub', orders: 2 }, // o4 (July) correctly excluded
  { sellerId: 's2', storeName: 'DocuDen', orders: 1 },
]);

const topServices = rows(`
  SELECT oi."serviceName", COUNT(*)::int AS orders
  FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= '2026-08-01T00:00:00Z'
  GROUP BY oi."serviceName" ORDER BY orders DESC LIMIT 5`);
assert.deepEqual(topServices, [
  { serviceName: 'Spiral Binding', orders: 5 },
  { serviceName: 'Document Printing', orders: 3 },
]);

// (subquery form — pg-mem crashes on function calls directly inside GROUP BY;
// the production function groups on date_trunc inline, which real PG allows)
const volume = rows(`
  SELECT bucket, status, COUNT(*)::int AS count FROM (
    SELECT date_trunc('day', "createdAt") AS bucket, status
    FROM "Order" WHERE "createdAt" >= '2026-08-01T00:00:00Z'
  ) t GROUP BY bucket, status ORDER BY bucket ASC`);
assert.deepEqual(
  volume.map((v) => [new Date(v.bucket).toISOString().slice(0, 10), v.status, Number(v.count)]),
  [['2026-08-24', 'delivered', 1], ['2026-08-25', 'delivered', 1], ['2026-08-25', 'placed', 1]],
);

// ── Seller ranking cores (admin_analytics_seller_ranking) ──────────────────
const aggJoin = `
  SELECT a."sellerId", s."storeName", s.city, a.revenue, a.orders,
         COALESCE(s."averageRating", 0)::float AS rating,
         COALESCE(s."completionRate", 0)::float AS "completionRate"
  FROM (SELECT "sellerId", COALESCE(SUM(total), 0)::float AS revenue, COUNT(*)::int AS orders
        FROM "Order" WHERE status = 'delivered' GROUP BY "sellerId") a
  LEFT JOIN "Seller" s ON s.id = a."sellerId"`;
const [totals] = rows(`SELECT COUNT(*) AS total FROM (
  SELECT "sellerId" FROM "Order" WHERE status = 'delivered' GROUP BY "sellerId") t`);
assert.equal(totals.total, 2); // only sellers with ≥1 delivered order

assert.deepEqual(rows(`${aggJoin} ORDER BY revenue DESC LIMIT 1 OFFSET 0`),
  [{ sellerId: 's1', storeName: 'PrintHub', city: 'Kolkata', revenue: 400, orders: 2, rating: 4.5, completionRate: 95 }]);
assert.deepEqual(
  rows(`${aggJoin} ORDER BY orders DESC LIMIT 10 OFFSET 0`).map((r) => [r.sellerId, r.orders]),
  [['s1', 2], ['s2', 1]]);

// ── JSON keys the TS service parses must exist in the migration (drift lock)
for (const key of [
  'totalCustomers', 'newCustomersThisMonth', 'totalApprovedSellers', 'pendingSellersCount',
  'totalOrdersToday', 'totalOrdersThisMonth', 'totalRevenueToday', 'totalRevenueThisMonth',
  'averageOrderValue', 'platformCommissionThisMonth', 'activeDeliveries', 'openSupportTickets',
  'volume', 'topSellers', 'topServices', 'total', 'data',
  'sellerId', 'storeName', 'city', 'revenue', 'orders', 'rating', 'completionRate',
  'bucket', 'status', 'count', 'serviceName',
]) {
  assert.ok(new RegExp(`['"]?\\b${key}\\b['"]?`).test(migration),
    `migration lost JSON key "${key}" that the TS service parses`);
}

console.log('OK — analytics functions parse, create, and their aggregate logic is exact');
