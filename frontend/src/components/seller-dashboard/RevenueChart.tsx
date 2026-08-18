'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { DailyRevenue } from '@/lib/domain/seller-analytics';
import { formatCurrency } from '@/lib/utils';
import ChartDataTable from './ChartDataTable';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function RevenueTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as DailyRevenue;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{shortDate(row.date)}</p>
      <p className="mt-1 text-sm font-bold text-blue-600">{formatCurrency(row.revenue)}</p>
      <p className="text-xs text-slate-500">
        {row.orders} order{row.orders === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function RevenueChart({ data }: { data: DailyRevenue[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Revenue</h2>
      <p className="mt-0.5 text-xs text-slate-500">Daily earnings across the selected range</p>

      <div className="mt-4 h-64 w-full sm:h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                {/* Brand accent at 30% opacity, fading out toward the axis. */}
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(value: number) => `₹${Math.round(value / 1000)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={(props) => <RevenueTooltip {...props} />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Daily revenue and order count for the selected range"
        columns={['Date', 'Revenue', 'Orders']}
        rows={data.map((row) => [shortDate(row.date), formatCurrency(row.revenue), row.orders])}
      />
    </div>
  );
}
