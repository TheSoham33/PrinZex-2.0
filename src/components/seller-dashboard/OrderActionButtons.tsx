'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  REJECTION_REASONS,
  SELLER_STATUS_LABELS,
  type SellerOrder,
  type SellerOrderStatus,
} from '@/lib/types/seller-orders';
import { IconAlertCircle, IconCheckCircle, IconX } from '@/components/icons';

interface OrderActionButtonsProps {
  order: SellerOrder;
  /** Announce status changes to assistive tech (owned by the parent list). */
  onAnnounce: (message: string) => void;
}

/** The single forward transition available from each status. */
const NEXT_ACTION: Partial<Record<SellerOrderStatus, { next: SellerOrderStatus; label: string }>> =
  {
    accepted: { next: 'processing', label: 'Start processing' },
    processing: { next: 'ready_for_pickup', label: 'Mark ready for pickup' },
    ready_for_pickup: { next: 'dispatched', label: 'Mark dispatched' },
  };

export default function OrderActionButtons({ order, onAnnounce }: OrderActionButtonsProps) {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');

  /**
   * Optimistic update: write straight into the TanStack Query cache so every
   * subscriber (list, detail page, sidebar badge) re-renders immediately.
   */
  const setStatus = (next: SellerOrderStatus) => {
    const apply = (orders: SellerOrder[] | undefined) =>
      (orders ?? []).map((entry) => (entry.id === order.id ? { ...entry, status: next } : entry));

    queryClient.setQueryData<SellerOrder[]>(['seller-orders'], apply);
    queryClient.setQueryData<SellerOrder | null>(['seller-order', order.id], (current) =>
      current ? { ...current, status: next } : current,
    );

    onAnnounce(`Order ${order.id} marked as ${SELLER_STATUS_LABELS[next]}`);
  };

  const confirmReject = () => {
    const finalReason = reason === 'Other' ? otherReason.trim() : reason;
    if (reason === 'Other' && !finalReason) return;

    setStatus('cancelled');
    setRejecting(false);
    setOtherReason('');
  };

  if (order.status === 'new') {
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
              disabled={reason === 'Other' && !otherReason.trim()}
              className="btn bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm rejection
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
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
          onClick={() => setStatus('accepted')}
          className="btn bg-green-600 text-sm text-white hover:bg-green-700"
        >
          <IconCheckCircle className="h-4 w-4" /> Accept order
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          className="btn border border-red-300 bg-white text-sm text-red-600 hover:bg-red-50"
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
      className="btn-primary text-sm"
    >
      {action.label}
    </button>
  );
}
