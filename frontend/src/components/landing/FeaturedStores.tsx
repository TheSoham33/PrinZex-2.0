import Link from 'next/link';
import { MOCK_STORES } from '@/lib/mock-data/stores';
import StoreCard from '@/components/stores/StoreCard';
import { IconArrowRight } from '@/components/icons';

export default function FeaturedStores() {
  const featured = [...MOCK_STORES].sort((a, b) => b.rating - a.rating).slice(0, 3);

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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  );
}
