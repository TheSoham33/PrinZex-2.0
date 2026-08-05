'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerOrders } from '@/lib/api/seller-orders';
import {
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  type SellerOrder,
} from '@/lib/mock-data/seller-orders';
import OrderQueueCard from '@/components/seller-dashboard/OrderQueueCard';
import { IconAlertCircle, IconPackageOpen, IconRefreshCw } from '@/components/icons';

const TABS = ['New', 'Active', 'Dispatched', 'History'] as const;
type Tab = (typeof TABS)[number];

function matchesTab(order: SellerOrder, tab: Tab): boolean {
  if (tab === 'New') return order.status === 'placed' || order.status === 'new';
  if (tab === 'Active') return ACTIVE_STATUSES.includes(order.status) || ['confirmed', 'processing', 'ready_for_pickup'].includes(order.status);
  if (tab === 'Dispatched') return order.status === 'dispatched' || order.status === 'out_for_delivery';
  return HISTORY_STATUSES.includes(order.status) || ['delivered', 'cancelled', 'returned'].includes(order.status);
}

export default function SellerOrdersPage() {
  const [tab, setTab] = useState<Tab>('New');
  // Single announcement region shared by every card's action buttons.
  const [announcement, setAnnouncement] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => fetchSellerOrders({}),
  });

  const orders = data?.data || (Array.isArray(data) ? data : []);
  const visible = orders.filter((order: any) => matchesTab(order, tab));

  return (
    <div className="mx-auto max-w-4xl">
      {/* Polite live region — announces status changes without stealing focus. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accept incoming jobs and move them through production.
          </p>
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

      <div
        role="tablist"
        aria-label="Order status"
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
      >
        {TABS.map((item) => {
          const count = orders.filter((order) => matchesTab(order, item)).length;
          const selected = tab === item;
          return (
            <button
              key={item}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                selected
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
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

      <div className="mt-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card h-64 animate-pulse bg-slate-100" />
          ))
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
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <IconPackageOpen className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">
              {tab === 'New' ? 'No new orders right now' : `Nothing in ${tab.toLowerCase()}`}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              {tab === 'New'
                ? 'New customer orders will land here the moment they are placed.'
                : 'Orders will appear here as they move through production.'}
            </p>
          </div>
        ) : (
          visible.map((order) => (
            <OrderQueueCard key={order.id} order={order} onAnnounce={setAnnouncement} />
          ))
        )}
      </div>
    </div>
  );
}
