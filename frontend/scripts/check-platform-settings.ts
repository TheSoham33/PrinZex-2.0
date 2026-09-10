/**
 * Runnable check for the DB-driven platform numbers on the storefront:
 *
 *   speedEtaLabel         → hours → speed-tile label ("Within 6 hours" / "2 days")
 *   applyDeliverySettings → admin fee/ETA overlay onto the static speed tiles
 *   admin page bounds     → Settings → Platform client-side validation mirrors
 *                           the backend SETTING_BOUNDS (drift would let the UI
 *                           accept values the API then rejects, or vice versa)
 *
 * Run from the frontend root: npx tsx scripts/check-platform-settings.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyDeliverySettings, DELIVERY_SPEEDS, speedEtaLabel } from '../src/lib/domain/stores';

// ── speedEtaLabel ───────────────────────────────────────────────────────
assert.equal(speedEtaLabel(6), 'Within 6 hours');
assert.equal(speedEtaLabel(24), '1 day');
assert.equal(speedEtaLabel(48), '2 days');

// ── applyDeliverySettings ───────────────────────────────────────────────
const overlay = {
  deliveryFees: { STANDARD: 20, EXPRESS: 75, SAME_DAY: 150, PICKUP: 0 } as const,
  deliveryEtaHours: { STANDARD: 72, EXPRESS: 8, SAME_DAY: 4, PICKUP: 2 } as const,
};
const tuned = applyDeliverySettings(DELIVERY_SPEEDS, overlay);
const byKey = Object.fromEntries(tuned.map((o) => [o.key, o]));
assert.equal(byKey['standard'].cost, 20);
assert.equal(byKey['express'].cost, 75);
assert.equal(byKey['same-day'].cost, 150);
assert.equal(byKey['pickup'].cost, 0);
assert.equal(byKey['standard'].eta, '3 days');
assert.equal(byKey['express'].eta, 'Within 8 hours');
assert.equal(byKey['pickup'].eta, 'Within 2 hours');
assert.equal(tuned.length, DELIVERY_SPEEDS.length, 'every speed keeps its tile');

/* Untouched fields (label, description) survive the overlay. */
assert.equal(byKey['standard'].label, 'Standard Delivery');
assert.equal(byKey['same-day'].description, 'Order before 2 PM for same-day drop');

/* Missing settings pass the static defaults through untouched. */
assert.equal(applyDeliverySettings(DELIVERY_SPEEDS, null), DELIVERY_SPEEDS);
assert.equal(applyDeliverySettings(DELIVERY_SPEEDS, undefined), DELIVERY_SPEEDS);

// ── admin settings page mirrors the backend SETTING_BOUNDS ──────────────
const page = readFileSync(join(__dirname, '..', 'src/app/admin/settings/page.tsx'), 'utf8');
for (const snippet of [
  'withinBounds(platform.platformFeeMax, 1, 1_000_000, 2)',
  'withinBounds(platform.platformFee, 0, feeCeiling, 2)',
  'withinBounds(platform.gstRatePercent, 0, 28, 2)',
  'withinBounds(platform.deliveryFees[key], 0, 10_000, 2)',
  'withinBounds(platform.deliveryEtaHours[key], 1, 168, 0)',
  'withinBounds(platform.assignRadiusKm, 1, 100, 1)',
  'withinBounds(platform.walletMaxCredit, 1, 10_000_000, 2)',
  'withinBounds(platform.walletMaxBatchSize, 1, 2_000, 0)',
]) {
  assert.ok(page.includes(snippet), `admin settings bounds drifted — missing: ${snippet}`);
}

/* The save still sends the whole platform state — the backend replaces the
   full settings metadata on every PATCH, so a partial body would reset the
   other keys to invalid. */
assert.ok(
  page.includes('saveSettingsM.mutate(platform)'),
  'settings save must send the full platform state',
);

console.log('OK: delivery overlay + ETA labels + admin settings bounds mirror the backend.');
