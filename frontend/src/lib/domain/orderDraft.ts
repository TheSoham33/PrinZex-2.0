/**
 * Order-page draft persistence: the /stores/[id]/order flow — current step,
 * specifications, delivery address, payment choice — survives a page
 * refresh via localStorage.
 *
 * The one thing a refresh CANNOT keep is a browser-side file (raw PDF or
 * image picked from disk — the browser revokes it); only files that already
 * reached the server (Office uploads converted at attach time) are kept in
 * the draft. The count of dropped browser files rides along so the page can
 * ask the user to re-attach just those.
 */

import type { OrderState } from '@/components/order/orderReducer';

export const ORDER_DRAFT_VERSION = 1;
/** Drafts older than this are ignored — stale addresses/quotes must not
 *  resurrect days later. */
export const ORDER_DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

export interface OrderDraft {
  version: number;
  storeId: string;
  savedAt: number;
  step: number;
  agreed: boolean;
  couponCode: string;
  /** Browser-only files dropped from the saved list (re-attach needed). */
  droppedFiles: number;
  order: OrderState['order'];
}

/** Per-store AND per-user: a shared PC must never hand one account's
 *  delivery address/payment choice to the next login. */
export function orderDraftKey(storeId: string, userId: string | null | undefined): string {
  return `prinzex:order-draft:${storeId}:${userId ?? 'guest'}`;
}

interface DraftFile {
  name: string;
  size: number;
  type: string;
  pages?: number;
  serverFileUrl?: string;
}

/** Reducer state → serializable draft: strip File/blob references, keep
 *  only server-backed files and re-derive the page totals from them (page
 *  references like colorPages pointed at now-dead browser files). Pure. */
export function serializeDraft(
  state: OrderState,
  extras: { agreed: boolean; couponCode: string },
): OrderDraft {
  const files = (state.order.files ?? []) as DraftFile[];
  const keepable = files
    .filter(
      (file) => typeof file.serverFileUrl === 'string' && file.serverFileUrl.length > 0,
    )
    .map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      serverFileUrl: file.serverFileUrl as string,
      ...(typeof file.pages === 'number' ? { pages: file.pages } : {}),
    }));
  const totalPages = keepable.reduce((sum, file) => sum + (file.pages ?? 0), 0);
  const step =
    Number.isInteger(state.step) ? Math.min(3, Math.max(1, state.step)) : 1;

  return {
    version: ORDER_DRAFT_VERSION,
    storeId: (state.order.storeId as string | undefined) ?? '',
    savedAt: Date.now(),
    step,
    agreed: extras.agreed,
    couponCode: extras.couponCode,
    droppedFiles: files.length - keepable.length,
    order: {
      ...state.order,
      files: keepable,
      specifications: {
        ...(state.order.specifications as unknown as Record<string, unknown>),
        totalPages,
        colorPages: '',
      } as OrderState['order']['specifications'],
      // Cost is derived data — the quote/estimate recomputes after restore.
      costBreakdown: undefined,
    },
  };
}

/** localStorage text → a draft usable on THIS store's order page, or null.
 *  Guards: version match, store match, freshness, minimal shape. Pure. */
export function parseOrderDraft(
  raw: string | null,
  storeId: string,
  now = Date.now(),
): OrderDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderDraft> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== ORDER_DRAFT_VERSION || parsed.storeId !== storeId) return null;
    if (
      typeof parsed.savedAt !== 'number' ||
      now - parsed.savedAt > ORDER_DRAFT_TTL_MS ||
      now - parsed.savedAt < -60_000
    ) {
      return null;
    }
    const order = parsed.order;
    if (!order || typeof order !== 'object') return null;
    const step =
      typeof parsed.step === 'number' ? Math.min(3, Math.max(1, Math.trunc(parsed.step))) : 1;
    return {
      version: ORDER_DRAFT_VERSION,
      storeId,
      savedAt: parsed.savedAt,
      step,
      agreed: parsed.agreed === true,
      couponCode: typeof parsed.couponCode === 'string' ? parsed.couponCode : '',
      droppedFiles:
        typeof parsed.droppedFiles === 'number' ? Math.max(0, parsed.droppedFiles) : 0,
      order,
    };
  } catch {
    return null;
  }
}

/* localStorage wrappers — storage may be full or blocked (private mode);
 * a preference exception must never break checkout, so everything here is
 * best-effort and silent. */

export function loadOrderDraft(key: string, storeId: string): OrderDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseOrderDraft(window.localStorage.getItem(key), storeId);
  } catch {
    return null;
  }
}

export function saveOrderDraft(key: string, draft: OrderDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — drafts are best-effort */
  }
}

export function clearOrderDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}
