-- Trim Paper size options to A4 / A5 / A3 (owner request, "for now").
-- The row remains fully editable in Admin → Catalogue, so sizes can be
-- re-added per-tenant at any time; the code default + reference fallback
-- ship the same three options.
UPDATE "CatalogEntry"
SET data = '[
  { "value": "A4", "label": "A4", "hint": "210 × 297 mm", "multiplier": 1 },
  { "value": "A5", "label": "A5", "hint": "148 × 210 mm", "multiplier": 0.8 },
  { "value": "A3", "label": "A3", "hint": "297 × 420 mm", "multiplier": 1.9 }
]'::jsonb
WHERE key = 'paper-sizes';
