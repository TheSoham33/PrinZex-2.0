'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerAnalytics } from '@/lib/api/seller-analytics';
import {
  DATE_RANGE_OPTIONS,
  percentChange,
  sliceRange,
  type DateRangeKey,
} from '@/lib/mock-data/seller-analytics';
import StatCard from '@/components/seller-dashboard/StatCard';
import RevenueChart from '@/components/seller-dashboard/RevenueChart';
import OrderVolumeChart from '@/components/seller-dashboard/OrderVolumeChart';
import ServiceBreakdownChart from '@/components/seller-dashboard/ServiceBreakdownChart';
import { formatCurrency } from '@/lib/utils';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconPackage,
  IconRefreshCw,
  IconStar,
  IconTruck,
  IconWallet,
} from '@/components/icons';

export default function SellerAnalyticsPage() {
  const [range, setRange] = useState<DateRangeKey>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['seller-analytics'],
    queryFn: fetchSellerAnalytics,
  });

  // Range changes only re-slice the already-fetched series — no refetch.
  const sliced = useMemo(() => {
    if (!data) return { current: [], previous: [] };
    return sliceRange(data.revenueByDay, range, customFrom, customTo);
  }, [data, range, customFrom, customTo]);

  const totals = useMemo(() => {
    const revenue = sliced.current.reduce((sum, row) => sum + row.revenue, 0);
    const orders = sliced.current.reduce((sum, row) => sum + row.orders, 0);
    const previousRevenue = sliced.previous.reduce((sum, row) => sum + row.revenue, 0);
    const previousOrders = sliced.previous.reduce((sum, row) => sum + row.orders, 0);

    return {
      revenue,
      orders,
      aov: orders > 0 ? Math.round(revenue / orders) : 0,
      revenueChange: percentChange(revenue, previousRevenue),
      ordersChange: percentChange(orders, previousOrders),
      aovChange: percentChange(
        orders > 0 ? revenue / orders : 0,
        previousOrders > 0 ? previousRevenue / previousOrders : 0,
      ),
    };
  }, [sliced]);

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Something went wrong fetching your numbers.</p>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Revenue, volume and service mix for your shop.
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

      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Date range:</span>
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              aria-pressed={range === option.key}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                range === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <div>
              <label htmlFor="from" className="label">
                From
              </label>
              <input
                id="from"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="input py-2"
              />
            </div>
            <div>
              <label htmlFor="to" className="label">
                To
              </label>
              <input
                id="to"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="input py-2"
              />
            </div>
            {(!customFrom || !customTo) && (
              <p className="pb-2.5 text-xs text-slate-500">
                Pick both dates to filter the charts.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatCurrency(totals.revenue)}
          icon={IconWallet}
          iconClass="bg-green-50 text-green-600"
          change={totals.revenueChange}
          loading={isLoading}
        />
        <StatCard
          label="Total orders"
          value={String(totals.orders)}
          icon={IconPackage}
          iconClass="bg-blue-50 text-blue-600"
          change={totals.ordersChange}
          loading={isLoading}
        />
        <StatCard
          label="Average order value"
          value={formatCurrency(totals.aov)}
          icon={IconWallet}
          iconClass="bg-violet-50 text-violet-600"
          change={totals.aovChange}
          loading={isLoading}
        />
        <StatCard
          label="Completion rate"
          value={`${data?.completionRate ?? 0}%`}
          icon={IconCheckCircle}
          iconClass="bg-emerald-50 text-emerald-600"
          hint="Orders fulfilled without cancellation"
          loading={isLoading}
        />
        <StatCard
          label="Average rating"
          value={`${data?.averageRating ?? 0} ★`}
          icon={IconStar}
          iconClass="bg-amber-50 text-amber-600"
          hint="Across all customer reviews"
          loading={isLoading}
        />
        <StatCard
          label="On-time delivery"
          value={`${data?.onTimeDeliveryPct ?? 0}%`}
          icon={IconTruck}
          iconClass="bg-orange-50 text-orange-600"
          hint="Delivered before the deadline"
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          <div className="card h-80 animate-pulse bg-slate-100" />
          <div className="card h-80 animate-pulse bg-slate-100" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <RevenueChart data={sliced.current} />
          <OrderVolumeChart data={sliced.current} />
          <ServiceBreakdownChart data={data?.serviceBreakdown ?? []} />
        </div>
      )}
    </div>
  );
}
