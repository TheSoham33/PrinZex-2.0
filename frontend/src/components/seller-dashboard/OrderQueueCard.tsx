'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SellerOrder } from '@/lib/domain/seller-orders';
import {
  SELLER_STATUS_DOT,
  SELLER_STATUS_LABELS,
  SELLER_STATUS_STYLES,
} from '@/lib/domain/seller-orders';
import { formatCurrency, timeAgo } from '@/lib/utils';
import OrderActionButtons from './OrderActionButtons';
import { IconChevronRight, IconZap } from '@/components/icons';

const NOTE_PREVIEW_LIMIT = 90;

interface OrderQueueCardProps {
  order: SellerOrder;
  onAnnounce: (message: string) => void;
}

export default function OrderQueueCard({ order, onAnnounce }: OrderQueueCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  // The backend returns `specialInstructions: null` when a customer leaves no
  // notes — normalize before measuring length.
  const notes = order.specialInstructions ?? '';
  const hasLongNote = notes.length > NOTE_PREVIEW_LIMIT;

  return (
    <article className="card p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm font-bold text-slate-900">{order.id}</h3>
            {order.isRush && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <IconZap className="h-3 w-3" /> Rush
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{order.customerName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{timeAgo(order.placedAt)}</p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
            SELLER_STATUS_STYLES[order.status]
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${SELLER_STATUS_DOT[order.status]}`} />
          {SELLER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="font-semibold text-slate-900">{order.serviceName}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{order.specifications}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Quantity</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{order.quantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Order total</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatCurrency(order.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Deadline</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {new Date(order.deadline).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </dd>
        </div>
      </dl>

      {notes && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Customer notes
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {hasLongNote && !showNotes
              ? `${notes.slice(0, NOTE_PREVIEW_LIMIT)}…`
              : notes}
          </p>
          {hasLongNote && (
            <button
              type="button"
              onClick={() => setShowNotes((previous) => !previous)}
              aria-expanded={showNotes}
              className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {showNotes ? 'Hide notes' : 'Show notes'}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <OrderActionButtons order={order} onAnnounce={onAnnounce} />
        <Link
          href={`/seller/dashboard/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View full order <IconChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
