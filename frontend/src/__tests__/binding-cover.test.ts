/**
 * Wrap-cover binding helpers — ported 1:1 from
 * scripts/check-binding-cover.ts (shared by Tape and Glue Binding):
 * spine-width estimation and the 300-DPI cover-artwork pixel requirements.
 */
import {
  estimateWrapSpineMm,
  requiredPixelsForSize,
  isPortrait,
  meetsResolution,
} from '../components/order/bindingCover';

const TAPE_MIN_MM = 4; // thermal tape grip
const GLUE_MIN_MM = 3; // glued paperback grip

describe('estimateWrapSpineMm', () => {
  test('no document yet → no estimate, never a bogus minimum claim', () => {
    expect(estimateWrapSpineMm(0, 4)).toBe(0);
    expect(estimateWrapSpineMm(-5, 3)).toBe(0);
  });

  test('Tape Binding (4 mm floor): sheets (2 pages, odd rounds up) × 0.1 mm', () => {
    expect(estimateWrapSpineMm(20, TAPE_MIN_MM)).toBe(4); // 10 sheets × 0.1 = 1 → min
    expect(estimateWrapSpineMm(80, TAPE_MIN_MM)).toBe(4); // exactly at the floor
    expect(estimateWrapSpineMm(81, TAPE_MIN_MM)).toBe(4.1); // odd page → 41 sheets
    expect(estimateWrapSpineMm(120, TAPE_MIN_MM)).toBe(6);
    expect(estimateWrapSpineMm(400, TAPE_MIN_MM)).toBe(20);
  });

  test('Glue Binding (3 mm floor): same math, lower floor', () => {
    expect(estimateWrapSpineMm(20, GLUE_MIN_MM)).toBe(3);
    expect(estimateWrapSpineMm(60, GLUE_MIN_MM)).toBe(3); // 30 sheets × 0.1 = 3.0
    expect(estimateWrapSpineMm(61, GLUE_MIN_MM)).toBe(3.1);
    expect(estimateWrapSpineMm(400, GLUE_MIN_MM)).toBe(20);
  });
});

describe('requiredPixelsForSize (300 DPI minimums)', () => {
  test('A4 is 2481×3507; A5 smaller, A3 larger', () => {
    const a4 = requiredPixelsForSize('A4');
    const a5 = requiredPixelsForSize('A5');
    const a3 = requiredPixelsForSize('A3');
    expect(a4).toEqual({ width: 2481, height: 3507 }); // 8.27"×300 / 11.69"×300
    expect(a5.width < a4.width && a3.width > a4.width).toBe(true);
  });

  test('unknown or missing size → A4 fallback', () => {
    expect(requiredPixelsForSize('B5')).toEqual(requiredPixelsForSize('A4'));
    expect(requiredPixelsForSize(undefined)).toEqual(requiredPixelsForSize('A4'));
  });
});

describe('meetsResolution', () => {
  test('exact, headroom, and the three failure modes', () => {
    expect(meetsResolution(2481, 3507, 'A4')).toBe(true);
    expect(meetsResolution(3000, 3507, 'A4')).toBe(true); // headroom fine
    expect(meetsResolution(2480, 3507, 'A4')).toBe(false); // 1 px short on width
    expect(meetsResolution(3507, 2481, 'A4')).toBe(false); // landscape ≠ portrait slots
    expect(meetsResolution(2481, 3507, 'A3')).toBe(false); // A4 file too small for A3
  });
});

describe('isPortrait', () => {
  test('portrait yes; landscape and square no', () => {
    expect(isPortrait(100, 200)).toBe(true);
    expect(isPortrait(200, 100)).toBe(false);
    expect(isPortrait(150, 150)).toBe(false);
  });
});
