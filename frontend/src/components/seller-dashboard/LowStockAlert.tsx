'use client';

import { IconAlertTriangle } from '@/components/icons';

interface LowStockAlertProps {
  count: number;
  active: boolean;
  onToggle: () => void;
}

export default function LowStockAlert({ count, active, onToggle }: LowStockAlertProps) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
        active
          ? 'border-amber-400 bg-amber-100'
          : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
        <IconAlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">
          {count} item{count === 1 ? ' is' : 's are'} running low
        </p>
        <p className="mt-0.5 text-xs text-amber-700">
          {active ? 'Showing only low-stock items — tap to show all' : 'Tap to filter to these items'}
        </p>
      </div>
    </button>
  );
}
