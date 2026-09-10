/**
 * Guard: seeded demo data must let auto-assignment succeed out of the box.
 * autoAssignDelivery picks riders from ONLINE_DELIVERY_BOYS(order.seller.city)
 * within AUTO_ASSIGN_RADIUS_KM of the store — so a seed where seller and
 * rider city strings differ, or all riders sit outside the radius, silently
 * parks every delivery as pending_assignment.
 *
 * Run: npx tsx scripts/check-delivery-geo.ts   (from prinzex-backend)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { haversineDistanceKm } from '../src/utils/geo';

const root = join(__dirname, '..');
const seed = readFileSync(join(root, 'prisma', 'seed.ts'), 'utf8');

const block = (src: string, start: string, end: string) => src.slice(src.indexOf(start), src.indexOf(end));
const num = (s: string | undefined) => (s === undefined ? null : Number(s));

// Radius comes from the settings defaults (parsed as text — importing the
// module would drag in mongo/env config). The seed must self-assign under
// the DEFAULT radius; an admin override can only widen it.
const settingsUtil = readFileSync(join(root, 'src/utils/platformSettings.ts'), 'utf8');
const radius = num(settingsUtil.match(/assignRadiusKm: (\d+)/)?.[1]);
assert.ok(radius, 'could not read the default assignRadiusKm');

// City strings must match byte-for-byte (Redis presence set is keyed by them).
const windowAfter = (marker: string) => seed.slice(seed.indexOf(marker), seed.indexOf(marker) + 3000);
const sellerCity = windowAfter('prisma.seller.create').match(/city: '([^']+)'/)?.[1];
const riderCity = windowAfter('prisma.deliveryBoy.create').match(/city: '([^']+)'/)?.[1];
assert.ok(sellerCity && riderCity, 'could not read seller/rider city from the create blocks');
assert.equal(sellerCity, riderCity, `seller city "${sellerCity}" != rider city "${riderCity}"`);

// Every store needs at least one seeded rider within the assign radius.
const sellersBlock = block(seed, 'const SELLERS', 'for (const s of SELLERS)');
const stores = [...sellersBlock.matchAll(/storeName: '([^']+)'[\s\S]*?lat: ([\d.]+),\s*lng: ([\d.]+),/g)]
  .map((m) => ({ name: m[1], lat: Number(m[2]), lng: Number(m[3]) }));
const ridersBlock = block(seed, 'const DELIVERY_BOYS', 'for (const d of DELIVERY_BOYS)');
const riders = [...ridersBlock.matchAll(/name: '([^']+)'[\s\S]*?currentLat: ([\d.]+),\s*currentLng: ([\d.]+),/g)]
  .map((m) => ({ name: m[1], lat: Number(m[2]), lng: Number(m[3]) }));
assert.ok(stores.length > 0 && riders.length > 0, 'expected seeded stores and riders');

for (const store of stores) {
  const nearest = Math.min(...riders.map((r) => haversineDistanceKm(store.lat, store.lng, r.lat, r.lng)));
  assert.ok(nearest <= radius, `${store.name}: nearest rider ${nearest.toFixed(2)}km > ${radius}km`);
}

console.log(`OK: ${riders.length} riders in ${sellerCity} cover all ${stores.length} stores within ${radius}km.`);
