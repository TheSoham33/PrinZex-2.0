'use client';

import { useEffect, useState } from 'react';
import type { StoreDetail } from '@/lib/domain/stores';
import { isStoreOpen } from '@/lib/api/mappers';
import { IconClock, IconMessageSquare, IconTruck, IconWallet } from '@/components/icons';

export default function StoreInfoBar({ store }: { store: StoreDetail }) {
  // Rendered on the client only, so server/client markup can't disagree.
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    // Same source of truth as the store listing and the detail header.
    const update = () =>
      setIsOpen(isStoreOpen(store.openingTime, store.closingTime, { hours: store.hours }));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [store.hours, store.openingTime, store.closingTime]);

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
