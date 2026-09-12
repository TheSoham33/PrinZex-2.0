/**
 * Runnable check for Photo Print on the order page: computeCost must mirror
 * the backend computeQuote branch (backend covered by
 * prinzex-backend/scripts/check-photo-print.ts) — the seller's (type ×
 * count) combo ₹/sheet wins, the platform default is type rate × count,
 * paper extras add per sheet, and legacy flat seller maps degrade safely.
 *
 *   npx tsx scripts/check-photo-print.ts
 */
import assert from 'node:assert/strict';
import { computeCost } from '../src/components/order/orderReducer';
import { PHOTO_TYPES, PHOTO_LAYOUTS } from '../src/lib/domain/stores';

const photoService = {
  id: 'spec-photo-prints',
  name: 'Photo Print',
  startingPrice: 0,
  unit: 'per piece',
  icon: '',
  description: '',
};

const spec = {
  serviceId: 'spec-photo-prints',
  paperType: 'glossy' as const,
  size: 'A4',
  quantity: 1,
  colorOption: 'color' as const,
  photoType: 'passport-photo',
  photosPerSheet: 8,
};

{
  // Platform default: passport photo 8/sheet → default ₹12 × 8 = ₹96/sheet;
  // 2 sheets → 192.
  const cost = computeCost(
    { ...spec, quantity: 2 },
    photoService,
    0,
    0,
  );
  assert.equal(cost.subtotal, 192, 'default sheet price = type rate × count');

  // Seller combo ₹/sheet wins directly: passport@12 at ₹150, 1 sheet → 150.
  const overridden = computeCost(
    { ...spec, photosPerSheet: 12 },
    {
      ...photoService,
      photoTypeOptions: { 'passport-photo': { '12': 150 } },
    },
    0,
    0,
  );
  assert.equal(overridden.subtotal, 150, 'seller combo price wins');

  // A seller-typed "per page" unit label must NOT divert photo pricing into
  // the per-page branch — combos always price per sheet (reported live bug).
  const pageUnitLabel = computeCost(
    { ...spec, photosPerSheet: 12 },
    {
      ...photoService,
      unit: 'per page',
      photoTypeOptions: { 'passport-photo': { '12': 150 } },
    },
    0,
    0,
  );
  assert.equal(pageUnitLabel.subtotal, 150, 'photo pricing ignores a "per page" unit label');

  // Combos are per (type × count): an 8-price never leaks onto 12 —
  // 4×6 @12 without a seller 12-price falls back to rate × 12 = 300.
  const noCombo = computeCost(
    { ...spec, photoType: 'photo-4x6', photosPerSheet: 12 },
    {
      ...photoService,
      photoTypeOptions: { 'photo-4x6': { '8': 200 } },
    },
    0,
    0,
  );
  assert.equal(noCombo.subtotal, 25 * 12, 'missing combo falls back to rate × count');

  // Missing layout snaps to the default count 8: 12 × 8 = 96.
  const defaulted = computeCost(
    { serviceId: spec.serviceId, paperType: spec.paperType, size: spec.size, quantity: 1, colorOption: spec.colorOption, photoType: spec.photoType },
    photoService,
    0,
    0,
  );
  assert.equal(defaulted.subtotal, 96, 'missing layout defaults to 8 per sheet');

  // Paper extras add per sheet: glossy +₹3 → 96 + 3.
  const withPaper = computeCost(
    { ...spec },
    { ...photoService, paperTypePrices: { glossy: 3 } },
    0,
    0,
  );
  assert.equal(withPaper.subtotal, 99, 'paper options charge per sheet');

  // Legacy flat ₹/photo seller maps degrade to the platform default —
  // never read a 10 as if it were a combo map.
  const legacy = computeCost(
    { ...spec },
    {
      ...photoService,
      photoTypeOptions: {
        'passport-photo': 10,
      } as unknown as Record<string, Record<string, number>>,
    },
    0,
    0,
  );
  assert.equal(legacy.subtotal, 96, 'legacy flat rate is ignored, not misread');

  // Unknown types cost ₹0 rather than crashing (validation blocks them anyway).
  const unknown = computeCost(
    { ...spec, photoType: 'nope' },
    photoService,
    0,
    0,
  );
  assert.equal(unknown.subtotal, 0, 'unknown photo type is free, not explosive');
}

assert.deepEqual(
  PHOTO_LAYOUTS.map((layout) => Number(layout.value)),
  [8, 12],
  'shipped photos-per-sheet choices are exactly 8 and 12',
);
assert.ok(
  PHOTO_TYPES.every((type) => type.price > 0),
  'every photo type still carries its default per-photo rate',
);

console.log('check-photo-print: OK');
