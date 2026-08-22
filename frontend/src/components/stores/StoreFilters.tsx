'use client';

import { useEffect } from 'react';
import { IconX } from '@/components/icons';

export const SERVICE_FILTERS = [
  { value: 'documents', label: 'Documents' },
  { value: 'bulk', label: 'Bulk Printing' },
  { value: 'packaging', label: 'Packaging & Labels' },
  { value: 'binding', label: 'Binding & Finishing' },
  { value: 'large-format', label: 'Banners & Large Format' },
  { value: 'specialty', label: 'Specialty Printing' },
];

export const DELIVERY_FILTERS = [
  { value: 'under-30', label: 'Under 30 min' },
  { value: 'under-1h', label: 'Under 1 hour' },
  { value: 'under-2h', label: 'Under 2 hours' },
  { value: 'same-day', label: 'Same day' },
];

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating (high to low)' },
  { value: 'distance', label: 'Distance (nearest)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
];

export interface FilterState {
  services: string[];
  minRating: number;
  delivery: string[];
  sortBy: string;
}

export const INITIAL_FILTERS: FilterState = {
  services: [],
  minRating: 0,
  delivery: [],
  sortBy: 'relevance',
};

interface StoreFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  /** Mobile drawer state — ignored on desktop. */
  open: boolean;
  onClose: () => void;
  resultCount: number;
}

export default function StoreFilters({
  filters,
  onChange,
  onClear,
  open,
  onClose,
  resultCount,
}: StoreFiltersProps) {
  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggleService = (serviceId: string) => {
    const services = filters.services.includes(serviceId)
      ? filters.services.filter((item) => item !== serviceId)
      : [...filters.services, serviceId];
    onChange({ ...filters, services });
  };

  const toggleDelivery = (value: string) => {
    const delivery = filters.delivery.includes(value)
      ? filters.delivery.filter((item) => item !== value)
      : [...filters.delivery, value];
    onChange({ ...filters, delivery });
  };

  const panel = (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-900">Service category</h3>
        <div className="mt-3 space-y-2">
          {SERVICE_FILTERS.map((service) => (
            <label
              key={service.value}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <input
                type="checkbox"
                checked={filters.services.includes(service.value)}
                onChange={() => toggleService(service.value)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              {service.label}
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Minimum rating</h3>
        <div className="mt-3 space-y-2">
          {[0, 3, 4, 4.5].map((rating) => (
            <label
              key={rating}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <input
                type="radio"
                name="minRating"
                checked={filters.minRating === rating}
                onChange={() => onChange({ ...filters, minRating: rating })}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              {rating === 0 ? 'Any rating' : `${rating}★ & above`}
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Delivery time</h3>
        <div className="mt-3 space-y-2">
          {DELIVERY_FILTERS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <input
                type="checkbox"
                checked={filters.delivery.includes(option.value)}
                onChange={() => toggleDelivery(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <label htmlFor="sortBy" className="text-sm font-semibold text-slate-900">
          Sort by
        </label>
        <select
          id="sortBy"
          value={filters.sortBy}
          onChange={(event) => onChange({ ...filters, sortBy: event.target.value })}
          className="input mt-3"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <button type="button" onClick={onClear} className="btn-secondary w-full">
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
          <h2 className="mb-5 text-base font-bold text-slate-900">Filters</h2>
          {panel}
        </div>
      </aside>

      {/* Mobile off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close filters"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{panel}</div>
            <div className="border-t border-slate-200 p-4">
              <button type="button" onClick={onClose} className="btn-primary w-full">
                Show {resultCount} {resultCount === 1 ? 'shop' : 'shops'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
