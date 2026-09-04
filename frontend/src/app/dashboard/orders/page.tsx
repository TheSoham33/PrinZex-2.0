'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '@/lib/api/orders';
import { isActiveOrder } from '@/lib/domain/orders';
import OrderCard from '@/components/dashboard/OrderCard';
import { IconAlertCircle, IconPackageOpen, IconRefreshCw } from '@/components/icons';
import { StateCard } from '@/components/ui';

const TABS = ['Active', 'History'] as const;

export default function DashboardOrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Active');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: fetchOrders,
  });

  const orders = data ?? [];
  const visible = orders.filter((order) =>
    tab === 'Active' ? isActiveOrder(order) : !isActiveOrder(order),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My orders</h1>
          <p className="mt-1 text-sm text-slate-600">Track progress and revisit past jobs.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-sm"
        >
          <IconRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => {
          const count = orders.filter((order) =>
            item === 'Active' ? isActiveOrder(order) : !isActiveOrder(order),
          ).length;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item}
              {!isLoading && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card h-44 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <IconAlertCircle className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-900">Couldn&apos;t load your orders</p>
            <p className="mt-1 text-sm text-slate-600">Check your connection and try again.</p>
            <button type="button" onClick={() => refetch()} className="btn-primary mt-5">
              <IconRefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          <StateCard
            icon={IconPackageOpen}
            title={tab === 'Active' ? 'No active orders' : 'No past orders yet'}
            subtitle={
              tab === 'Active'
                ? 'When you place an order it will show up here with live status.'
                : 'Delivered and cancelled orders will appear here.'
            }
            action={
              <Link href="/stores" className="btn-primary mt-6">
                Browse print shops
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
