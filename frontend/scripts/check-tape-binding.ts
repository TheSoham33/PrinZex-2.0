/**
 * Runnable check for the Tape Binding panel's pure pricing/production math:
 * spine-width estimation (sheet pairing, standard 75 GSM caliper, 4 mm
 * thermal-tape minimum) and the 300-DPI cover-artwork pixel requirements
 * per catalogue size.
 *
 *   npx tsx scripts/check-tape-binding.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import {
  estimateTapeSpineMm,
  requiredPixelsForSize,
  isPortrait,
  meetsResolution,
} from '../src/components/order/TapeBindingCustomizationPanel';

/* No document yet → no estimate, never a bogus 4 mm claim. */
assert.equal(estimateTapeSpineMm(0), 0);
assert.equal(estimateTapeSpineMm(-5), 0);

/* Spine: sheets (2 pages each, odd rounds up) × 0.1 mm, floored at 4 mm. */
assert.equal(estimateTapeSpineMm(20), 4); // 10 sheets × 0.1 = 1 → min 4
assert.equal(estimateTapeSpineMm(80), 4); // 40 × 0.1 = 4.0 exactly
assert.equal(estimateTapeSpineMm(81), 4.1); // odd page → 41 sheets → 4.05 → 4.1
assert.equal(estimateTapeSpineMm(120), 6); // 60 × 0.1
assert.equal(estimateTapeSpineMm(400), 20); // 200 × 0.1

/* 300 DPI minimums follow the page size (A4 basis ≥ A5; A3 largest). */
const a4 = requiredPixelsForSize('A4');
const a5 = requiredPixelsForSize('A5');
const a3 = requiredPixelsForSize('A3');
assert.deepEqual(a4, { width: 2481, height: 3507 }); // 8.27"×300 / 11.69"×300
assert.ok(a5.width < a4.width && a3.width > a4.width);
assert.deepEqual(requiredPixelsForSize('B5'), a4); // unknown → A4 fallback
assert.deepEqual(requiredPixelsForSize(undefined), a4);

assert.ok(meetsResolution(2481, 3507, 'A4'));
assert.ok(meetsResolution(3000, 3507, 'A4')); // headroom fine
assert.ok(!meetsResolution(2480, 3507, 'A4')); // 1 px short on width
assert.ok(!meetsResolution(3507, 2481, 'A4')); // landscape numbers ≠ portrait slots
assert.ok(!meetsResolution(a4.width, a4.height, 'A3')); // A4 file too small for A3

assert.ok(isPortrait(100, 200));
assert.ok(!isPortrait(200, 100));
assert.ok(!isPortrait(150, 150)); // square is not portrait

console.log('tape binding checks: OK');
