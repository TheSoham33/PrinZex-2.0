/**
 * Guard for the store-listing geolocation (gap #8 — "Store listing default
 * location hardcoded"): the listing must resolve real user coordinates, fall
 * back to Kolkata gracefully, and remember the last location — never show
 * every visitor Kolkata-based distances.
 *
 *   · the fallback is the platform default (Kolkata)
 *   · remembered-location parsing is strict (bad JSON / wrong types /
 *     out-of-range coords all rejected)
 *   · the listing resolves location via useUserLocation and no longer embeds
 *     the hardcoded demo coordinate
 *
 * Run from the frontend root: npx tsx scripts/check-store-location.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KOLKATA_COORDS,
  LOCATION_STORAGE_KEY,
  fallbackLocation,
  isValidCoordinates,
  parseRememberedLocation,
} from '../src/lib/geo/location';

// ── the graceful fallback is Kolkata ───────────────────────────────────────
assert.deepEqual(KOLKATA_COORDS, { lat: 22.5726, lng: 88.3639 });
const fallback = fallbackLocation();
assert.equal(fallback.source, 'fallback');
assert.equal(fallback.label, 'Kolkata');

// ── remembered-location parsing is strict ──────────────────────────────────
assert.equal(parseRememberedLocation(null), null);
assert.equal(parseRememberedLocation('not json'), null);
assert.equal(parseRememberedLocation('{"lat":"x","lng":1}'), null, 'wrong types must be rejected');
assert.equal(parseRememberedLocation('{"lat":91,"lng":0}'), null, 'out-of-range latitude must be rejected');
assert.equal(parseRememberedLocation('{"lat":22,"lng":200}'), null, 'out-of-range longitude must be rejected');
const remembered = parseRememberedLocation(
  '{"lat":22.57,"lng":88.36,"label":"Kolkata","savedAt":"2026-09-12T00:00:00.000Z"}',
);
assert.ok(remembered, 'a valid saved location must parse');
assert.equal(remembered!.source, 'remembered');
assert.equal(remembered!.label, 'Kolkata');

// ── coordinate validation ──────────────────────────────────────────────────
assert.equal(isValidCoordinates(22.5, 88.3), true);
assert.equal(isValidCoordinates(NaN, 88.3), false);
assert.equal(isValidCoordinates(22.5, 200), false);
assert.equal(isValidCoordinates('22.5', 88.3), false);

// ── storage key follows the repo's prinzex_ namespace ──────────────────────
assert.ok(LOCATION_STORAGE_KEY.startsWith('prinzex_'));

// ── the listing uses the hook, not a hardcoded coordinate ──────────────────
const listing = readFileSync(join(__dirname, '..', 'src/app/stores/StoreListing.tsx'), 'utf8');
assert.ok(listing.includes('useUserLocation'), 'StoreListing must resolve location via useUserLocation');
assert.ok(
  !listing.includes('{ lat: 22.5726, lng: 88.3639 }'),
  'StoreListing must not hardcode the Kolkata demo coordinate',
);
assert.ok(listing.includes('userLat') && listing.includes('userLng'), 'distance params must come from the hook');

console.log('OK: store listing geolocates with a Kolkata fallback and remembers the last location.');
