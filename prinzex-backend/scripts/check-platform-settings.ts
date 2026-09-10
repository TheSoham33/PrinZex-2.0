/**
 * Runnable check for the DB-driven platform numbers (Settings → Platform):
 * GST rate, delivery-speed fees/ETAs, assign radius, wallet credit limits,
 * platform-fee ceiling — all formerly hardcoded.
 *
 *   parsers   → bounded scalars, lenient per-speed map merge (read path),
 *               strict per-speed map validation (write path)
 *   defaults  → every code fallback mirrors the constants the order helpers
 *               still use when no settings doc exists (drift would silently
 *               change quotes after the first settings save)
 *
 * Run from the backend root: npx tsx scripts/check-platform-settings.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  mergeSpeedMap,
  parseBoundedNumber,
  parseSpeedMapStrict,
  PLATFORM_SETTING_DEFAULTS,
  platformValuesFromMetadata,
  SPEED_KEYS,
} from '../src/utils/platformSettings';

const D = PLATFORM_SETTING_DEFAULTS;

// ── parseBoundedNumber ──────────────────────────────────────────────────
assert.equal(parseBoundedNumber(18, 0, 28), 18);
assert.equal(parseBoundedNumber('10', 0, 28), 10, 'numeric string accepted');
assert.equal(parseBoundedNumber(0, 0, 28), 0, 'lower edge allowed');
assert.equal(parseBoundedNumber(28, 0, 28), 28, 'upper edge allowed');
assert.equal(parseBoundedNumber(29, 0, 28), null, 'over max rejected');
assert.equal(parseBoundedNumber(-1, 0, 28), null, 'under min rejected');
assert.equal(parseBoundedNumber(1.25, 0, 28), 1.25, '2dp allowed');
assert.equal(parseBoundedNumber(1.255, 0, 28), null, '3rd decimal rejected');
assert.equal(parseBoundedNumber(1.5, 0, 100, 1), 1.5, '1dp mode allowed');
assert.equal(parseBoundedNumber(1.55, 0, 100, 1), null, '1dp mode rejects 2dp');
assert.equal(parseBoundedNumber(500, 1, 2000, 0), 500, 'integer mode allowed');
assert.equal(parseBoundedNumber(500.5, 1, 2000, 0), null, 'integer mode rejects fraction');
assert.equal(parseBoundedNumber('abc', 0, 28), null);
assert.equal(parseBoundedNumber(undefined, 0, 28), null);
assert.equal(parseBoundedNumber(NaN, 0, 28), null);

// ── mergeSpeedMap (lenient read path: always a complete, usable map) ─────
assert.deepEqual(mergeSpeedMap(undefined, D.deliveryFees, { min: 0, max: 10000, maxDecimals: 2 }), D.deliveryFees);
const merged = mergeSpeedMap(
  { EXPRESS: 99, SAME_DAY: 'junk', PICKUP: 5, EXTRA: 7 },
  D.deliveryFees,
  { min: 0, max: 10000, maxDecimals: 2 },
);
assert.equal(merged.EXPRESS, 99, 'valid override wins');
assert.equal(merged.SAME_DAY, D.deliveryFees.SAME_DAY, 'junk falls back to default');
assert.equal(merged.PICKUP, 5);
assert.equal(merged.STANDARD, D.deliveryFees.STANDARD, 'missing key filled from default');
assert.ok(!('EXTRA' in merged), 'unknown keys dropped');
const overRange = mergeSpeedMap({ EXPRESS: 99999 }, D.deliveryFees, { min: 0, max: 10000, maxDecimals: 2 });
assert.equal(overRange.EXPRESS, D.deliveryFees.EXPRESS, 'out-of-range falls back, never NaN');

// ── parseSpeedMapStrict (write path: all keys, all valid, else null) ──────
assert.deepEqual(parseSpeedMapStrict(D.deliveryEtaHours, { min: 1, max: 168, maxDecimals: 0 }), D.deliveryEtaHours);
assert.equal(parseSpeedMapStrict({ STANDARD: 1, EXPRESS: 2, SAME_DAY: 3 }, { min: 0, max: 10, maxDecimals: 0 }), null, 'missing key rejected');
assert.equal(parseSpeedMapStrict({ STANDARD: 0, EXPRESS: 50, SAME_DAY: 120, PICKUP: 99999 }, { min: 0, max: 10000, maxDecimals: 2 }), null, 'out-of-range rejected');
assert.equal(parseSpeedMapStrict(undefined, { min: 0, max: 10, maxDecimals: 0 }), null);
assert.equal(parseSpeedMapStrict('fast', { min: 0, max: 10, maxDecimals: 0 }), null);

// ── platformValuesFromMetadata: defaults on empty, overrides win ─────────
assert.deepEqual(platformValuesFromMetadata({}), D, 'empty metadata returns pure defaults');
const over = platformValuesFromMetadata({ gstRatePercent: 5, assignRadiusKm: 25, walletMaxCredit: 50000, walletMaxBatchSize: 100, platformFeeMax: 2000, deliveryFees: { EXPRESS: 75 }, extra: 'ignored' });
assert.equal(over.gstRatePercent, 5);
assert.equal(over.assignRadiusKm, 25);
assert.equal(over.walletMaxCredit, 50000);
assert.equal(over.walletMaxBatchSize, 100);
assert.equal(over.platformFeeMax, 2000);
assert.equal(over.deliveryFees.EXPRESS, 75);
assert.equal(over.deliveryFees.SAME_DAY, D.deliveryFees.SAME_DAY, 'untouched speed keeps default');
assert.equal(over.deliveryEtaHours.STANDARD, D.deliveryEtaHours.STANDARD);

// ── defaults must mirror the order helpers' fallback constants ────────────
const helpers = readFileSync(join(__dirname, '..', 'src/modules/orders/orders.helpers.ts'), 'utf8');
const helpersNum = (re: RegExp) => Number(helpers.match(re)?.[1]);
assert.equal(helpersNum(/GST_RATE = ([\d.]+)/), D.gstRatePercent / 100, 'GST default drifted');
const feesBlock = helpers.slice(helpers.indexOf('DELIVERY_FEES'), helpers.indexOf('ESTIMATED_DELIVERY_HOURS'));
const etaBlock = helpers.slice(helpers.indexOf('ESTIMATED_DELIVERY_HOURS'));
for (const speed of SPEED_KEYS) {
  assert.equal(
    Number(feesBlock.match(new RegExp(`${speed}: (\\d+)`))?.[1]),
    D.deliveryFees[speed],
    `DELIVERY_FEES.${speed} drifted from the settings default`,
  );
  assert.equal(
    Number(etaBlock.match(new RegExp(`${speed}: (\\d+)`))?.[1]),
    D.deliveryEtaHours[speed],
    `ESTIMATED_DELIVERY_HOURS.${speed} drifted from the settings default`,
  );
}

console.log(`OK: platform settings parsers + defaults mirror quote fallbacks (${SPEED_KEYS.length} speeds, GST ${D.gstRatePercent}%).`);
