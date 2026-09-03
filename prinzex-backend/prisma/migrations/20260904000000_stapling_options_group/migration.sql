-- Stapling becomes a dedicated Document Printing option group (mandatory
-- radio with seller-set prices) instead of a finishing add-on. Strip the two
-- stapling rows back out of finishing-options (keep every other entry, in
-- order) and seed the new stapling-options group. ensureCatalogDefaults only
-- inserts missing keys, so existing databases need this one-time move.
UPDATE "CatalogEntry"
SET data = (
  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(data) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'value' NOT IN ('corner-stapling', 'side-stapling')
)
WHERE key = 'finishing-options';

-- "updatedAt" has no DB default (Prisma sets it app-side), so the INSERT
-- must provide it explicitly.
INSERT INTO "CatalogEntry" (key, label, data, "updatedAt")
VALUES (
  'stapling-options',
  'Stapling options (Document Printing)',
  '[
    {"value":"loose","label":"Loose Sheet","hint":"No binding — sheets stay as-is","price":0},
    {"value":"corner-stapling","label":"Corner Stapling","hint":"Single staple at the top-left corner","price":5},
    {"value":"side-stapling","label":"Side Stapling","hint":"Staples along the left edge","price":10}
  ]'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
