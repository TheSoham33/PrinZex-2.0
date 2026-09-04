/**
 * Runnable check for the wrap-cover binding helpers (src/components/order/
 * bindingCover.ts — shared by Tape Binding and Glue Binding): spine-width
 * estimation (sheet pairing, standard 75 GSM caliper, per-style minimum) and
 * the 300-DPI cover-artwork pixel requirements per catalogue size.
 *
 *   npx tsx scripts/check-binding-cover.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import {
  estimateWrapSpineMm,
  requiredPixelsForSize,
  isPortrait,
  meetsResolution,
} from '../src/components/order/bindingCover';

/* No document yet → no estimate, never a bogus minimum claim. */
assert.equal(estimateWrapSpineMm(0, 4), 0);
assert.equal(estimateWrapSpineMm(-5, 3), 0);

/* Spine: sheets (2 pages each, odd rounds up) × 0.1 mm, per-style minimum. */
const TAPE_MIN_MM = 4; // thermal tape grip
const GLUE_MIN_MM = 3; // glued paperback grip
/* Tape Binding (4 mm minimum). */
assert.equal(estimateWrapSpineMm(20, TAPE_MIN_MM), 4); // 10 sheets × 0.1 = 1 → min
assert.equal(estimateWrapSpineMm(80, TAPE_MIN_MM), 4); // exactly at the floor
assert.equal(estimateWrapSpineMm(81, TAPE_MIN_MM), 4.1); // odd page → 41 sheets
assert.equal(estimateWrapSpineMm(120, TAPE_MIN_MM), 6);
assert.equal(estimateWrapSpineMm(400, TAPE_MIN_MM), 20);
/* Glue Binding (3 mm minimum): same math, lower floor. */
assert.equal(estimateWrapSpineMm(20, GLUE_MIN_MM), 3);
assert.equal(estimateWrapSpineMm(60, GLUE_MIN_MM), 3); // 30 sheets × 0.1 = 3.0
assert.equal(estimateWrapSpineMm(61, GLUE_MIN_MM), 3.1);
assert.equal(estimateWrapSpineMm(400, GLUE_MIN_MM), 20);

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

console.log('binding cover checks: OK');
