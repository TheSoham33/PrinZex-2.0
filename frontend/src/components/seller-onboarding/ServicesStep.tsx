'use client';

import {
  SERVICE_CATEGORIES,
  type SelectedService,
} from '@/lib/seller-types';
import ServiceCategoryAccordion from './ServiceCategoryAccordion';
import { IconAlertCircle, IconCheckCircle } from '@/components/icons';

interface ServicesStepProps {
  selected: SelectedService[];
  onToggle: (service: SelectedService) => void;
  error: string | null;
}

export default function ServicesStep({ selected, onToggle, error }: ServicesStepProps) {
  const totalServices = SERVICE_CATEGORIES.reduce(
    (sum, category) => sum + category.services.length,
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">What do you offer?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pick every service your shop can handle. You&apos;ll set prices in the next step.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div
        className={`flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm ${
          selected.length > 0 ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-600'
        }`}
      >
        {selected.length > 0 && <IconCheckCircle className="h-4 w-4 shrink-0" />}
        <span>
          <strong>{selected.length}</strong> of {totalServices} services selected
        </span>
      </div>

      <div className="space-y-3">
        {SERVICE_CATEGORIES.map((category, index) => (
          <ServiceCategoryAccordion
            key={category.id}
            category={category}
            selected={selected}
            onToggle={onToggle}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
