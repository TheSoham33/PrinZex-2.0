import Link from 'next/link';
import type { StoreDetail } from '@/lib/mock-data/stores';
import { storeGradient } from '@/lib/mock-data/stores';
import {
  IconBadgeCheck,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconStar,
  IconStore,
} from '@/components/icons';

export default function StoreHeader({ store }: { store: StoreDetail }) {
  return (
    <div>
      <nav aria-label="Breadcrumb" className="container-page pt-5">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
          </li>
          <IconChevronRight className="h-4 w-4" />
          <li>
            <Link href="/stores" className="hover:text-blue-600">
              Stores
            </Link>
          </li>
          <IconChevronRight className="h-4 w-4" />
          <li className="font-medium text-slate-900">{store.name}</li>
        </ol>
      </nav>

      <div className="container-page pb-6 pt-5">
        <div
          className={`relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br sm:h-56 ${storeGradient(
            store.id,
          )}`}
        >
          <IconStore className="h-16 w-16 text-white/60" />
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {store.name}
              </h1>
              {store.verified && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  <IconBadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 font-bold text-green-700">
                  <IconStar className="h-3.5 w-3.5 fill-current" />
                  {Number(store.rating).toFixed(1)}
                </span>
                <span className="text-slate-500">({store.reviewCount} reviews)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin className="h-4 w-4 text-slate-400" /> {store.distanceKm} km away
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconClock className="h-4 w-4 text-slate-400" /> {store.etaLabel}
              </span>
              <span className="font-semibold text-slate-700">{store.priceRange}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {store.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
