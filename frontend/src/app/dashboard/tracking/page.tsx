'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '@/lib/api/orders';
import { isActiveOrder } from '@/lib/domain/orders';
import OrderStatusBadge from '@/components/dashboard/OrderStatusBadge';
import { formatDateTime } from '@/lib/utils';
import { IconChevronRight, IconPackageOpen, IconTruck } from '@/components/icons';
import { StateCard } from '@/components/ui';

export default function TrackingIndexPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-orders'], queryFn: fetchOrders });
  const trackable = (data ?? []).filter(isActiveOrder);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Track your orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Follow any in-progress order from the press to your door.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="card h-24 animate-pulse bg-slate-100" />
          ))
        ) : trackable.length === 0 ? (
          <StateCard
            icon={IconPackageOpen}
            title="Nothing to track right now"
            subtitle="Place an order and you'll be able to follow it live here."
            action={
              <Link href="/stores" className="btn-primary mt-6">
                Browse print shops
              </Link>
            }
          />
        ) : (
          trackable.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/tracking/${order.id}`}
              className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <IconTruck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{order.serviceName}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {order.storeName} · {order.id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Expected {formatDateTime(order.estimatedDelivery)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <OrderStatusBadge status={order.status} />
                <IconChevronRight className="h-5 w-5 text-slate-300" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
