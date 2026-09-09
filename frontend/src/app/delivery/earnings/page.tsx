'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliveryEarnings,
  fetchDeliveryPayouts,
  requestDeliveryPayout,
  type EarningsPeriod,
} from '@/lib/api/delivery';
import StatCard from '@/components/seller-dashboard/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IconClock, IconPackage, IconWallet } from '@/components/icons';

const PERIODS: { value: EarningsPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
];

export default function DeliveryEarningsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<EarningsPeriod>('7d');

  const earningsQ = useQuery({
    queryKey: ['delivery-earnings', period],
    queryFn: () => fetchDeliveryEarnings(period),
  });
  const payoutsQ = useQuery({
    queryKey: ['delivery-payouts'],
    queryFn: () => fetchDeliveryPayouts(1),
  });

  const payoutM = useMutation({
    mutationFn: requestDeliveryPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-earnings'] });
      showToast('Payout requested — it will be processed to your bank account');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const earnings = earningsQ.data;
  const byDay = [...(earnings?.earningsByDay ?? [])].reverse();
  const maxDayEarnings = Math.max(0, ...byDay.map((day) => day.earnings));
  const payoutRows = payoutsQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Earnings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Delivered orders pay out per delivery — amounts come straight from the database.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === option.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Earned in period"
          value={formatCurrency(earnings?.totalEarnings ?? 0)}
          icon={IconWallet}
          iconClass="bg-green-100 text-green-600"
          hint={`${earnings?.deliveryCount ?? 0} deliveries · avg ${formatCurrency(earnings?.averagePerDelivery ?? 0)}`}
        />
        <StatCard
          label="Pending payout"
          value={formatCurrency(earnings?.pendingEarnings ?? 0)}
          icon={IconClock}
          iconClass="bg-amber-100 text-amber-600"
        />
        <StatCard
          label="Lifetime"
          value={formatCurrency(earnings?.lifetimeEarnings ?? 0)}
          icon={IconPackage}
          iconClass="bg-blue-100 text-blue-600"
          hint={`${earnings?.lifetimeDeliveries ?? 0} deliveries total`}
        />
      </div>

      {/* Daily breakdown — a plain bar list, no chart dependency */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Daily breakdown</h2>
        {byDay.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No delivered orders in this period yet.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {byDay.map((day) => (
              <li key={day.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-slate-500">{formatDate(day.date)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: maxDayEarnings > 0 ? `${Math.round((day.earnings / maxDayEarnings) * 100)}%` : '0%' }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-medium text-slate-900">
                  {formatCurrency(day.earnings)}
                </span>
                <span className="w-16 shrink-0 text-right text-slate-500">
                  {day.deliveries} del
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payouts */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Payouts</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pending earnings: <strong className="text-slate-700">{formatCurrency(earnings?.pendingEarnings ?? 0)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => payoutM.mutate()}
            disabled={payoutM.isPending}
            className="btn-primary text-sm"
          >
            {payoutM.isPending ? 'Requesting…' : 'Request payout'}
          </button>
        </div>

        {payoutRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No payouts yet — request your first one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {payoutRows.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(payout.createdAt)} · {payout.deliveriesIncluded} deliveries
                  </p>
                </div>
                <StatusBadge status={String(payout.status).toLowerCase()} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
