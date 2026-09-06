/**
 * Runnable check for multi-file order items:
 *
 *   migration rehearsal → the new fileUrls column exists, defaults to {},
 *                         and legacy fileUrl rows are backfilled (pg-mem,
 *                         real SQL from the migration file)
 *   catalogue policy    → serviceMaxFilesPerOrder: absent/junk = 1 (fails
 *                         closed to single-file), values clamp to 1..10
 *   payload bounds      → createOrderBody accepts a fileUrls list up to the
 *                         10-file hard ceiling and still accepts the legacy
 *                         single-fileUrl shape
 *
 *   npx tsx scripts/check-multi-file-order.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { newDb } from 'pg-mem';
import {
  MAX_FILES_PER_ORDER,
  serviceMaxFilesPerOrder,
} from '../src/modules/catalog/catalog.schemas';
import { CATALOG_GROUP_SCHEMAS } from '../src/modules/catalog/catalog.schemas';
import { createOrderBody } from '../src/modules/orders/orders.schema';

function assertSchemaBits() {
  assert.equal(MAX_FILES_PER_ORDER, 10, 'hard ceiling');

  /* Admin-catalog writes: the new knob validates; out-of-range values
     and junk are rejected at save time. */
  const schema = CATALOG_GROUP_SCHEMAS['service-categories'];
  assert.ok(schema, 'service-categories schema registered');
  const base = [{ id: 'documents', name: 'Documents', services: [{ id: 'doc-print', name: 'Document Printing' }] }];
  assert.ok(schema.safeParse(base).success, 'rows without the knob still save');
  assert.ok(
    schema.safeParse([
      { ...base[0], services: [{ ...base[0].services[0], maxFilesPerOrder: 5 }] },
    ]).success,
    'maxFilesPerOrder saves',
  );
  for (const bad of [0, 11, 2.5, '3']) {
    assert.equal(
      schema.safeParse([
        { ...base[0], services: [{ ...base[0].services[0], maxFilesPerOrder: bad }] },
      ]).success,
      false,
      `maxFilesPerOrder ${String(bad)} must fail validation`,
    );
  }

  /* Order-page reads are defensive: everything unusable fails CLOSED to 1. */
  const categories = [
    { id: 'documents', name: 'Documents', services: [{ id: 'doc-print', name: 'Document Printing', maxFilesPerOrder: 5 }] },
    { id: 'binding', name: 'Binding', services: [{ id: 'bind-spiral', name: 'Spiral Binding' }] },
  ];
  assert.equal(serviceMaxFilesPerOrder(categories, 'doc-print'), 5);
  assert.equal(serviceMaxFilesPerOrder(categories, 'bind-spiral'), 1, 'absent = single-file');
  assert.equal(serviceMaxFilesPerOrder(categories, 'missing-service'), 1);
  assert.equal(serviceMaxFilesPerOrder(undefined, 'doc-print'), 1);
  assert.equal(serviceMaxFilesPerOrder('junk', 'doc-print'), 1);
  assert.equal(serviceMaxFilesPerOrder(null, 'doc-print'), 1);
  assert.equal(
    serviceMaxFilesPerOrder([{ services: [{ id: 'x', maxFilesPerOrder: 2.5 }] }], 'x'),
    1,
    'fractions are unusable — fall back',
  );
}

/* A create-order payload, sliced down to the fields that matter here and
   padded out with the minimum the rest of the schema demands. */
function baseOrderPayload() {
  return {
    sellerId: 'seller-1',
    sellerServiceId: 'svc-1',
    quantity: 1,
    specifications: { paperType: 'standard', size: 'A4', quantity: 1, colorOption: 'bw' },
    deliveryAddressId: 'addr-1',
    deliverySpeed: 'STANDARD',
    paymentMethod: 'upi',
  };
}

function assertPayloadBounds() {
  const two = createOrderBody.safeParse({
    ...baseOrderPayload(),
    fileUrls: ['/uploads/designs/a.pdf', '/uploads/designs/b.pdf'],
  });
  assert.ok(two.success, `two-file payload should parse: ${two.success ? '' : two.error.message}`);

  assert.ok(
    createOrderBody.safeParse({ ...baseOrderPayload(), fileUrl: '/uploads/designs/a.pdf' }).success,
    'legacy single-file payload still parses',
  );

  assert.equal(
    createOrderBody.safeParse({
      ...baseOrderPayload(),
      fileUrls: Array.from({ length: MAX_FILES_PER_ORDER + 1 }, (_, i) => `/uploads/designs/${i}.pdf`),
    }).success,
    false,
    'payloads beyond the hard ceiling must be rejected before service-side policy',
  );

  assert.equal(
    createOrderBody.safeParse({ ...baseOrderPayload(), fileUrls: [''] }).success,
    false,
    'empty file URLs are junk',
  );
}

function rehearseMigration() {
  const migration = fs.readFileSync(
    path.join(__dirname, '../prisma/migrations/20260910000000_multi_file_order_items/migration.sql'),
    'utf8',
  );

  const db = newDb();
  db.public.none('CREATE TABLE "OrderItem" (id text PRIMARY KEY, "fileUrl" text)');
  db.public.none(
    `INSERT INTO "OrderItem" (id, "fileUrl") VALUES ('legacy', '/uploads/designs/old.pdf'), ('nofile', NULL)`,
  );

  // ponytail: pg-mem's none() runs one statement at a time — split the
  // migration the same way the runner would.
  for (const statement of migration
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean)) {
    db.public.none(statement);
  }

  // ponytail: pg-mem ≠ real Postgres — an ARRAY[...] expression materialises
  // as a true array, but a column DEFAULT ('{}') comes back as its literal
  // text. Both are the empty array; accept either representation.
  const isEmptyArray = (value: unknown) =>
    (Array.isArray(value) && value.length === 0) || value === '{}';

  const rows = db.public.many('SELECT id, "fileUrls" FROM "OrderItem" ORDER BY id') as Array<{
    id: string;
    fileUrls: unknown;
  }>;
  assert.deepEqual(
    rows.find((r) => r.id === 'legacy')?.fileUrls,
    ['/uploads/designs/old.pdf'],
    'existing fileUrl rows backfill into the array',
  );
  assert.ok(
    isEmptyArray(rows.find((r) => r.id === 'nofile')?.fileUrls),
    'rows without a file keep an empty array',
  );

  db.public.none(`INSERT INTO "OrderItem" (id) VALUES ('new-default')`);
  assert.ok(
    isEmptyArray(
      (db.public.many(`SELECT "fileUrls" FROM "OrderItem" WHERE id = 'new-default'`) as Array<{
        fileUrls: unknown;
      }>)[0]?.fileUrls,
    ),
    'column default keeps inserts that omit it working',
  );
}

function main() {
  assertSchemaBits();
  assertPayloadBounds();
  rehearseMigration();
  console.log('check-multi-file-order: OK');
}

main();
