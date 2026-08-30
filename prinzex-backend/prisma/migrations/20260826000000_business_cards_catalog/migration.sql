-- Business Cards service + its customization option groups in the catalogue.
-- Append-if-missing semantics: existing databases (where admins may have
-- edited rows) keep their data; fresh databases get the same defaults via
-- ensureCatalogDefaults() in the catalog module (kept in catalog.defaults.ts).

-- New service category, appended only when not already present.
UPDATE "CatalogEntry"
SET data = data || jsonb_build_array(jsonb_build_object(
  'id', 'cards',
  'name', 'Cards',
  'description', 'Business cards and card printing',
  'services', jsonb_build_array(
    jsonb_build_object('id', 'cards-business', 'name', 'Business Cards')
  )))
WHERE key = 'service-categories'
  AND NOT data @> '[{"id":"cards"}]'::jsonb;

-- Business card option groups (idempotent inserts).
INSERT INTO "CatalogEntry" (key, label, data, "updatedAt")
VALUES
  ('card-shapes', 'Card shapes', $$[
    { "value": "rectangle", "label": "Standard (Rectangle)", "hint": "Classic business card outline" },
    { "value": "classic", "label": "Classic", "hint": "Softly rounded silhouette" },
    { "value": "square", "label": "Square", "hint": "Modern square format" },
    { "value": "leaf", "label": "Leaf", "hint": "Two opposite rounded corners" },
    { "value": "oval", "label": "Oval", "hint": "Fully curved edges" },
    { "value": "circle", "label": "Circle", "hint": "Round die-cut card" }
  ]$$::jsonb, now()),
  ('card-papers', 'Card paper & texture', $$[
    { "value": "glossy", "label": "Glossy", "hint": "Shiny coated stock" },
    { "value": "matte", "label": "Matte", "hint": "Smooth non-reflective stock" },
    { "value": "velvet", "label": "Velvet Touch", "hint": "Soft-touch lamination" },
    { "value": "premium-plus-glossy", "label": "Premium Plus Glossy", "hint": "Thick high-shine stock" },
    { "value": "non-tearable", "label": "Non-Tearable", "hint": "Waterproof synthetic stock" },
    { "value": "spot-uv", "label": "Spot UV", "hint": "Raised gloss highlights" },
    { "value": "pearl", "label": "Pearl", "hint": "Shimmer metallic stock" },
    { "value": "kraft", "label": "Kraft", "hint": "Natural brown recycled stock" },
    { "value": "diamond", "label": "Diamond", "hint": "Glitter finish stock" },
    { "value": "raised-foil", "label": "Raised Foil", "hint": "Embossed metallic accents" },
    { "value": "magnetic", "label": "Magnetic", "hint": "Fridge-magnet backing" },
    { "value": "transparent", "label": "Transparent", "hint": "Frosted plastic stock" }
  ]$$::jsonb, now()),
  ('card-sizes', 'Card sizes', $$[
    { "value": "standard", "label": "Standard", "hint": "89 × 51 mm" },
    { "value": "square", "label": "Square", "hint": "65 × 65 mm" },
    { "value": "mini", "label": "Mini", "hint": "85 × 45 mm" }
  ]$$::jsonb, now()),
  ('card-corners', 'Card corners', $$[
    { "value": "standard", "label": "Standard", "hint": "Square-cut corners" },
    { "value": "rounded", "label": "Rounded", "hint": "Cut for a smooth finish", "incompatibleWith": ["circle", "oval", "leaf"] }
  ]$$::jsonb, now()),
  ('card-print-sides', 'Card print sides', $$[
    { "value": "single", "label": "Single-sided", "hint": "Design on the front only" },
    { "value": "double", "label": "Double-sided", "hint": "Design on front and back" }
  ]$$::jsonb, now())
ON CONFLICT (key) DO NOTHING;
