/**
 * Runnable check for Photo Print on the order page: computeCost must mirror
 * the backend computeQuote branch (scripts/check-photo-print.ts covers the
 * backend) — per-photo rate × photos-per-sheet × sheets, seller price wins,
 * catalogue defaults and layout fallbacks hold.
 *
 *   npx tsx scripts/check-photo-print.ts
 */
import assert from 'node:assert/strict';
import { computeCost } from '../src/components/order/orderReducer';
import { PHOTO_TYPES } from '../src/lib/domain/stores';

const photoService = {
  id: 'spec-photo-prints',
  name: 'Photo Print',
  startingPrice: 0,
  unit: 'per piece',
  icon: '',
  description: '',
};

{
  // Platform default: passport photo, 4/sheet, ₹12/photo → 2 sheets × 4 × 12 = 96.
  const cost = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 2, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 4 },
    photoService,
    0,
    0,
  );
  assert.equal(cost.subtotal, 96, 'default rate × layout × sheets');

  // Seller per-photo price wins: ₹10/photo → 80.
  const overridden = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 2, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 4 },
    { ...photoService, photoTypeOptions: { 'passport-photo': 10 } },
    0,
    0,
  );
  assert.equal(overridden.subtotal, 80, 'seller per-photo price wins');

  // Layout multiplies: 8/sheet → 96 for one sheet at the default rate.
  const eightUp = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 8 },
    photoService,
    0,
    0,
  );
  assert.equal(eightUp.subtotal, 96, 'photos-per-sheet multiplies the price');

  // Layout fallback: no explicit layout → the type's first layout (4).
  const defaulted = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color', photoType: 'passport-photo' },
    photoService,
    0,
    0,
  );
  assert.equal(defaulted.subtotal, 48, 'missing layout snaps to the type default');

  // Paper extras add per sheet: seller's paper menu marks glossy +₹3 → (48 + 3).
  const withPaper = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 4 },
    { ...photoService, paperTypePrices: { glossy: 3 } },
    0,
    0,
  );
  assert.equal(withPaper.subtotal, 51, 'paper options charge per sheet');

  // Unknown types cost ₹0 rather than crashing (validation blocks them anyway).
  const unknown = computeCost(
    { serviceId: 'spec-photo-prints', paperType: 'glossy', size: 'A4', quantity: 1, colorOption: 'color', photoType: 'nope' },
    photoService,
    0,
    0,
  );
  assert.equal(unknown.subtotal, 0, 'unknown photo type is free, not explosive');
}

assert.ok(
  PHOTO_TYPES.every((type) => type.layouts.length > 0 && type.layouts.every((n) => [2, 4, 6, 8].includes(n))),
  'shipped photo types expose only 2/4/6/8 layouts',
);

console.log('check-photo-print: OK');
