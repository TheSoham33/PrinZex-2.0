'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  REJECTION_REASONS,
  SELLER_STATUS_LABELS,
  type SellerOrder,
} from '@/lib/domain/seller-orders';
import { updateOrderStatus, rejectOrder } from '@/lib/api/seller-orders';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconCheckCircle, IconX } from '@/components/icons';

interface OrderActionButtonsProps {
  order: SellerOrder;
  /** Announce status changes to assistive tech (owned by the parent list). */
  onAnnounce: (message: string) => void;
}

/**
 * The single forward transition available from each seller-managed status.
 * Mirrors the backend state machine: placed → confirmed → processing →
 * ready_for_pickup (delivery takes over after that).
 */
const NEXT_ACTION: Record<string, { next: string; label: string }> = {
  confirmed: { next: 'processing', label: 'Start processing' },
  processing: { next: 'ready_for_pickup', label: 'Mark ready for pickup' },
};

export default function OrderActionButtons({ order, onAnnounce }: OrderActionButtonsProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [pending, setPending] = useState(false);

  /** Optimistically write a status into every cached view of this order. */
  const patchCachedOrder = (next: string) => {
    // The `['seller-orders']` cache holds the paginated envelope
    // `{ data: [...], pagination }` (not a bare array), so handle both shapes.
    const apply = (cached: unknown): unknown => {
      if (Array.isArray(cached)) {
        return cached.map((entry: SellerOrder) =>
          entry.id === order.id ? { ...entry, status: next } : entry,
        );
      }
      if (cached && typeof cached === 'object' && Array.isArray((cached as any).data)) {
        return {
          ...(cached as object),
          data: (cached as any).data.map((entry: SellerOrder) =>
            entry.id === order.id ? { ...entry, status: next } : entry,
          ),
        };
      }
      return cached;
    };

    queryClient.setQueryData(['seller-orders'], apply);
    queryClient.setQueryData(['seller-order', order.id], (current: SellerOrder | null) =>
      current ? { ...current, status: next } : current,
    );
  };

  const setStatus = async (next: string) => {
    const previous = order.status;
    patchCachedOrder(next);
    onAnnounce(`Order ${order.id} marked as ${SELLER_STATUS_LABELS[next] ?? next}`);
    setPending(true);
    try {
      await updateOrderStatus(order.id, next);
      showToast(`Order ${order.id} ${SELLER_STATUS_LABELS[next] ?? next}`);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-order', order.id] });
    } catch (err: any) {
      patchCachedOrder(previous); // roll back the optimistic update
      showToast(err?.message || 'Failed to update order');
    } finally {
      setPending(false);
    }
  };

  const confirmReject = async () => {
    const finalReason = reason === 'Other' ? otherReason.trim() : reason;
    if (reason === 'Other' && !finalReason) return;

    const previous = order.status;
    patchCachedOrder('cancelled');
    onAnnounce(`Order ${order.id} cancelled`);
    setRejecting(false);
    setOtherReason('');
    setPending(true);
    try {
      await rejectOrder(order.id, finalReason);
      showToast('Order rejected and cancelled');
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-order', order.id] });
    } catch (err: any) {
      patchCachedOrder(previous); // roll back the optimistic update
      showToast(err?.message || 'Failed to reject order');
    } finally {
      setPending(false);
    }
  };

  const isNew = order.status === 'new' || order.status === 'placed';

  if (isNew) {
    if (rejecting) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">Why are you rejecting this order?</p>

          <div className="mt-3 space-y-2">
            {[...REJECTION_REASONS, 'Other'].map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name={`reject-reason-${order.id}`}
                  checked={reason === option}
                  onChange={() => setReason(option)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                />
                {option}
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <div className="mt-3">
              <label htmlFor={`other-${order.id}`} className="sr-only">
                Describe the reason
              </label>
              <input
                id={`other-${order.id}`}
                type="text"
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                placeholder="Tell the customer what went wrong"
                className="input"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmReject}
              disabled={pending || (reason === 'Other' && !otherReason.trim())}
              className="btn bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? 'Rejecting…' : 'Confirm rejection'}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={pending}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('confirmed')}
          disabled={pending}
          className="btn bg-green-600 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          <IconCheckCircle className="h-4 w-4" /> {pending ? 'Accepting…' : 'Accept order'}
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={pending}
          className="btn border border-red-300 bg-white text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <IconX className="h-4 w-4" /> Reject
        </button>
      </div>
    );
  }

  const action = NEXT_ACTION[order.status];
  if (!action) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <IconAlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
        No further action needed for this order.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setStatus(action.next)}
      disabled={pending}
      className="btn-primary text-sm disabled:opacity-50"
    >
      {pending ? 'Updating…' : action.label}
    </button>
  );
}
