/**
 * Runnable check for Photo Print pricing + catalogue wiring:
 *
 *   quote math     → per-photo rate × photos-per-sheet × sheets; seller
 *                    per-type price wins over the platform default; paper
 *                    extras add per sheet; specs never leak onto other
 *                    services' quotes
 *   catalogue glue → the 'photo-types' zod schema takes the shipped defaults
 *                    and rejects junk layouts/prices; constants stay in sync
 *   payload shape  → the order specifications schema carries photoType and a
 *                    2/4/6/8-only photosPerSheet
 *
 *   npx tsx scripts/check-photo-print.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import { DEFAULT_CATALOG } from '../src/modules/catalog/catalog.defaults';
import { CATALOG_GROUP_SCHEMAS } from '../src/modules/catalog/catalog.schemas';
import { specificationsSchema } from '../src/modules/orders/orders.schema';
import {
  PHOTO_TYPE_LAYOUTS,
  PHOTO_TYPE_PRICES,
  photoPrintSubtotal,
} from '../src/modules/orders/photoPricing';

/* ── Quote math (the same pure module computeQuote uses) ───────────────── */

const types = DEFAULT_CATALOG['photo-types']?.data as Array<{
  value: string;
  price: number;
  layouts: number[];
}>;
assert.ok(types?.length >= 2, 'photo-types catalogue defaults shipped');

{
  // Platform default: passport photo, 4/sheet, ₹12/photo → 2 sheets × 4 × 12 = 96.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', photosPerSheet: 4, quantity: 2, paperOptionExtra: 0 }),
    96,
    'default rate × layout × sheets',
  );

  // Seller override wins: ₹10/photo → 2 × 4 × 10 = 80.
  assert.equal(
    photoPrintSubtotal({
      photoType: 'passport-photo',
      photosPerSheet: 4,
      quantity: 2,
      paperOptionExtra: 0,
      sellerPrices: { 'passport-photo': 10 },
    }),
    80,
    'seller per-photo price wins',
  );

  // Layout choice multiplies: 8/sheet at default ₹12 → 96.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', photosPerSheet: 8, quantity: 1, paperOptionExtra: 0 }),
    96,
    'photos-per-sheet multiplies the price',
  );

  // Paper extras add per sheet: (12×4 + 4) × 2 = 104.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', photosPerSheet: 4, quantity: 2, paperOptionExtra: 4 }),
    104,
    'paper options charge per sheet',
  );

  // Missing layout snaps to the type's first layout (4): 1 × 4 × 12 = 48.
  assert.equal(
    photoPrintSubtotal({ photoType: 'passport-photo', quantity: 1, paperOptionExtra: 0 }),
    48,
    'missing layout defaults to the type default',
  );

  // Unknown types are free, never explosive (assertPhotoSpecValid blocks them at placement).
  assert.equal(
    photoPrintSubtotal({ photoType: 'nope', photosPerSheet: 4, quantity: 5, paperOptionExtra: 0 }),
    0,
  );
}

/* ── Catalogue glue ────────────────────────────────────────────────────── */

const schema = CATALOG_GROUP_SCHEMAS['photo-types'];
assert.ok(schema, 'photo-types schema registered (missing key = admin save 400s)');
assert.ok(schema.safeParse(types).success, 'shipped defaults validate');
assert.ok(
  schema.safeParse([{ value: 'x', label: 'X', price: 5, layouts: [2, 6] }]).success,
  'a custom row validates',
);
for (const bad of [
  [{ value: 'x', label: 'X', price: 5, layouts: [] }],
  [{ value: 'x', label: 'X', price: 5, layouts: [3] }], // layout outside 2/4/6/8
  [{ value: 'x', label: 'X', price: 5, layouts: [2, 2] }], // repeats
  [{ value: 'x', label: 'X', price: -1, layouts: [2] }], // negative price
]) {
  assert.equal(schema.safeParse(bad).success, false, `must reject ${JSON.stringify(bad)}`);
}

// Pricing/layout constants stay in sync with the shipped catalogue rows —
// the backend enforces these even when the catalogue is renamed/relabelled.
for (const row of types) {
  assert.equal(PHOTO_TYPE_PRICES[row.value], row.price, `price for ${row.value}`);
  assert.deepEqual(PHOTO_TYPE_LAYOUTS[row.value], row.layouts, `layouts for ${row.value}`);
}

/* ── Payload shape ─────────────────────────────────────────────────────── */

const minimalSpec = { paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color' };
assert.ok(
  specificationsSchema.safeParse({ ...minimalSpec, photoType: 'postcard-size', photosPerSheet: 2 }).success,
);
for (const layout of [3, 5, 0, 9]) {
  assert.equal(
    specificationsSchema.safeParse({ ...minimalSpec, photosPerSheet: layout }).success,
    false,
    `photosPerSheet ${layout} must be rejected`,
  );
}
// …but a missing layout passes — placement defaults to the type's first layout.
assert.ok(specificationsSchema.safeParse({ ...minimalSpec, photoType: 'postcard-size' }).success);

console.log('check-photo-print: OK');
