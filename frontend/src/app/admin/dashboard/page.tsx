'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchPlatformAnalytics } from '@/lib/api/admin-analytics';
import KpiCard from '@/components/admin/KpiCard';
import ActivityFeedItem from '@/components/admin/ActivityFeedItem';
import { PlatformRevenueChart, PlatformVolumeChart } from '@/components/admin/PlatformCharts';
import { formatCurrency } from '@/lib/utils';
import {
  IconAlertCircle,
  IconArrowRight,
  IconHeadphones,
  IconPackage,
  IconRefreshCw,
  IconStore,
  IconTruck,
  IconUsers,
  IconWallet,
} from '@/components/icons';

const QUICK_ACTIONS = [
  { label: 'Review pending sellers (3)', href: '/admin/sellers?status=pending', icon: IconStore, tint: 'bg-violet-50 text-violet-600' },
  { label: 'Process payouts', href: '/admin/payouts', icon: IconWallet, tint: 'bg-green-50 text-green-600' },
  { label: 'Resolve open tickets', href: '/admin/support?status=open', icon: IconHeadphones, tint: 'bg-amber-50 text-amber-600' },
  { label: 'Approve flagged reviews', href: '/admin/sellers', icon: IconAlertCircle, tint: 'bg-blue-50 text-blue-600' },
];

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchPlatformAnalytics,
  });

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load the dashboard</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const k = data?.kpis;
  const ordersChange =
    k && k.ordersYesterday > 0
      ? Math.round(((k.ordersToday - k.ordersYesterday) / k.ordersYesterday) * 1000) / 10
      : null;

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Platform health at a glance.</p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total customers" value={(k?.totalUsers ?? 0).toLocaleString('en-IN')} icon={IconUsers} change={k?.usersGrowthPct ?? null} loading={isLoading} />
        <KpiCard label="Approved sellers" value={String(k?.totalSellers ?? 0)} icon={IconStore} hint={`${k?.pendingSellers ?? 0} pending review`} loading={isLoading} />
        <KpiCard label="Orders today" value={String(k?.ordersToday ?? 0)} icon={IconPackage} change={ordersChange} loading={isLoading} />
        <KpiCard label="Revenue today" value={formatCurrency(k?.revenueToday ?? 0)} icon={IconWallet} change={k?.revenueYesterdayPct ?? null} loading={isLoading} />
        <KpiCard label="Active deliveries" value={String(k?.activeDeliveries ?? 0)} icon={IconTruck} hint="In transit right now" loading={isLoading} />
        <KpiCard label="Open support tickets" value={String(k?.openTickets ?? 0)} icon={IconHeadphones} hint="Awaiting first response" loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card h-80 animate-pulse bg-slate-100" />
          <div className="card h-80 animate-pulse bg-slate-100" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PlatformRevenueChart data={data?.daily ?? []} />
          <PlatformVolumeChart data={data?.daily ?? []} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <div className="mt-2 divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-slate-50" />
                ))
              : data?.activity.map((activity) => (
                  <ActivityFeedItem key={activity.id} activity={activity} />
                ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Quick actions</h2>
          <div className="space-y-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tint}`}>
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                  {action.label}
                </span>
                <IconArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
