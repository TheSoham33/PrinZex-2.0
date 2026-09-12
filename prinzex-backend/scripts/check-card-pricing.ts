/**
 * Runnable check for Business Card slab pricing (src/modules/orders/pricing.slabs.ts).
 * Run: npx tsx scripts/check-card-pricing.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import { pickSlabRate } from '../src/modules/orders/pricing.slabs';

const slabs = [
  { qty: 1000, rate: 2.5 }, // deliberately unsorted — seller input order must not matter
  { qty: 100, rate: 4 },
  { qty: 250, rate: 3.5 },
  { qty: 500, rate: 3 },
];

// Every tier boundary returns its own rate.
assert.equal(pickSlabRate(slabs, 100), 4);
assert.equal(pickSlabRate(slabs, 250), 3.5);
assert.equal(pickSlabRate(slabs, 500), 3);
assert.equal(pickSlabRate(slabs, 1000), 2.5);

// In-between quantities settle on the lower tier (slabs never price UP).
assert.equal(pickSlabRate(slabs, 150), 4);
assert.equal(pickSlabRate(slabs, 999), 3);

// Above the largest tier keeps the largest tier's rate.
assert.equal(pickSlabRate(slabs, 5000), 2.5);

// Below the smallest tier: smallest tier's rate (the seller's minQuantity
// should equal it, but the math must never produce undefined here).
assert.equal(pickSlabRate(slabs, 50), 4);

// Seller hasn't configured slabs → base-price path (undefined).
assert.equal(pickSlabRate(undefined, 500), undefined);
assert.equal(pickSlabRate([], 500), undefined);

console.log('OK — pickSlabRate behaves on boundaries, gaps and edge inputs');
