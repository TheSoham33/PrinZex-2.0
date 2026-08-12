'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '@/lib/api/orders';
import OrderStatusBadge from '@/components/dashboard/OrderStatusBadge';
import OrderTimeline from '@/components/dashboard/OrderTimeline';
import ReviewModal from '@/components/dashboard/ReviewModal';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconPhone,
  IconStore,
  IconTruck,
  IconStar,
} from '@/components/icons';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  // `params` is a Promise in Next.js 15 — `use()` unwraps it in a Client Component.
  const { orderId } = use(params);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['dashboard-orders', orderId],
    queryFn: () => fetchOrderById(orderId),
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
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Order not found</h1>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            We couldn&apos;t find an order with the ID{' '}
            <span className="font-mono font-medium">{orderId}</span>.
          </p>
          <Link href="/dashboard/orders" className="btn-primary mt-6">
            <IconArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <IconArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.serviceName}</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{order.id}</p>
        </div>
        <OrderStatusBadge status={order.status} size="md" />
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Order details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Print shop</dt>
              <dd className="text-right font-medium text-slate-900">{order.storeName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-medium text-slate-900">{order.quantity}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Placed on</dt>
              <dd className="text-right font-medium text-slate-900">
                {formatDateTime(order.placedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {order.status === 'delivered' ? 'Delivered on' : 'Expected by'}
              </dt>
              <dd className="text-right font-medium text-slate-900">
                {formatDateTime(order.estimatedDelivery)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="text-lg font-bold text-slate-900">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="card flex flex-col p-5">
          <h2 className="text-sm font-semibold text-slate-900">Need help?</h2>
          <div className="mt-4 space-y-2.5">
            <Link href={`/stores/${order.storeId}`} className="btn-secondary w-full justify-start">
              <IconStore className="h-4 w-4" /> Visit shop page
            </Link>
            <a href="tel:+919830012345" className="btn-secondary w-full justify-start">
              <IconPhone className="h-4 w-4" /> Call the shop
            </a>
            {order.status === 'out_for_delivery' && (
              <Link
                href={`/dashboard/tracking/${order.id}`}
                className="btn-primary w-full justify-start"
              >
                <IconTruck className="h-4 w-4" /> Track live
              </Link>
            )}
            {!['cancelled', 'returned'].includes(order.status) && (
              <button 
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="btn-secondary w-full justify-start border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <IconStar className="h-4 w-4" /> Rate & Review Order
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">Order timeline</h2>
        <OrderTimeline timeline={order.timeline} />
      </div>

      <ReviewModal 
        orderId={order.id} 
        storeName={order.storeName} 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
      />
    </div>
  );
}
