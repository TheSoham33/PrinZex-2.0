'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';
import type { ServiceBreakdown } from '@/lib/types/seller-analytics';
import { formatCurrency } from '@/lib/utils';
import ChartDataTable from './ChartDataTable';

const COLORS = ['#2563eb', '#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

function BreakdownTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as ServiceBreakdown;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{row.service}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(row.revenue)}</p>
      <p className="text-xs text-slate-500">{row.count} orders</p>
    </div>
  );
}

export default function ServiceBreakdownChart({ data }: { data: ServiceBreakdown[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Service breakdown</h2>
      <p className="mt-0.5 text-xs text-slate-500">Share of revenue by service type</p>

      <div className="mt-4 h-72 w-full sm:h-80" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="service"
              cx="50%"
              cy="45%"
              innerRadius="45%"
              outerRadius="72%"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.service} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={(props) => <BreakdownTooltip {...props} />} />
            <Legend
              verticalAlign="bottom"
              height={48}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Revenue and order count by service type"
        columns={['Service', 'Orders', 'Revenue']}
        rows={data.map((row) => [row.service, row.count, formatCurrency(row.revenue)])}
      />
    </div>
  );
}
