-- Lamination arrives as its own top-level catalogue category with a single
-- service (lam-film), priced per page like Document Printing, plus its
-- film-thickness option group. ensureCatalogDefaults only inserts missing
-- keys, so existing databases need this one-time seed: append the category
-- (idempotent guard) and insert the film-thickness group.
UPDATE "CatalogEntry"
SET data = data || '[{"id":"lamination","name":"Lamination","description":"Protective film lamination for documents & certificates","services":[{"id":"lam-film","name":"Lamination"}]}]'::jsonb,
  "updatedAt" = NOW()
WHERE key = 'service-categories'
  AND NOT (data @> '[{"id":"lamination"}]'::jsonb);

INSERT INTO "CatalogEntry" (key, label, data, "updatedAt")
VALUES (
  'film-thickness',
  'Film thickness (Lamination)',
  '[
    {"value":"micron-80","label":"80 micron","hint":"Standard everyday film","price":0},
    {"value":"micron-125","label":"125 micron","hint":"Sturdy — certificates, ID cards","price":2},
    {"value":"micron-250","label":"250 micron","hint":"Rigid — menus, outdoor use","price":4}
  ]'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
