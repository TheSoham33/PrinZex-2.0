-- Tape Binding arrives as a new binding service (sellers offer it from the
-- catalogue, base price = per-document binding rate like every bind-*
-- service) plus its tape-colour option group. ensureCatalogDefaults only
-- inserts missing keys, so existing databases need this one-time seed:
-- append the service to the binding category (idempotent guard) and insert
-- the tape-colors group. "updatedAt" has no DB default — set it explicitly.
UPDATE "CatalogEntry"
SET data = (
  SELECT jsonb_agg(
    CASE
      WHEN cat->>'id' = 'binding'
           AND NOT (cat->'services' @> '[{"id":"bind-tape"}]'::jsonb)
      THEN jsonb_set(cat, '{services}', (cat->'services') || '{"id":"bind-tape","name":"Tape Binding"}'::jsonb)
      ELSE cat
    END
  )
  FROM jsonb_array_elements(data) AS cat
),
"updatedAt" = NOW()
WHERE key = 'service-categories';

INSERT INTO "CatalogEntry" (key, label, data, "updatedAt")
VALUES (
  'tape-colors',
  'Tape Binding tape colours',
  '[
    {"value":"black","label":"Black","class":"bg-[#111827]","hex":"#111827"},
    {"value":"white","label":"White","class":"bg-[#f8fafc]","hex":"#f8fafc"},
    {"value":"blue","label":"Blue","class":"bg-[#1d4ed8]","hex":"#1d4ed8"},
    {"value":"red","label":"Red","class":"bg-[#b91c1c]","hex":"#b91c1c"},
    {"value":"green","label":"Green","class":"bg-[#166534]","hex":"#166534"}
  ]'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
