/**
 * Runnable check for Photo Print pricing + catalogue wiring:
 *
 *   quote math     → seller's (photo type × photos-per-sheet) combo ₹/sheet
 *                    wins; platform default = per-photo rate × count; paper
 *                    extras add per sheet; quantity multiplies sheets;
 *                    legacy flat seller rates degrade to defaults
 *   catalogue glue → the 'photo-types' schema takes the shipped defaults and
 *                    the admin-managed 'photo-layouts' group validates count
 *                    values (8/12 shipped, add/delete supported)
 *   payload shape  → photosPerSheet accepts catalogue-manageable counts
 *                    (2–60) instead of the old fixed 2/4/6/8 set
 *
 *   npx tsx scripts/check-photo-print.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import { DEFAULT_CATALOG } from '../src/modules/catalog/catalog.defaults';
import { CATALOG_GROUP_SCHEMAS } from '../src/modules/catalog/catalog.schemas';
import { specificationsSchema } from '../src/modules/orders/orders.schema';
import {
  DEFAULT_PHOTOS_PER_SHEET,
  PHOTO_SHEET_COUNTS,
  PHOTO_TYPE_PRICES,
  photoPrintSetupError,
  photoPrintSubtotal,
  photoSheetPrice,
  preferredPhotoCount,
} from '../src/modules/orders/photoPricing';

/* ── Quote math (the same pure module computeQuote uses) ───────────────── */

const types = DEFAULT_CATALOG['photo-types']?.data as Array<{
  value: string;
  price: number;
}>;
assert.ok(types?.length >= 2, 'photo-types catalogue defaults shipped');

{
  // Platform default: passport photo 8/sheet → default ₹12 × 8 = ₹96/sheet;
  // 2 sheets → 192.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', photosPerSheet: 8, quantity: 2, paperOptionExtra: 0 }),
    192,
    'default sheet price = per-photo rate × count',
  );

  // Seller combo price wins directly: ₹150 for passport@12 → 1 sheet = 150.
  assert.equal(
    photoPrintSubtotal({
      photoType: 'passport-photo',
      photosPerSheet: 12,
      quantity: 1,
      paperOptionExtra: 0,
      sellerCombos: { 'passport-photo': { '12': 150 } },
    }),
    150,
    'seller combo price wins',
  );

  // Combo prices are per COMBO: an 8-price never leaks onto the 12 layout.
  assert.equal(
    photoPrintSubtotal({
      photoType: 'photo-4x6',
      photosPerSheet: 12,
      quantity: 1,
      paperOptionExtra: 0,
      sellerCombos: { 'photo-4x6': { '8': 200 } },
    }),
    25 * 12,
    'combo without a 12 price falls back to rate × 12',
  );

  // Paper extras add per sheet: (96 + 4) × 2 = 200.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', photosPerSheet: 8, quantity: 2, paperOptionExtra: 4 }),
    200,
    'paper options charge per sheet',
  );

  // Missing layout snaps to the default count (8): 12 × 8 × 1 = 96.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', quantity: 1, paperOptionExtra: 0 }),
    96,
    'missing layout defaults to 8 per sheet',
  );

  // Legacy flat ₹-per-photo seller maps degrade to platform defaults —
  // never multiply an old rate as if it were a combo map.
  assert.equal(
    photoSheetPrice('passport-photo', 8, { 'passport-photo': 10 }),
    96,
    'legacy flat rate is ignored, not misread',
  );

  // Unknown types are free, never explosive (assertPhotoSpecValid blocks them at placement).
  assert.equal(
    photoPrintSubtotal({ photoType: 'nope', photosPerSheet: 8, quantity: 5, paperOptionExtra: 0 }),
    0,
  );

  // Default count preference: 8 when offered, else the first offered.
  assert.equal(preferredPhotoCount([8, 12]), 8);
  assert.equal(preferredPhotoCount([12, 16]), 12);
  assert.equal(preferredPhotoCount([]), 8);
}

/* ── Seller-configured setup rule (updatePricingOverrides gate) ────────── */

assert.equal(
  photoPrintSetupError(false, undefined),
  null,
  'no photo service → no requirement',
);
assert.ok(
  photoPrintSetupError(true, undefined),
  'active photo service with no saved combos is rejected',
);
assert.ok(photoPrintSetupError(true, {}), 'empty map rejected');
assert.ok(
  photoPrintSetupError(true, { 'passport-photo': {} }),
  'type with no priced counts rejected',
);
assert.ok(
  photoPrintSetupError(true, { 'passport-photo': 10 }),
  'legacy flat ₹/photo map must migrate to combos first',
);
assert.equal(
  photoPrintSetupError(true, { 'passport-photo': { '8': 96 } }),
  null,
  'one priced combo satisfies the rule',
);

/* ── Catalogue glue ────────────────────────────────────────────────────── */

const typeSchema = CATALOG_GROUP_SCHEMAS['photo-types'];
assert.ok(typeSchema, 'photo-types schema registered (missing key = admin save 400s)');
assert.ok(typeSchema.safeParse(types).success, 'shipped photo-type defaults validate');
assert.equal(
  typeSchema.safeParse([{ value: 'x', label: 'X', price: -1 }]).success,
  false,
  'negative type price rejected',
);

// Pricing constants stay in sync with the shipped catalogue rows.
for (const row of types) {
  assert.equal(PHOTO_TYPE_PRICES[row.value], row.price, `price for ${row.value}`);
}

// The admin-managed photos-per-sheet group.
const layoutSchema = CATALOG_GROUP_SCHEMAS['photo-layouts'];
assert.ok(layoutSchema, 'photo-layouts schema registered');
const layouts = DEFAULT_CATALOG['photo-layouts']?.data as Array<{ value: string }>;
assert.deepEqual(
  layouts?.map((row) => Number(row.value)),
  [...PHOTO_SHEET_COUNTS],
  'shipped 8/12 counts mirror PHOTO_SHEET_COUNTS',
);
assert.ok(layoutSchema.safeParse(layouts).success, 'shipped layout defaults validate');
assert.ok(
  layoutSchema.safeParse([{ value: '8', label: '8 photos' }, { value: '16', label: '16 photos' }]).success,
  'admin-added count validates',
);
for (const bad of [
  [{ value: 'abc', label: 'X' }], // not a number
  [{ value: '1', label: 'X' }], // below 2
  [{ value: '61', label: 'X' }], // above 60
  [{ value: '8', label: 'X' }, { value: '8', label: 'Y' }], // repeats
  [], // at least one choice
]) {
  assert.equal(layoutSchema.safeParse(bad).success, false, `must reject ${JSON.stringify(bad)}`);
}

/* ── Payload shape ─────────────────────────────────────────────────────── */

const minimalSpec = { paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color' };
assert.ok(
  specificationsSchema.safeParse({ ...minimalSpec, photoType: 'postcard-size', photosPerSheet: 12 }).success,
  '12 photos per sheet now parses',
);
assert.ok(specificationsSchema.safeParse({ ...minimalSpec, photosPerSheet: 16 }).success, 'admin-added counts parse');
for (const layout of [1, 0, -4, 61, 8.5]) {
  assert.equal(
    specificationsSchema.safeParse({ ...minimalSpec, photosPerSheet: layout }).success,
    false,
    `photosPerSheet ${layout} must be rejected`,
  );
}
// …but a missing layout passes — placement defaults to 8 (or the first offered).
assert.ok(specificationsSchema.safeParse({ ...minimalSpec, photoType: 'postcard-size' }).success);
assert.equal(DEFAULT_PHOTOS_PER_SHEET, 8);

console.log('check-photo-print: OK');
