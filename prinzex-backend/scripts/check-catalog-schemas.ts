/**
 * Runnable check for the stapling-options catalogue schema: the mandatory
 * order-page radio requires a free 'loose' row first, so the write-time
 * validation must enforce it while accepting ordinary admin edits.
 *
 *   npx tsx scripts/check-catalog-schemas.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import {
  CATALOG_GROUP_SCHEMAS,
  searchServiceIds,
  serviceIsActive,
} from '../src/modules/catalog/catalog.schemas';

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

/* ── Service kill switch (service-categories) ────────────────────────────
 * isActive is optional so rows predating the flag keep validating; only an
 * explicit false takes a service offline, everything else fails open. */
const categories = CATALOG_GROUP_SCHEMAS['service-categories'];
assert.ok(categories, 'service-categories schema registered');
const sampleCategories = [
  {
    id: 'documents',
    name: 'Documents',
    services: [
      { id: 'doc-print', name: 'Document Printing' },
      { id: 'bind-tape', name: 'Tape Binding', isActive: false },
      { id: 'cards-business', name: 'Business Cards', isActive: true, maxFilesPerOrder: 2 },
    ],
  },
];
assert.ok(categories.safeParse(sampleCategories).success, 'isActive true/false/absent all validate');

assert.equal(serviceIsActive(sampleCategories, 'doc-print'), true, 'absent = active');
assert.equal(serviceIsActive(sampleCategories, 'bind-tape'), false, 'explicit false = off');
assert.equal(serviceIsActive(sampleCategories, 'cards-business'), true);
assert.equal(serviceIsActive(sampleCategories, 'no-such-service'), true, 'unknown service fails open');
assert.equal(serviceIsActive(null, 'doc-print'), true, 'malformed group fails open');
assert.equal(serviceIsActive([], 'doc-print'), true, 'empty group fails open');

/* ── Admin search tags (service-categories) ───────────────────────────────
 * tags are optional; repeated / empty / oversized tag lists must fail
 * validation so a bad save never poisons search. searchServiceIds implements
 * the customer-search contract: service NAMES first, tags only when no name
 * matches ("xerox" finds the Printing service). */
const taggedCategories = [
  {
    id: 'documents',
    name: 'Documents',
    services: [
      { id: 'doc-print', name: 'Document Printing', tags: ['xerox', 'photocopy'] },
      { id: 'spec-photo-prints', name: 'Photo Print', tags: ['photos'] },
      { id: 'bind-tape', name: 'Tape Binding', isActive: false, tags: ['file binding'] },
      { id: 'pack-labels', name: 'Product Labels' }, // no tags — optional
    ],
  },
];
assert.ok(categories.safeParse(taggedCategories).success, 'tagged services validate');
assert.ok(
  !categories.safeParse([
    { id: 'c', name: 'C', services: [{ id: 's', name: 'S', tags: ['xerox', 'Xerox'] }] },
  ]).success,
  'repeated tags (any case) fail',
);
assert.ok(
  !categories.safeParse([
    { id: 'c', name: 'C', services: [{ id: 's', name: 'S', tags: [''] }] },
  ]).success,
  'empty tags fail',
);
assert.ok(
  !categories.safeParse([
    {
      id: 'c',
      name: 'C',
      services: [{ id: 's', name: 'S', tags: Array.from({ length: 13 }, (_, i) => `tag${i}`) }],
    },
  ]).success,
  'more than 12 tags fails',
);
assert.ok(
  !categories.safeParse([
    { id: 'c', name: 'C', services: [{ id: 's', name: 'S', tags: ['a'.repeat(31)] }] },
  ]).success,
  'tags over 30 characters fail',
);

assert.deepEqual(searchServiceIds(taggedCategories, 'xerox'), ['doc-print'], 'tag finds its service');
assert.deepEqual(searchServiceIds(taggedCategories, 'XEROX'), ['doc-print'], 'case-insensitive');
assert.deepEqual(
  searchServiceIds(taggedCategories, 'cheap xerox please'),
  ['doc-print'],
  'query containing a 3+ character tag still matches',
);
assert.deepEqual(
  searchServiceIds(taggedCategories, 'photos'),
  ['spec-photo-prints'],
  'exact tag match',
);
assert.deepEqual(
  searchServiceIds(taggedCategories, 'photo'),
  ['spec-photo-prints'],
  'a NAME hit wins — tags stay silent',
);
assert.deepEqual(
  searchServiceIds(taggedCategories, 'printing'),
  ['doc-print'],
  'name hit by name, not via tags',
);
assert.deepEqual(
  searchServiceIds(taggedCategories, 'file binding'),
  [],
  'a deactivated service (kill switch) matches nothing',
);
assert.deepEqual(searchServiceIds(taggedCategories, 'zzz'), [], 'no match is empty, not everything');
assert.deepEqual(searchServiceIds(null, 'xerox'), [], 'malformed group fails open');
assert.deepEqual(searchServiceIds(taggedCategories, '  '), [], 'blank query matches nothing');

console.log('catalog schema checks: OK');
