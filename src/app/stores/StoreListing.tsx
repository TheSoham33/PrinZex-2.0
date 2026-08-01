'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StoreCard from '@/components/stores/StoreCard';
import StoreCardSkeleton from '@/components/stores/StoreCardSkeleton';
import StoreSearchBar from '@/components/stores/StoreSearchBar';
import EmptyState from '@/components/stores/EmptyState';
import StoreFilters, {
  DELIVERY_FILTERS,
  INITIAL_FILTERS,
  SORT_OPTIONS,
  type FilterState,
} from '@/components/stores/StoreFilters';
import { MOCK_STORES, type Store } from '@/lib/mock-data/stores';
import { IconSettings, IconX } from '@/components/icons';

/** Rough minutes-to-ready parsed from a store's ETA label, for delivery filtering. */
function etaMinutes(store: Store): number {
  const match = store.etaLabel.match(/(\d+)\s*(min|hour)/i);
  if (!match) return 999;
  const value = Number(match[1]);
  return /hour/i.test(match[2]) ? value * 60 : value;
}

const PRICE_ORDER: Record<string, number> = { $: 1, $$: 2, $$$: 3 };

export default function StoreListing() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filters, setFilters] = useState<FilterState>(() => {
    const service = searchParams.get('q');
    return service ? { ...INITIAL_FILTERS } : INITIAL_FILTERS;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulate the network round-trip the real API will make.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [query, location, filters]);

  const results = useMemo(() => {
    let list = [...MOCK_STORES];

    const term = query.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (store) =>
          store.name.toLowerCase().includes(term) ||
          store.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
    }

    if (filters.services.length) {
      list = list.filter((store) =>
        filters.services.some((service) =>
          store.tags.some((tag) => tag.toLowerCase() === service.toLowerCase()),
        ),
      );
    }

    if (filters.minRating > 0) {
      list = list.filter((store) => store.rating >= filters.minRating);
    }

    if (filters.delivery.length) {
      const limits: Record<string, number> = {
        'under-30': 30,
        'under-1h': 60,
        'under-2h': 120,
        'same-day': 480,
      };
      const cap = Math.max(...filters.delivery.map((key) => limits[key] ?? 999));
      list = list.filter((store) => etaMinutes(store) <= cap);
    }

    switch (filters.sortBy) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'distance':
        list.sort((a, b) => a.distanceKm - b.distanceKm);
        break;
      case 'price':
        list.sort((a, b) => PRICE_ORDER[a.priceRange] - PRICE_ORDER[b.priceRange]);
        break;
      default:
        list.sort((a, b) => b.rating * 10 - b.distanceKm - (a.rating * 10 - a.distanceKm));
    }

    return list;
  }, [query, filters]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (query.trim()) params.set('q', query.trim());
    router.replace(`/stores${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.services.map((service) => ({
      key: `service-${service}`,
      label: service,
      onRemove: () =>
        setFilters((prev) => ({
          ...prev,
          services: prev.services.filter((item) => item !== service),
        })),
    })),
    ...(filters.minRating > 0
      ? [
          {
            key: 'rating',
            label: `${filters.minRating}★ & above`,
            onRemove: () => setFilters((prev) => ({ ...prev, minRating: 0 })),
          },
        ]
      : []),
    ...filters.delivery.map((value) => ({
      key: `delivery-${value}`,
      label: DELIVERY_FILTERS.find((option) => option.value === value)?.label ?? value,
      onRemove: () =>
        setFilters((prev) => ({
          ...prev,
          delivery: prev.delivery.filter((item) => item !== value),
        })),
    })),
    ...(filters.sortBy !== 'relevance'
      ? [
          {
            key: 'sort',
            label: SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ?? '',
            onRemove: () => setFilters((prev) => ({ ...prev, sortBy: 'relevance' })),
          },
        ]
      : []),
  ];

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Print shops {location ? `in ${location}` : 'near you'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {loading ? 'Finding shops…' : `${results.length} shops available`}
        </p>
      </header>

      <StoreSearchBar
        location={location}
        query={query}
        onLocationChange={setLocation}
        onQueryChange={setQuery}
        onSubmit={handleSearch}
      />

      <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
        <button type="button" onClick={() => setDrawerOpen(true)} className="btn-secondary">
          <IconSettings className="h-4 w-4" /> Filters
          {activeChips.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
              {activeChips.length}
            </span>
          )}
        </button>
        <select
          value={filters.sortBy}
          onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}
          className="input max-w-[11rem] py-2 text-sm"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              {chip.label}
              <IconX className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <StoreFilters
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          resultCount={results.length}
        />

        <div>
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <StoreCardSkeleton key={index} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
