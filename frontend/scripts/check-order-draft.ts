/**
 * Runnable check for the order-page draft persistence (step/specs/delivery/
 * payment survive a refresh; browser-only files are dropped + counted).
 *
 *   npx tsx scripts/check-order-draft.ts   (exits 1 on failure)
 */
import assert from 'node:assert/strict';
import {
  ORDER_DRAFT_TTL_MS,
  ORDER_DRAFT_VERSION,
  clearAllOrderDrafts,
  loadOrderDraft,
  orderDraftKey,
  parseOrderDraft,
  saveOrderDraft,
  serializeDraft,
} from '../src/lib/domain/orderDraft';
import { createInitialState } from '../src/components/order/orderReducer';

/* ── Key scoping ──────────────────────────────────────────────────────── */
assert.equal(orderDraftKey('store-1', 'user-9'), 'prinzex:order-draft:store-1:user-9');
assert.equal(orderDraftKey('store-1', null), 'prinzex:order-draft:store-1:guest');
assert.equal(orderDraftKey('store-1', undefined), 'prinzex:order-draft:store-1:guest');
assert.notEqual(orderDraftKey('store-1', 'a'), orderDraftKey('store-2', 'a'), 'per-store');
assert.notEqual(orderDraftKey('store-1', 'a'), orderDraftKey('store-1', 'b'), 'per-user');

/* ── Serialize: browser files drop, server files keep, totals recompute ── */
const state = createInitialState('store-1', 'Store One', 'doc-print', 1);
state.step = 3;
state.order.files = [
  { name: 'notes.pdf', size: 100, type: 'application/pdf', pages: 12, previewUrl: 'blob:x' },
  { name: 'chart.png', size: 50, type: 'image/png', pages: 1, previewUrl: 'blob:y' },
  { name: 'doc.docx', size: 80, type: 'application/msword', pages: 5, serverFileUrl: '/uploads/designs/d.pdf', previewUrl: '/media/d.pdf' },
];
(state.order.specifications as unknown as Record<string, unknown>).totalPages = 18;
(state.order.specifications as unknown as Record<string, unknown>).colorPages = '1-3';

const draft = serializeDraft(state, { agreed: true, couponCode: 'SAVE10' });
assert.equal(draft.storeId, 'store-1');
assert.equal(draft.step, 3);
assert.equal(draft.droppedFiles, 2, 'blob files counted as dropped');
const kept = (draft.order.files ?? []) as { name: string; serverFileUrl?: string; pages?: number; previewUrl?: string }[];
assert.equal(kept.length, 1, 'only the server-backed file survives');
assert.equal(kept[0].name, 'doc.docx');
assert.equal(kept[0].serverFileUrl, '/uploads/designs/d.pdf');
assert.ok(!('previewUrl' in kept[0]), 'blob/guest preview urls never persist');
assert.equal(
  (draft.order.specifications as unknown as Record<string, unknown>).totalPages,
  5,
  'page total recomputes from kept files only',
);
assert.equal((draft.order.specifications as unknown as Record<string, unknown>).colorPages, '', 'page refs reset');
assert.ok(!('costBreakdown' in (draft.order as unknown as Record<string, unknown>)) || draft.order.costBreakdown === undefined, 'derived cost not persisted');

/* Step clamps to the stepper's bounds (a tampered/future state can't land
 * on a nonexistent section). */
state.step = 9;
assert.equal(serializeDraft(state, { agreed: false, couponCode: '' }).step, 3);
state.step = 0;
assert.equal(serializeDraft(state, { agreed: false, couponCode: '' }).step, 1);

/* ── Parse: roundtrip, guards ─────────────────────────────────────────── */
const raw = JSON.stringify(draft);
const restored = parseOrderDraft(raw, 'store-1');
assert.ok(restored, 'roundtrip restores');
assert.equal(restored?.step, 3);
assert.equal(restored?.agreed, true);
assert.equal(restored?.couponCode, 'SAVE10');
assert.equal(restored?.droppedFiles, 2);

assert.equal(parseOrderDraft(raw, 'other-store'), null, 'store mismatch ignored');
assert.equal(
  parseOrderDraft(JSON.stringify({ ...draft, version: 999 }), 'store-1'),
  null,
  'version mismatch ignored',
);
assert.equal(
  parseOrderDraft(JSON.stringify({ ...draft, savedAt: Date.now() - ORDER_DRAFT_TTL_MS - 1000 }), 'store-1'),
  null,
  'expired drafts ignored',
);
assert.equal(
  parseOrderDraft(JSON.stringify({ ...draft, savedAt: Date.now() + 10 * 60_000 }), 'store-1'),
  null,
  'future timestamps (clock tampering) ignored',
);
assert.equal(parseOrderDraft('not-json', 'store-1'), null, 'junk JSON → null');
assert.equal(parseOrderDraft(null, 'store-1'), null, 'empty storage → null');
assert.equal(parseOrderDraft('"string"', 'store-1'), null, 'non-object → null');
assert.equal(parseOrderDraft(JSON.stringify({ ...draft, step: 8 }), 'store-1')?.step, 3, 'step re-clamped on load');
assert.equal(
  parseOrderDraft(JSON.stringify({ ...draft, agreed: 'yes' as unknown as boolean }), 'store-1')?.agreed,
  false,
  'non-boolean agreed defaults false',
);
assert.equal(ORDER_DRAFT_VERSION, 1, 'bump the version when the shape changes');

/* ── Sign-out wipe: every draft key goes, unrelated keys survive ─────── */
const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    get length() {
      return storage.size;
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  },
};
saveOrderDraft(orderDraftKey('store-1', 'user-9'), draft);
saveOrderDraft(orderDraftKey('store-1', null), draft);
saveOrderDraft(orderDraftKey('store-2', 'user-9'), { ...draft, storeId: 'store-2' });
storage.set('prinzex_auth_state', '{}');
assert.ok(loadOrderDraft(orderDraftKey('store-1', 'user-9'), 'store-1'), 'save/load roundtrip works');
clearAllOrderDrafts();
assert.equal(loadOrderDraft(orderDraftKey('store-1', 'user-9'), 'store-1'), null, 'user draft wiped');
assert.equal(loadOrderDraft(orderDraftKey('store-1', null), 'store-1'), null, 'guest draft wiped');
assert.equal(loadOrderDraft(orderDraftKey('store-2', 'user-9'), 'store-2'), null, 'other store wiped too');
assert.ok(storage.has('prinzex_auth_state'), 'unrelated localStorage keys untouched');

console.log('order draft checks: OK');
