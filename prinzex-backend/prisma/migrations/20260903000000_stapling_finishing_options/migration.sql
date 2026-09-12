-- Document printing gains a stapling/binding choice (loose / corner / side),
-- carried as finishing keys so both pricing paths charge it per quantity.
-- Replace the flat "Stapling" catalogue entry with the two priced variants;
-- the plain 'stapling' finishing key stays valid in the backend charges map
-- for in-flight orders and older specs.
UPDATE "CatalogEntry"
SET data = (
  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb) || '[
    {"value":"corner-stapling","label":"Corner Stapling","hint":"Single staple at the top-left corner","price":5},
    {"value":"side-stapling","label":"Side Stapling","hint":"Staples along the left edge","price":10}
  ]'::jsonb
  FROM jsonb_array_elements(data) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'value' NOT IN ('stapling', 'corner-stapling', 'side-stapling')
)
WHERE key = 'finishing-options';
