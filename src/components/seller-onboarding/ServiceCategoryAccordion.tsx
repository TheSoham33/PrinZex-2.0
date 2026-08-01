'use client';

import { useState } from 'react';
import type { SelectedService, ServiceCategory } from '@/lib/seller-types';
import { IconChevronDown } from '@/components/icons';

interface ServiceCategoryAccordionProps {
  category: ServiceCategory;
  selected: SelectedService[];
  onToggle: (service: SelectedService) => void;
  defaultOpen?: boolean;
}

export default function ServiceCategoryAccordion({
  category,
  selected,
  onToggle,
  defaultOpen = false,
}: ServiceCategoryAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const selectedCount = category.services.filter((service) =>
    selected.some((entry) => entry.serviceId === service.id),
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{category.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{category.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {selectedCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
              {selectedCount}
            </span>
          )}
          <IconChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          {category.services.map((service) => {
            const checked = selected.some((entry) => entry.serviceId === service.id);
            return (
              <label
                key={service.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  checked
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onToggle({
                      categoryId: category.id,
                      serviceId: service.id,
                      serviceName: service.name,
                    })
                  }
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                />
                {service.name}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
