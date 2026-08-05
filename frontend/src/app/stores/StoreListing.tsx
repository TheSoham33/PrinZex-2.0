'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { fetchStores } from '@/lib/api/stores';
import { mapBackendStoreToFrontend } from '@/lib/api/mappers';
import { IconSettings, IconX } from '@/components/icons';

export default function StoreListing() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({ lat: 22.5726, lng: 88.3639 }); // Default to Kolkata for demo

  // Get user's current location for distance calculation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      );
    }
  }, []);

  const page = Number(searchParams.get('page')) || 1;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stores', location, query, filters, page],
    queryFn: () => fetchStores({
      city: location || undefined,
      q: query || undefined,
      services: filters.services.join(','),
      minRating: filters.minRating || undefined,
      sort: filters.sortBy as any,
      page,
      limit: 12
    }),
  });

  const results = data?.data || []; 
  const totalCount = data?.pagination?.total ?? results.length;

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
          {isLoading ? 'Finding shops…' : `${totalCount} shops available`}
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
          resultCount={totalCount}
        />

        <div>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <StoreCardSkeleton key={index} />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="text-red-600">Failed to load stores. Please try again.</p>
            </div>
          ) : results.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((store: any) => (
                <StoreCard 
                  key={store.id} 
                  store={mapBackendStoreToFrontend(store, userCoords?.lat, userCoords?.lng)} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
