'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { PlatformDaily } from '@/lib/mock-data/admin-analytics';
import { formatCurrency } from '@/lib/utils';
import ChartDataTable from '@/components/seller-dashboard/ChartDataTable';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function RevenueTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as PlatformDaily;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{shortDate(row.date)}</p>
      <p className="mt-1 text-sm font-bold text-blue-600">{formatCurrency(row.revenue)}</p>
      <p className="text-xs text-slate-500">{row.orders} orders</p>
    </div>
  );
}

function VolumeTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as PlatformDaily;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{shortDate(row.date)}</p>
      <p className="mt-1 text-sm font-bold text-indigo-600">{row.orders} orders</p>
    </div>
  );
}

export function PlatformRevenueChart({ data }: { data: PlatformDaily[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Revenue — last 30 days</h2>
      <div className="mt-4 h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={28} />
            <YAxis tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={(props) => <RevenueTooltip {...props} />} />
            <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#adminRevenueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Daily platform revenue for the last 30 days"
        columns={['Date', 'Revenue', 'Orders']}
        rows={data.map((r) => [shortDate(r.date), formatCurrency(r.revenue), r.orders])}
      />
    </div>
  );
}

export function PlatformVolumeChart({ data }: { data: PlatformDaily[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Order volume — last 30 days</h2>
      <div className="mt-4 h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={28} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={52} allowDecimals={false} />
            <Tooltip content={(props) => <VolumeTooltip {...props} />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Daily platform order volume for the last 30 days"
        columns={['Date', 'Orders']}
        rows={data.map((r) => [shortDate(r.date), r.orders])}
      />
    </div>
  );
}
