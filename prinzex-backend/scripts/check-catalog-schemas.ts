/**
 * Runnable check for the stapling-options catalogue schema: the mandatory
 * order-page radio requires a free 'loose' row first, so the write-time
 * validation must enforce it while accepting ordinary admin edits.
 *
 *   npx tsx scripts/check-catalog-schemas.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import { CATALOG_GROUP_SCHEMAS } from '../src/modules/catalog/catalog.schemas';

const stapling = CATALOG_GROUP_SCHEMAS['stapling-options'];
assert.ok(stapling, 'stapling-options schema registered (missing key = admin save 400s)');

const defaults = [
  { value: 'loose', label: 'Loose Sheet', hint: 'No binding — sheets stay as-is', price: 0 },
  { value: 'corner-stapling', label: 'Corner Stapling', hint: 'Single staple at the top-left corner', price: 5 },
  { value: 'side-stapling', label: 'Side Stapling', hint: 'Staples along the left edge', price: 10 },
];

/* Shipped defaults and ordinary admin edits (relabel, reprice, add row). */
assert.ok(stapling.safeParse(defaults).success);
assert.ok(
  stapling.safeParse([...defaults, { value: 'top-stapling', label: 'Top Stapling', price: 7 }]).success,
);
assert.ok(
  stapling.safeParse([{ value: 'loose', label: 'Loose Sheet', price: 0 }]).success,
); // loose-only is fine
assert.ok(stapling.safeParse(defaults.map((r, i) => (i === 0 ? r : { ...r, price: r.price + 1 }))).success); // repricing add-ons

/* Every way to break the mandatory radio invariant must fail. */
assert.ok(!stapling.safeParse(defaults.slice(1)).success); // loose deleted
assert.ok(!stapling.safeParse([defaults[1], defaults[0], defaults[2]]).success); // loose moved
assert.ok(!stapling.safeParse([{ ...defaults[0], price: 3 }, ...defaults.slice(1)]).success); // loose priced

console.log('catalog schema checks: OK');
