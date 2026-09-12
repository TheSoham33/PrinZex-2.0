/**
 * Platform-settings parsers — ported 1:1 from
 * scripts/check-platform-settings.ts: bounded scalars, lenient per-speed map
 * merge (read path), strict per-speed map validation (write path), defaults
 * on empty metadata, and the defaults-mirror guard (every code fallback must
 * equal the settings default that replaces it after the first save).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  mergeSpeedMap,
  parseBoundedNumber,
  parseSpeedMapStrict,
  PLATFORM_SETTING_DEFAULTS,
  platformValuesFromMetadata,
  SPEED_KEYS,
} from '../utils/platformSettings';

const D = PLATFORM_SETTING_DEFAULTS;

describe('parseBoundedNumber', () => {
  test.each([
    [18, 0, 28, undefined, 18],
    ['10', 0, 28, undefined, 10], // numeric string accepted
    [0, 0, 28, undefined, 0], // lower edge allowed
    [28, 0, 28, undefined, 28], // upper edge allowed
    [1.25, 0, 28, undefined, 1.25], // 2dp allowed
    [1.5, 0, 100, 1, 1.5], // 1dp mode allowed
    [500, 1, 2000, 0, 500], // integer mode allowed
  ] as const)('%p in [%p, %p] (maxDecimals %p) → %p', (value, min, max, maxDecimals, expected) => {
    expect(parseBoundedNumber(value, min, max, maxDecimals)).toBe(expected);
  });

  test.each([
    [29, 0, 28, undefined], // over max
    [-1, 0, 28, undefined], // under min
    [1.255, 0, 28, undefined], // 3rd decimal rejected
    [1.55, 0, 100, 1], // 1dp mode rejects 2dp
    [500.5, 1, 2000, 0], // integer mode rejects fraction
    ['abc', 0, 28, undefined],
    [undefined, 0, 28, undefined],
    [NaN, 0, 28, undefined],
  ])('%p rejected → null', (value, min, max, maxDecimals) => {
    expect(parseBoundedNumber(value, min, max, maxDecimals)).toBeNull();
  });
});

describe('mergeSpeedMap (lenient read path: always a complete, usable map)', () => {
  test('undefined map returns the defaults unchanged', () => {
    expect(
      mergeSpeedMap(undefined, D.deliveryFees, { min: 0, max: 10000, maxDecimals: 2 }),
    ).toEqual(D.deliveryFees);
  });

  test('valid overrides win, junk falls back, missing keys fill, unknown keys drop', () => {
    const merged = mergeSpeedMap(
      { EXPRESS: 99, SAME_DAY: 'junk', PICKUP: 5, EXTRA: 7 },
      D.deliveryFees,
      { min: 0, max: 10000, maxDecimals: 2 },
    );
    expect(merged.EXPRESS).toBe(99);
    expect(merged.SAME_DAY).toBe(D.deliveryFees.SAME_DAY);
    expect(merged.PICKUP).toBe(5);
    expect(merged.STANDARD).toBe(D.deliveryFees.STANDARD);
    expect('EXTRA' in merged).toBe(false);
  });

  test('out-of-range override falls back to the default, never NaN', () => {
    const overRange = mergeSpeedMap(
      { EXPRESS: 99999 },
      D.deliveryFees,
      { min: 0, max: 10000, maxDecimals: 2 },
    );
    expect(overRange.EXPRESS).toBe(D.deliveryFees.EXPRESS);
  });
});

describe('parseSpeedMapStrict (write path: all keys, all valid, else null)', () => {
  test('the shipped defaults validate against their own bounds', () => {
    expect(
      parseSpeedMapStrict(D.deliveryEtaHours, { min: 1, max: 168, maxDecimals: 0 }),
    ).toEqual(D.deliveryEtaHours);
  });

  test.each([
    [{ STANDARD: 1, EXPRESS: 2, SAME_DAY: 3 }, { min: 0, max: 10, maxDecimals: 0 }], // missing key
    [{ STANDARD: 0, EXPRESS: 50, SAME_DAY: 120, PICKUP: 99999 }, { min: 0, max: 10000, maxDecimals: 2 }], // out of range
    [undefined, { min: 0, max: 10, maxDecimals: 0 }],
    ['fast', { min: 0, max: 10, maxDecimals: 0 }],
  ] as const)('%p rejected → null', (input, bounds) => {
    expect(parseSpeedMapStrict(input, bounds)).toBeNull();
  });
});

describe('platformValuesFromMetadata: defaults on empty, overrides win', () => {
  test('empty metadata returns pure defaults', () => {
    expect(platformValuesFromMetadata({})).toEqual(D);
  });

  test('valid overrides win; untouched speeds and ETAs keep their defaults', () => {
    const over = platformValuesFromMetadata({
      gstRatePercent: 5,
      assignRadiusKm: 25,
      walletMaxCredit: 50000,
      walletMaxBatchSize: 100,
      platformFeeMax: 2000,
      deliveryFees: { EXPRESS: 75 },
      extra: 'ignored',
    });
    expect(over.gstRatePercent).toBe(5);
    expect(over.assignRadiusKm).toBe(25);
    expect(over.walletMaxCredit).toBe(50000);
    expect(over.walletMaxBatchSize).toBe(100);
    expect(over.platformFeeMax).toBe(2000);
    expect(over.deliveryFees.EXPRESS).toBe(75);
    expect(over.deliveryFees.SAME_DAY).toBe(D.deliveryFees.SAME_DAY);
    expect(over.deliveryEtaHours.STANDARD).toBe(D.deliveryEtaHours.STANDARD);
  });
});

describe('defaults must mirror the order helpers’ fallback constants', () => {
  // If a settings default drifts from the constant the quote used before any
  // settings doc existed, the first admin save silently changes every quote.
  const helpers = readFileSync(
    join(__dirname, '..', 'modules', 'orders', 'orders.helpers.ts'),
    'utf8',
  );
  const helpersNum = (re: RegExp) => Number(helpers.match(re)?.[1]);

  test('GST default matches GST_RATE', () => {
    expect(helpersNum(/GST_RATE = ([\d.]+)/)).toBe(D.gstRatePercent / 100);
  });

  test.each(SPEED_KEYS)('%s: delivery fee + ETA defaults match the helpers’ constants', (speed) => {
    const feesBlock = helpers.slice(
      helpers.indexOf('DELIVERY_FEES'),
      helpers.indexOf('ESTIMATED_DELIVERY_HOURS'),
    );
    const etaBlock = helpers.slice(helpers.indexOf('ESTIMATED_DELIVERY_HOURS'));
    expect(Number(feesBlock.match(new RegExp(`${speed}: (\\d+)`))?.[1])).toBe(D.deliveryFees[speed]);
    expect(Number(etaBlock.match(new RegExp(`${speed}: (\\d+)`))?.[1])).toBe(
      D.deliveryEtaHours[speed],
    );
  });
});
