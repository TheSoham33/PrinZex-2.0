'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '@/lib/api/stores';
import { mapBackendStoreToFrontend } from '@/lib/api/mappers';
import StoreCard from '@/components/stores/StoreCard';
import type { Store } from '@/lib/domain/stores';
import { IconArrowRight } from '@/components/icons';

export default function FeaturedStores() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-stores'],
    queryFn: () => fetchStores({ sort: 'rating', limit: 3 }),
  });

  const stores = (data?.data ?? (Array.isArray(data) ? data : []))
    .map((store: any) => mapBackendStoreToFrontend(store))
    .sort((a: any, b: any) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Top-rated near you
            </h2>
            <p className="mt-2 text-slate-600">
              Highest rated print shops in Kolkata this month.
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View all shops <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card h-72 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="mt-10 card px-6 py-14 text-center text-slate-500">
            No featured stores right now — check back soon.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: Store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
