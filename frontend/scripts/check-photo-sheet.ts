/**
 * Runnable check for the Photo Print sheet preview's domain math
 * (src/lib/domain/photos.ts): size-hint parsing feeds the sheet's aspect
 * ratio, and photoSheetGrid's two-column tiling must hold for every offered
 * layout (2/4/6/8) plus junk input.
 *
 *   npx tsx scripts/check-photo-sheet.ts
 */
import assert from 'node:assert/strict';
import {
  hintDimensions,
  layoutPhotoSheet,
  photoFromPrice,
  PHOTO_SHEET_FALLBACK,
} from '../src/lib/domain/photos';
import { PHOTO_TYPES, PAPER_SIZES } from '../src/lib/domain/stores';

// Every shipped photo-type and paper-size hint must parse (× separator).
for (const type of PHOTO_TYPES) {
  const dims = hintDimensions(type.hint);
  assert.ok(dims, `photo type ${type.value} hint parses`);
  assert.ok(dims.w > 0 && dims.h >= dims.w, `${type.value} is a portrait photo`);
}
for (const size of PAPER_SIZES) {
  const dims = hintDimensions(size.hint);
  assert.ok(dims, `paper size ${size.value} hint parses`);
}

// Alternate separators and junk input.
assert.deepEqual(hintDimensions('6x4'), { w: 6, h: 4 });
assert.deepEqual(hintDimensions('10.2 × 15.2 cm'), { w: 10.2, h: 15.2 });
assert.equal(hintDimensions(undefined), null);
assert.equal(hintDimensions('Glossy finish'), null);
assert.equal(hintDimensions('0 × 0 mm'), null, 'zero dimensions rejected');

// Offered layouts tile fully (no leftover empty slots).
for (const [count, rows] of [[2, 1], [4, 2], [6, 3], [8, 4]] as const) {
  assert.deepEqual(
    layoutPhotoSheet(count),
    { photos: count, cols: 2, rows },
    `${count}/sheet tiles as 2 × ${rows}`,
  );
  assert.equal(rows * 2, count, 'grid has no empty slot');
}
assert.deepEqual(layoutPhotoSheet(1), { photos: 1, cols: 1, rows: 1 });
assert.deepEqual(
  layoutPhotoSheet(Number.NaN),
  { photos: 1, cols: 1, rows: 1 },
  'junk count collapses to one photo',
);

// Fallback sheet is portrait A4.
assert.ok(PHOTO_SHEET_FALLBACK.h > PHOTO_SHEET_FALLBACK.w);

/* ── photoFromPrice — the "from ₹X/sheet" anchor (never the base price) ── */

assert.deepEqual(
  photoFromPrice(PHOTO_TYPES, undefined),
  { count: 8, price: 96 },
  'unconfigured store anchors at 8 × lowest rate (passport ₹12)',
);
assert.deepEqual(
  photoFromPrice(PHOTO_TYPES, { 'passport-photo': { '8': 100, '12': 150 } }),
  { count: 8, price: 100 },
  'seller 8-price anchors directly',
);
assert.deepEqual(
  photoFromPrice(PHOTO_TYPES, { 'passport-photo': { '12': 150 } }),
  { count: 12, price: 150 },
  'seller pricing only 12 anchors on 12',
);
assert.deepEqual(
  photoFromPrice(PHOTO_TYPES, { 'photo-4x6': { '8': 90 } }),
  { count: 8, price: 90 },
  'only ticked types count',
);
assert.deepEqual(
  photoFromPrice(PHOTO_TYPES, {
    'passport-photo': 10,
  } as unknown as Record<string, Record<string, number>>),
  { count: 8, price: 96 },
  'legacy flat ₹/photo map ignores the stale rate',
);
assert.equal(photoFromPrice([], undefined), null, 'no types → no anchor');

console.log('photo sheet preview domain checks passed');
