'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { DailyRevenue } from '@/lib/domain/seller-analytics';
import ChartDataTable from './ChartDataTable';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function VolumeTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as DailyRevenue;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{shortDate(row.date)}</p>
      <p className="mt-1 text-sm font-bold text-indigo-600">
        {row.orders} order{row.orders === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function OrderVolumeChart({ data }: { data: DailyRevenue[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Order volume</h2>
      <p className="mt-0.5 text-xs text-slate-500">Orders received per day</p>

      <div className="mt-4 h-64 w-full sm:h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={52}
              allowDecimals={false}
            />
            <Tooltip content={(props) => <VolumeTooltip {...props} />} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Daily order volume for the selected range"
        columns={['Date', 'Orders']}
        rows={data.map((row) => [shortDate(row.date), row.orders])}
      />
    </div>
  );
}
