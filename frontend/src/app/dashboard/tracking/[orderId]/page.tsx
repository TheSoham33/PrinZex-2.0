'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '@/lib/api/orders';
import TrackingMap from '@/components/dashboard/TrackingMap';
import OrderStatusBadge from '@/components/dashboard/OrderStatusBadge';
import OrderTimeline from '@/components/dashboard/OrderTimeline';
import { formatDateTime } from '@/lib/utils';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconMessageSquare,
  IconPhone,
  IconStar,
  IconTruck,
} from '@/components/icons';

export default function TrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['dashboard-orders', orderId],
    queryFn: () => fetchOrderById(orderId),
    // Poll while the courier is moving.
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
        <div className="card h-40 animate-pulse bg-slate-100" />
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
          <h1 className="mt-4 text-lg font-bold text-slate-900">Nothing to track</h1>
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

  const courier = order.deliveryBoy;

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            {order.serviceName} · <span className="font-mono">{order.id}</span>
          </p>
        </div>
        <OrderStatusBadge status={order.status} size="md" />
      </header>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3.5">
        <IconTruck className="h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-blue-900">
            {order.status === 'out_for_delivery'
              ? 'Your order is on the way'
              : 'Your order is being prepared'}
          </p>
          <p className="text-xs text-blue-700">
            Estimated arrival {formatDateTime(order.estimatedDelivery)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <TrackingMap deliveryBoy={courier} />
      </div>

      {courier && (
        <div className="card mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Your delivery partner</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-600">
              {courier.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{courier.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">{courier.vehicle}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <IconStar className="h-3.5 w-3.5 fill-current" /> {Number(courier.rating).toFixed(1)} rating
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${courier.phone}`} className="btn-secondary text-sm">
                <IconPhone className="h-4 w-4" /> Call
              </a>
              <button type="button" className="btn-secondary text-sm">
                <IconMessageSquare className="h-4 w-4" /> Chat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">Progress</h2>
        <OrderTimeline timeline={order.timeline} />
      </div>
    </div>
  );
}
