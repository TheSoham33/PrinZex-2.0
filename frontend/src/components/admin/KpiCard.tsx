'use client';

import type { SVGProps } from 'react';
import { IconTrendingDown, IconTrendingUp } from '@/components/icons';

interface KpiCardProps {
  label: string;
  value: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  change?: number | null;
  hint?: string;
  loading?: boolean;
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  change = null,
  hint,
  loading = false,
}: KpiCardProps) {
  const up = change !== null && change >= 0;
  // Subtle tint reflecting trend direction, neutral when there's no delta.
  const tint =
    change === null
      ? 'bg-white'
      : up
        ? 'bg-gradient-to-br from-green-50/80 to-white'
        : 'bg-gradient-to-br from-red-50/80 to-white';

  return (
    <div className={`card p-4 ${tint}`}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            change === null ? 'bg-slate-100 text-slate-500' : up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        {change !== null && !loading && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${
              up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {up ? <IconTrendingUp className="h-3.5 w-3.5" /> : <IconTrendingDown className="h-3.5 w-3.5" />}
            {up ? '+' : ''}
            {change.toFixed(1)}%
            <span className="sr-only"> versus the previous period</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      )}
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
  );
}
