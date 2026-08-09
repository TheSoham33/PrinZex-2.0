'use client';

import type { ServiceOffering } from '@/lib/mock-data/stores';
import { formatCurrency } from '@/lib/utils';
import {
  IconBadgeCheck,
  IconFileText,
  IconFlag,
  IconIdCard,
  IconImageIcon,
  IconTag,
} from '@/components/icons';

const ICON_MAP = {
  file: IconFileText,
  flag: IconFlag,
  badge: IconBadgeCheck,
  tag: IconTag,
  id: IconIdCard,
  image: IconImageIcon,
} as const;

interface ServiceCardProps {
  service: ServiceOffering;
  selected: boolean;
  onSelect: (serviceId: string) => void;
}

export default function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  const Icon = ICON_MAP[service.icon as keyof typeof ICON_MAP] ?? IconFileText;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      aria-pressed={selected}
      className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-semibold text-slate-900">{service.name}</h4>
          <p className="text-sm font-bold text-slate-900">
            {formatCurrency(service.startingPrice)}
            <span className="ml-1 text-xs font-normal text-slate-500">{service.unit}</span>
          </p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{service.description}</p>
      </div>
    </button>
  );
}
