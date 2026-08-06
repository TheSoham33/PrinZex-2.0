'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchAnalyticsOverview, 
  fetchRevenueByDay, 
  fetchServiceBreakdown 
} from '@/lib/api/seller-analytics';
import {
  DATE_RANGE_OPTIONS,
  type DateRangeKey,
} from '@/lib/mock-data/seller-analytics';
import StatCard from '@/components/seller-dashboard/StatCard';
import RevenueChart from '@/components/seller-dashboard/RevenueChart';
import OrderVolumeChart from '@/components/seller-dashboard/OrderVolumeChart';
import ServiceBreakdownChart from '@/components/seller-dashboard/ServiceBreakdownChart';
import { formatCurrency } from '@/lib/utils';
import * as Icons from '@/components/icons';
import {
  IconAlertCircle,
  IconPackage,
  IconRefreshCw,
  IconStar,
  IconTruck,
  IconWallet,
} from '@/components/icons';

const MAP_RANGE_TO_PERIOD: Record<string, string> = {
  last7: '7d',
  last30: '30d',
  thisMonth: 'this_month',
  lastMonth: 'last_month',
};

export default function SellerAnalyticsPage() {
  const [range, setRange] = useState<DateRangeKey>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const period = MAP_RANGE_TO_PERIOD[range] || '30d';

  const overviewQuery = useQuery({
    queryKey: ['seller-analytics-overview', period],
    queryFn: () => fetchAnalyticsOverview(period),
  });

  const revenueQuery = useQuery({
    queryKey: ['seller-analytics-revenue', period],
    queryFn: () => fetchRevenueByDay(period),
  });

  const breakdownQuery = useQuery({
    queryKey: ['seller-analytics-breakdown'],
    queryFn: fetchServiceBreakdown,
  });

  const isLoading = overviewQuery.isLoading || revenueQuery.isLoading || breakdownQuery.isLoading;
  const isError = overviewQuery.isError || revenueQuery.isError || breakdownQuery.isError;
  const isFetching = overviewQuery.isFetching || revenueQuery.isFetching || breakdownQuery.isFetching;

  const refetchAll = () => {
    overviewQuery.refetch();
    revenueQuery.refetch();
    breakdownQuery.refetch();
  };

  const overview = overviewQuery.data;
  const revenueSeries = revenueQuery.data || [];
  const serviceBreakdown = breakdownQuery.data || [];

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Something went wrong fetching your numbers.</p>
          <button type="button" onClick={refetchAll} className="btn-primary mt-6">
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
          onClick={refetchAll}
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
              disabled={option.key === 'custom'} // Custom not yet supported by backend
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                range === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatCurrency(overview?.totalRevenue ?? 0)}
          icon={IconWallet}
          iconClass="bg-green-50 text-green-600"
          loading={isLoading}
        />
        <StatCard
          label="Total orders"
          value={String(overview?.totalOrders ?? 0)}
          icon={IconPackage}
          iconClass="bg-blue-50 text-blue-600"
          loading={isLoading}
        />
        <StatCard
          label="Average order value"
          value={formatCurrency(overview?.averageOrderValue ?? 0)}
          icon={IconWallet}
          iconClass="bg-violet-50 text-violet-600"
          loading={isLoading}
        />
        <StatCard
          label="Completion rate"
          value={`${overview?.completionRate ?? 0}%`}
          icon={Icons.IconCheckCircle}
          iconClass="bg-emerald-50 text-emerald-600"
          hint="Orders fulfilled without cancellation"
          loading={isLoading}
        />
        <StatCard
          label="Average rating"
          value={`${overview?.averageRating ?? 0} ★`}
          icon={IconStar}
          iconClass="bg-amber-50 text-amber-600"
          hint="Across all customer reviews"
          loading={isLoading}
        />
        <StatCard
          label="On-time delivery"
          value={`${overview?.onTimeRate ?? 0}%`}
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
          <RevenueChart data={revenueSeries} />
          <OrderVolumeChart data={revenueSeries} />
          <ServiceBreakdownChart data={serviceBreakdown.map(s => ({
            service: s.serviceName,
            count: s.count,
            revenue: s.revenue
          }))} />
        </div>
      )}
    </div>
  );
}
