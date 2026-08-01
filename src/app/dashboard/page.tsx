'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { fetchOrders } from '@/lib/api/orders';
import { fetchWalletBalance } from '@/lib/api/wallet';
import { isActiveOrder } from '@/lib/types/orders';
import OrderCard from '@/components/dashboard/OrderCard';
import { formatCurrency } from '@/lib/utils';
import {
  IconArrowRight,
  IconBell,
  IconMapPin,
  IconPackage,
  IconStore,
  IconTruck,
  IconWallet,
} from '@/components/icons';

const QUICK_LINKS = [
  { href: '/stores', label: 'Browse shops', icon: IconStore },
  { href: '/dashboard/orders', label: 'My orders', icon: IconPackage },
  { href: '/dashboard/addresses', label: 'Addresses', icon: IconMapPin },
  { href: '/dashboard/notifications', label: 'Notifications', icon: IconBell },
];

export default function DashboardOverviewPage() {
  const user = useAppSelector((state) => state.auth.user);

  const ordersQuery = useQuery({
    queryKey: ['dashboard-summary-orders'],
    queryFn: fetchOrders,
  });

  const walletQuery = useQuery({
    queryKey: ['dashboard-summary-wallet'],
    queryFn: fetchWalletBalance,
  });

  const activeOrders = (ordersQuery.data ?? []).filter(isActiveOrder);
  const deliveredCount = (ordersQuery.data ?? []).filter(
    (order) => order.status === 'delivered',
  ).length;

  const stats = [
    {
      label: 'Active orders',
      value: ordersQuery.isLoading ? null : activeOrders.length,
      icon: IconTruck,
      color: 'bg-blue-50 text-blue-600',
      href: '/dashboard/orders',
    },
    {
      label: 'Completed',
      value: ordersQuery.isLoading ? null : deliveredCount,
      icon: IconPackage,
      color: 'bg-green-50 text-green-600',
      href: '/dashboard/orders',
    },
    {
      label: 'Wallet balance',
      value: walletQuery.isLoading ? null : formatCurrency(walletQuery.data ?? 0),
      icon: IconWallet,
      color: 'bg-violet-50 text-violet-600',
      href: '/dashboard/wallet',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hi {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {activeOrders.length > 0
            ? `You have ${activeOrders.length} order${activeOrders.length === 1 ? '' : 's'} in progress.`
            : 'Nothing in progress right now — ready to print something?'}
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-md"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{stat.label}</p>
              {stat.value === null ? (
                <div className="mt-1 h-6 w-16 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Active orders</h2>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View all <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="card h-40 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <IconPackage className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-900">No active orders</p>
            <p className="mt-1 text-sm text-slate-600">Your next print job is a few taps away.</p>
            <Link href="/stores" className="btn-primary mt-5">
              Find a print shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.slice(0, 3).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card flex flex-col items-center gap-2.5 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-slate-900">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
