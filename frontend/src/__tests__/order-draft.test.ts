/**
 * Order-page draft persistence — ported 1:1 from
 * scripts/check-order-draft.ts: step/specs/delivery/payment survive a
 * refresh; browser-only files are dropped + counted; tampered, expired,
 * future-dated and wrong-store payloads are ignored.
 */
import {
  ORDER_DRAFT_TTL_MS,
  ORDER_DRAFT_VERSION,
  clearAllOrderDrafts,
  loadOrderDraft,
  orderDraftKey,
  parseOrderDraft,
  saveOrderDraft,
  serializeDraft,
} from '../lib/domain/orderDraft';
import { createInitialState } from '../components/order/orderReducer';

describe('orderDraftKey scoping', () => {
  test('per store, per user, guest fallback', () => {
    expect(orderDraftKey('store-1', 'user-9')).toBe('prinzex:order-draft:store-1:user-9');
    expect(orderDraftKey('store-1', null)).toBe('prinzex:order-draft:store-1:guest');
    expect(orderDraftKey('store-1', undefined)).toBe('prinzex:order-draft:store-1:guest');
    expect(orderDraftKey('store-1', 'a')).not.toBe(orderDraftKey('store-2', 'a'));
    expect(orderDraftKey('store-1', 'a')).not.toBe(orderDraftKey('store-1', 'b'));
  });
});

describe('serializeDraft', () => {
  const state = createInitialState('store-1', 'Store One', 'doc-print', 1);
  state.step = 3;
  state.order.files = [
    { name: 'notes.pdf', size: 100, type: 'application/pdf', pages: 12, previewUrl: 'blob:x' },
    { name: 'chart.png', size: 50, type: 'image/png', pages: 1, previewUrl: 'blob:y' },
    {
      name: 'doc.docx',
      size: 80,
      type: 'application/msword',
      pages: 5,
      serverFileUrl: '/uploads/designs/d.pdf',
      previewUrl: '/media/d.pdf',
    },
  ];
  (state.order.specifications as unknown as Record<string, unknown>).totalPages = 18;
  (state.order.specifications as unknown as Record<string, unknown>).colorPages = '1-3';

  const draft = serializeDraft(state, { agreed: true, couponCode: 'SAVE10' });

  test('identity + step survive', () => {
    expect(draft.storeId).toBe('store-1');
    expect(draft.step).toBe(3);
  });

  test('browser-only files drop (and are counted); server files keep', () => {
    expect(draft.droppedFiles).toBe(2);
    const kept = (draft.order.files ?? []) as {
      name: string;
      serverFileUrl?: string;
      previewUrl?: string;
    }[];
    expect(kept.length).toBe(1);
    expect(kept[0].name).toBe('doc.docx');
    expect(kept[0].serverFileUrl).toBe('/uploads/designs/d.pdf');
    expect('previewUrl' in kept[0]).toBe(false);
  });

  test('page total recomputes from kept files only; colour refs reset', () => {
    expect((draft.order.specifications as unknown as Record<string, unknown>).totalPages).toBe(5);
    expect((draft.order.specifications as unknown as Record<string, unknown>).colorPages).toBe('');
    expect(
      'costBreakdown' in (draft.order as unknown as Record<string, unknown>)
        ? (draft.order as unknown as Record<string, unknown>).costBreakdown
        : undefined,
    ).toBeUndefined();
  });

  test('step clamps to the stepper bounds on save', () => {
    state.step = 9;
    expect(serializeDraft(state, { agreed: false, couponCode: '' }).step).toBe(3);
    state.step = 0;
    expect(serializeDraft(state, { agreed: false, couponCode: '' }).step).toBe(1);
  });
});

describe('parseOrderDraft', () => {
  const state = createInitialState('store-1', 'Store One', 'doc-print', 1);
  state.step = 3;
  const draft = serializeDraft(state, { agreed: true, couponCode: 'SAVE10' });
  const raw = JSON.stringify(draft);

  test('roundtrip restores step/agreed/coupon', () => {
    const restored = parseOrderDraft(raw, 'store-1');
    expect(restored).toBeTruthy();
    expect(restored?.step).toBe(3);
    expect(restored?.agreed).toBe(true);
    expect(restored?.couponCode).toBe('SAVE10');
  });

  test('store mismatch ignored', () => {
    expect(parseOrderDraft(raw, 'other-store')).toBeNull();
  });

  test('version mismatch ignored', () => {
    expect(parseOrderDraft(JSON.stringify({ ...draft, version: 999 }), 'store-1')).toBeNull();
  });

  test('expired and future-dated drafts ignored (clock tampering)', () => {
    expect(
      parseOrderDraft(
        JSON.stringify({ ...draft, savedAt: Date.now() - ORDER_DRAFT_TTL_MS - 1000 }),
        'store-1',
      ),
    ).toBeNull();
    expect(
      parseOrderDraft(JSON.stringify({ ...draft, savedAt: Date.now() + 10 * 60_000 }), 'store-1'),
    ).toBeNull();
  });

  test('junk payloads → null', () => {
    expect(parseOrderDraft('not-json', 'store-1')).toBeNull();
    expect(parseOrderDraft(null, 'store-1')).toBeNull();
    expect(parseOrderDraft('"string"', 'store-1')).toBeNull();
  });

  test('step re-clamps on load; non-boolean agreed defaults false', () => {
    expect(parseOrderDraft(JSON.stringify({ ...draft, step: 8 }), 'store-1')?.step).toBe(3);
    expect(
      parseOrderDraft(JSON.stringify({ ...draft, agreed: 'yes' as unknown as boolean }), 'store-1')
        ?.agreed,
    ).toBe(false);
  });

  test('draft shape version is pinned', () => {
    expect(ORDER_DRAFT_VERSION).toBe(1);
  });
});

describe('sign-out wipe (clearAllOrderDrafts)', () => {
  // Minimal localStorage backed by a Map — orderDraft touches window lazily.
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

  test('every draft key goes, unrelated keys survive', () => {
    const state = createInitialState('store-1', 'Store One', 'doc-print', 1);
    const draft = serializeDraft(state, { agreed: false, couponCode: '' });
    saveOrderDraft(orderDraftKey('store-1', 'user-9'), draft);
    saveOrderDraft(orderDraftKey('store-1', null), draft);
    saveOrderDraft(orderDraftKey('store-2', 'user-9'), { ...draft, storeId: 'store-2' });
    storage.set('prinzex_auth_state', '{}');

    expect(loadOrderDraft(orderDraftKey('store-1', 'user-9'), 'store-1')).toBeTruthy();

    clearAllOrderDrafts();

    expect(loadOrderDraft(orderDraftKey('store-1', 'user-9'), 'store-1')).toBeNull();
    expect(loadOrderDraft(orderDraftKey('store-1', null), 'store-1')).toBeNull();
    expect(loadOrderDraft(orderDraftKey('store-2', 'user-9'), 'store-2')).toBeNull();
    expect(storage.has('prinzex_auth_state')).toBe(true);
  });
});
