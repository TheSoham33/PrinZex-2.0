-- Hot-path admin analytics live in the database as functions. The service
-- layer calls them with prisma.$queryRaw (bound parameters, no string
-- concatenation) and JSON.parse — one round trip instead of 12/4/3.
-- LANGUAGE sql STABLE: no state changes, planner may inline them.
-- Decimals are cast ::float inside so the API contract (JSON numbers) is
-- unchanged; enum columns compare against literals, no casts needed.

-- 12 parallel count/aggregate queries → one call.
CREATE OR REPLACE FUNCTION admin_analytics_kpi(
  p_today       timestamptz,
  p_tomorrow    timestamptz,
  p_month_start timestamptz,
  p_month_end   timestamptz
)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT json_build_object(
    'totalCustomers',            (SELECT COUNT(*) FROM "User"
                                  WHERE role = 'CUSTOMER'),
    'newCustomersThisMonth',     (SELECT COUNT(*) FROM "User"
                                  WHERE role = 'CUSTOMER'
                                    AND "createdAt" >= p_month_start
                                    AND "createdAt" <  p_month_end),
    'totalApprovedSellers',      (SELECT COUNT(*) FROM "Seller" WHERE status = 'APPROVED'),
    'pendingSellersCount',       (SELECT COUNT(*) FROM "Seller" WHERE status = 'PENDING'),
    'totalOrdersToday',          (SELECT COUNT(*) FROM "Order"
                                  WHERE "createdAt" >= p_today AND "createdAt" < p_tomorrow),
    'totalOrdersThisMonth',      (SELECT COUNT(*) FROM "Order"
                                  WHERE "createdAt" >= p_month_start AND "createdAt" < p_month_end),
    'totalRevenueToday',         (SELECT COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::float
                                  FROM "Order"
                                  WHERE "createdAt" >= p_today AND "createdAt" < p_tomorrow),
    'totalRevenueThisMonth',     (SELECT COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::float
                                  FROM "Order"
                                  WHERE "createdAt" >= p_month_start AND "createdAt" < p_month_end),
    'averageOrderValue',         (SELECT COALESCE(AVG(total) FILTER (WHERE status = 'delivered'), 0)::float
                                  FROM "Order"
                                  WHERE "createdAt" >= p_month_start AND "createdAt" < p_month_end),
    'platformCommissionThisMonth', (SELECT COALESCE(SUM("commissionAmount") FILTER (WHERE status = 'delivered'), 0)::float
                                    FROM "Order"
                                    WHERE "createdAt" >= p_month_start AND "createdAt" < p_month_end),
    'activeDeliveries',          (SELECT COUNT(*) FROM "Delivery" WHERE status = 'out_for_delivery'),
    'openSupportTickets',        (SELECT COUNT(*) FROM "SupportTicket"
                                  WHERE status IN ('OPEN', 'IN_PROGRESS'))
  )::text;
$$;

-- Volume series + top sellers + top services → one call (store names joined
-- in SQL instead of the old groupBy + findMany round trip).
CREATE OR REPLACE FUNCTION admin_analytics_orders(
  p_since  timestamptz,
  p_bucket text
)
RETURNS text
LANGUAGE sql STABLE
AS $$
  WITH volume AS (
    SELECT
      date_trunc(p_bucket, "createdAt") AS bucket,
      status,
      COUNT(*)::int AS count
    FROM "Order"
    WHERE "createdAt" >= p_since
    GROUP BY 1, 2
  ),
  top_sellers AS (
    SELECT o."sellerId", s."storeName", COUNT(*)::int AS orders
    FROM "Order" o
    LEFT JOIN "Seller" s ON s.id = o."sellerId"
    WHERE o."createdAt" >= p_since
    GROUP BY o."sellerId", s."storeName"
    ORDER BY orders DESC
    LIMIT 5
  ),
  top_services AS (
    SELECT oi."serviceName", COUNT(*)::int AS orders
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."createdAt" >= p_since
    GROUP BY oi."serviceName"
    ORDER BY orders DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'volume',      (SELECT COALESCE(json_agg(v.* ORDER BY v.bucket), '[]'::json) FROM volume v),
    'topSellers',  (SELECT COALESCE(json_agg(t.* ORDER BY t.orders DESC), '[]'::json) FROM top_sellers t),
    'topServices', (SELECT COALESCE(json_agg(t.* ORDER BY t.orders DESC), '[]'::json) FROM top_services t)
  )::text;
$$;

-- Revenue/orders seller ranking: grouped, joined, sorted and paginated in
-- one call. The 'rating' sort lives on Seller rows and stays in Prisma.
CREATE OR REPLACE FUNCTION admin_analytics_seller_ranking(
  p_limit  int,
  p_offset int,
  p_sort   text -- 'revenue' | 'orders'
)
RETURNS text
LANGUAGE sql STABLE
AS $$
  WITH agg AS (
    SELECT
      "sellerId",
      COALESCE(SUM(total), 0)::float AS revenue,
      COUNT(*)::int AS orders
    FROM "Order"
    WHERE status = 'delivered'
    GROUP BY "sellerId"
  ),
  ranked AS (
    SELECT
      a."sellerId",
      s."storeName",
      s.city,
      a.revenue,
      a.orders,
      COALESCE(s."averageRating", 0)::float  AS rating,
      COALESCE(s."completionRate", 0)::float AS "completionRate"
    FROM agg a
    LEFT JOIN "Seller" s ON s.id = a."sellerId"
  ),
  page AS (
    SELECT * FROM ranked
    ORDER BY CASE p_sort WHEN 'revenue' THEN revenue ELSE orders END DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM agg),
    'data',  (SELECT COALESCE(json_agg(p.* ORDER BY
                 CASE p_sort WHEN 'revenue' THEN p.revenue ELSE p.orders END DESC
               ), '[]'::json) FROM page p)
  )::text;
$$;
