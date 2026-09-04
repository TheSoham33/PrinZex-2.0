-- Perfect Binding is Glue Binding (owner decision: the name vendors use).
-- The serviceId stays 'bind-perfect' so seller services, order history and
-- the bind-* pricing branch are untouched — this is a display rename of the
-- catalogue row plus each seller's stored service name copy. Idempotent:
-- rows already renamed keep their values.
UPDATE "CatalogEntry"
SET data = (
  SELECT jsonb_agg(
    CASE
      WHEN cat->>'id' = 'binding'
      THEN jsonb_set(cat, '{services}', (
        SELECT jsonb_agg(
          CASE
            WHEN svc->>'id' = 'bind-perfect'
            THEN jsonb_set(svc, '{name}', '"Glue Binding"')
            ELSE svc
          END
        )
        FROM jsonb_array_elements(cat->'services') AS svc
      ))
      ELSE cat
    END
  )
  FROM jsonb_array_elements(data) AS cat
),
"updatedAt" = NOW()
WHERE key = 'service-categories';

-- SellerService stores its own name copy from the catalogue; sync existing
-- rows so customers see Glue Binding at stores that already offer it.
-- Historical OrderItem productName snapshots stay as ordered (correct).
UPDATE "SellerService"
SET "serviceName" = 'Glue Binding'
WHERE "serviceId" = 'bind-perfect' AND "serviceName" = 'Perfect Binding';
