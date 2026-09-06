/**
 * Runnable check for multi-file orders (frontend):
 *
 *   policy lookup   → maxFilesForService: absent/junk data fails back to 1
 *                     (single-file), a configured count clamps to 1..10
 *   aggregation     → totalPagesOf sums pages across files for pricing
 *   order payload   → fileUrlsForOrder keeps the real converted URLs and
 *                     stubs browser-side files, one entry per file
 *   order flow      → the reducer carries a files[] list through SET_FILES
 *
 *   npx tsx scripts/check-multi-upload.ts
 */
import assert from 'node:assert/strict';
import {
  MAX_FILES_PER_ORDER,
  fileUrlsForOrder,
  maxFilesForService,
  totalPagesOf,
  type ServiceCatalogCategory,
} from '../src/lib/domain/files';
import {
  createInitialState,
  orderReducer,
} from '../src/components/order/orderReducer';

function assertPolicy() {
  assert.equal(MAX_FILES_PER_ORDER, 10, 'frontend mirror of the backend hard ceiling');

  const categories: ServiceCatalogCategory[] = [
    {
      id: 'documents',
      name: 'Documents',
      services: [{ id: 'doc-print', name: 'Document Printing', maxFilesPerOrder: 5 }],
    },
    {
      id: 'binding',
      name: 'Binding',
      services: [{ id: 'bind-spiral', name: 'Spiral Binding' }],
    },
  ];

  assert.equal(maxFilesForService(categories, 'doc-print'), 5);
  assert.equal(maxFilesForService(categories, 'bind-spiral'), 1, 'absent = single-file');
  assert.equal(maxFilesForService(categories, 'missing'), 1);
  assert.equal(maxFilesForService(undefined, 'doc-print'), 1);
  assert.equal(maxFilesForService(categories, undefined), 1);
  assert.equal(
    maxFilesForService(
      [{ id: 'x', name: 'X', services: [{ id: 's', name: 'S', maxFilesPerOrder: 99 }] }],
      's',
    ),
    MAX_FILES_PER_ORDER,
    'out-of-range values clamp to the ceiling',
  );
}

function assertAggregation() {
  assert.equal(totalPagesOf([]), 0);
  assert.equal(totalPagesOf([{ pages: 3 }, { pages: 1 }, {}]), 4, 'unknown counts contribute 0');
  assert.deepEqual(
    fileUrlsForOrder([{ serverFileUrl: '/uploads/designs/a.pdf' }, {}]),
    ['/uploads/designs/a.pdf', '/uploads/designs/demo.pdf'],
    'real URLs ride, browser files keep the stub',
  );
}

function assertReducer() {
  const initial = createInitialState('store-1', 'Store', 'doc-print');
  assert.deepEqual(initial.order.files, [], 'orders start without files');

  const withFile = orderReducer(initial, {
    type: 'SET_FILES',
    payload: [{ name: 'a.pdf', size: 10, type: 'application/pdf', pages: 3 }],
  });
  assert.equal(withFile.order.files?.length, 1);
  assert.equal(withFile.order.files?.[0]?.pages, 3);

  const cleared = orderReducer(withFile, { type: 'SET_FILES', payload: [] });
  assert.deepEqual(cleared.order.files, []);
}

assertPolicy();
assertAggregation();
assertReducer();
console.log('check-multi-upload: OK');
