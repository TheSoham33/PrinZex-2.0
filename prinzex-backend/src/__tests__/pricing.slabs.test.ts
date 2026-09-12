/**
 * Business Card slab pricing — ported 1:1 from
 * scripts/check-card-pricing.ts (pickSlabRate: boundaries, gaps, above/below
 * the tiers, and the no-slabs fallback).
 */
import { pickSlabRate } from '../modules/orders/pricing.slabs';

const slabs = [
  { qty: 1000, rate: 2.5 }, // deliberately unsorted — seller input order must not matter
  { qty: 100, rate: 4 },
  { qty: 250, rate: 3.5 },
  { qty: 500, rate: 3 },
];

describe('pickSlabRate', () => {
  test.each([
    [100, 4],
    [250, 3.5],
    [500, 3],
    [1000, 2.5],
  ])('tier boundary qty %i returns its own rate', (qty, expected) => {
    expect(pickSlabRate(slabs, qty)).toBe(expected);
  });

  test.each([
    [150, 4], // between 100 and 250 → lower tier
    [999, 3], // between 500 and 1000 → lower tier
  ])('in-between qty %i settles on the lower tier (slabs never price UP)', (qty, expected) => {
    expect(pickSlabRate(slabs, qty)).toBe(expected);
  });

  test('above the largest tier keeps the largest tier rate', () => {
    expect(pickSlabRate(slabs, 5000)).toBe(2.5);
  });

  test('below the smallest tier returns the smallest tier rate, never undefined', () => {
    expect(pickSlabRate(slabs, 50)).toBe(4);
  });

  test.each([
    [undefined],
    [[]],
  ])('no configured slabs (%p) → base-price path (undefined)', (noSlabs) => {
    expect(pickSlabRate(noSlabs, 500)).toBeUndefined();
  });
});
