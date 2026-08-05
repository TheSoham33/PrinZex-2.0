'use client';

import { useEffect, useState } from 'react';
import type { StoreDetail, StoreHours } from '@/lib/mock-data/stores';
import { IconClock, IconMessageSquare, IconTruck, IconWallet } from '@/components/icons';

/** True when the current local time falls inside today's opening window. */
function computeIsOpen(hours: StoreHours[]): boolean {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const today = hours.find((entry) => entry.day === dayName);
  if (!today || today.closed || !today.open || !today.close) return false;

  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= openH * 60 + openM && minutes < closeH * 60 + closeM;
}

export default function StoreInfoBar({ store }: { store: StoreDetail }) {
  // Rendered on the client only, so server/client markup can't disagree.
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setIsOpen(computeIsOpen(store.hours));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [store.hours]);

  const items = [
    {
      icon: IconClock,
      label: 'Status',
      value:
        isOpen === null ? '—' : isOpen ? 'Open now' : 'Closed',
      valueClass:
        isOpen === null ? 'text-slate-400' : isOpen ? 'text-green-600' : 'text-red-600',
    },
    { icon: IconMessageSquare, label: 'Response', value: store.responseTime },
    { icon: IconTruck, label: 'Delivery', value: store.etaLabel },
    { icon: IconWallet, label: 'Pricing', value: store.priceRange },
  ];

  return (
    <div className="card grid grid-cols-2 divide-slate-200 sm:grid-cols-4 sm:divide-x">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <item.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`truncate text-sm font-semibold ${item.valueClass ?? 'text-slate-900'}`}>
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
