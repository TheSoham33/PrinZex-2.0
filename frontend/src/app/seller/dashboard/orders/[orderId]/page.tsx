'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerOrderById } from '@/lib/api/seller-orders';
import {
  HISTORY_STATUSES,
  SELLER_STATUS_DOT,
  SELLER_STATUS_FLOW,
  SELLER_STATUS_LABELS,
  SELLER_STATUS_STYLES,
  type SellerOrder,
} from '@/lib/domain/seller-orders';
import OrderActionButtons from '@/components/seller-dashboard/OrderActionButtons';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDateTime, maskPhone } from '@/lib/utils';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconFileText,
  IconMessageSquare,
  IconUser,
  IconX,
  IconZap,
} from '@/components/icons';
import { StateCard } from '@/components/ui';

interface Remaining {
  totalMs: number;
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

function computeRemaining(deadline: string): Remaining {
  const totalMs = Math.max(0, new Date(deadline).getTime() - Date.now());
  const totalSecs = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
  };
}

/**
 * Live deadline countdown. It ticks every second visually, but only pushes a
 * new string into the live region once a minute (or every tick under 5 minutes)
 * so screen readers aren't spammed.
 */
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedMinute = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const next = computeRemaining(deadline);
      setRemaining(next);

      const totalMinutes = Math.floor(next.totalMs / 60000);
      const urgent = next.totalMs < 5 * 60 * 1000;

      if (urgent || lastAnnouncedMinute.current !== totalMinutes) {
        lastAnnouncedMinute.current = totalMinutes;
        setAnnouncement(
          next.totalMs === 0
            ? 'Deadline passed'
            : `${next.days > 0 ? `${next.days} days ` : ''}${next.hours} hours ${next.mins} minutes remaining`,
        );
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  // Render nothing until the client has computed a value (avoids hydration drift).
  if (!remaining) {
    return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  }

  const overdue = remaining.totalMs === 0;
  const critical = remaining.totalMs > 0 && remaining.totalMs < 2 * 60 * 60 * 1000;

  return (
    <div
      className={`rounded-xl p-4 ${
        overdue || critical ? 'bg-red-50 ring-1 ring-inset ring-red-200' : 'bg-slate-50'
      }`}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <IconClock className="h-3.5 w-3.5" /> Time remaining
      </p>

      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${
          overdue || critical ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {overdue
          ? 'Deadline passed'
          : `${remaining.days > 0 ? `${remaining.days}d ` : ''}${String(remaining.hours).padStart(2, '0')}h ${String(
              remaining.mins,
            ).padStart(2, '0')}m ${String(remaining.secs).padStart(2, '0')}s`}
      </p>

      <p className="mt-1 text-xs text-slate-500">Due {formatDateTime(deadline)}</p>

      {/* Throttled announcements only. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function SellerTimeline({ order }: { order: SellerOrder }) {
  const cancelled = order.status === 'cancelled' || order.status === 'returned';
  const currentIndex = SELLER_STATUS_FLOW.indexOf(order.status);

  if (cancelled) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
        <IconX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <p className="font-semibold text-red-900">
            Order {SELLER_STATUS_LABELS[order.status].toLowerCase()}
          </p>
          <p className="mt-0.5 text-sm text-red-700">
            This order is closed and no further action is required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="relative">
      {SELLER_STATUS_FLOW.map((status, index) => {
        const done = index <= currentIndex;
        const last = index === SELLER_STATUS_FLOW.length - 1;

        return (
          <li key={status} className="relative flex gap-4 pb-5 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5 ${
                  index < currentIndex ? 'bg-blue-500' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${
                done ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {done ? (
                <IconCheckCircle className="h-4 w-4" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </span>
            <div className="pt-1">
              <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                {SELLER_STATUS_LABELS[status]}
              </p>
              {index === currentIndex && (
                <p className="mt-0.5 text-xs text-blue-600">Current stage</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { showToast } = useToast();
  const [announcement, setAnnouncement] = useState('');

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['seller-order', orderId],
    queryFn: () => fetchSellerOrderById(orderId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="card h-64 animate-pulse bg-slate-100" />
        <div className="card h-80 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl">
        <StateCard
          icon={IconAlertCircle}
          tone="error"
          title="Order not found"
          subtitle={<>No order matches the ID <span className="font-mono font-medium">{orderId}</span>.</>}
          action={
            <Link href="/seller/dashboard/orders" className="btn-primary mt-6">
              <IconArrowLeft className="h-4 w-4" /> Back to orders
            </Link>
          }
        />
      </div>
    );
  }

  const isClosed = HISTORY_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-3xl">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Link
        href="/seller/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <IconArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {order.id}
            </h1>
            {order.isRush && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <IconZap className="h-3 w-3" /> Rush
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{order.serviceName}</p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${
            SELLER_STATUS_STYLES[order.status]
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${SELLER_STATUS_DOT[order.status]}`} />
          {SELLER_STATUS_LABELS[order.status]}
        </span>
      </header>

      {!isClosed && (
        <div className="mt-5">
          <DeadlineCountdown deadline={order.deadline} />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Specifications</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{order.specifications}</p>

          <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-medium text-slate-900">{order.quantity}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Order total</dt>
              <dd className="font-bold text-slate-900">{formatCurrency(order.total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Placed</dt>
              <dd className="text-right font-medium text-slate-900">
                {formatDateTime(order.placedAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <IconFileText className="h-5 w-5 shrink-0 text-slate-400" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
              {order.fileName}
            </p>
            <button
              type="button"
              // TODO: real file download once storage is wired up.
              onClick={() => showToast('File download coming soon.')}
              className="btn-secondary shrink-0 text-xs"
            >
              <IconDownload className="h-3.5 w-3.5" /> Download
            </button>
          </div>
        </section>

        <section className="card flex flex-col p-5">
          <h2 className="text-sm font-semibold text-slate-900">Customer</h2>

          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <IconUser className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{order.customerName}</p>
              <p className="mt-0.5 font-mono text-sm text-slate-500">
                {maskPhone(order.customerPhone)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            The full number is revealed to your delivery partner once the order is dispatched.
          </p>

          <button
            type="button"
            onClick={() => showToast('Messaging coming soon.')}
            className="btn-secondary mt-4 w-full"
          >
            <IconMessageSquare className="h-4 w-4" /> Message customer
          </button>
        </section>
      </div>

      {order.specialInstructions && (
        <section className="card mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Special instructions</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {order.specialInstructions}
          </p>
        </section>
      )}

      <section className="card mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Update status</h2>
        <div className="mt-4">
          <OrderActionButtons order={order} onAnnounce={setAnnouncement} />
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">Progress</h2>
        <SellerTimeline order={order} />
      </section>
    </div>
  );
}
