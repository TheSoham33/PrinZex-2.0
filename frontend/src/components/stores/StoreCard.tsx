import Link from 'next/link';
import type { Store } from '@/lib/mock-data/stores';
import { storeGradient } from '@/lib/mock-data/stores';
import { IconBadgeCheck, IconClock, IconMapPin, IconStar, IconStore } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

export default function StoreCard({ store }: { store: Store }) {
  const href = store.matchedService 
    ? `/stores/${store.id}?service=${store.matchedService.id}`
    : `/stores/${store.id}`;

  return (
    <Link
      href={href}
      className="card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div
        className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${storeGradient(store.id)}`}
      >
        <IconStore className="h-10 w-10 text-white/70" />
        <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-slate-700">
          {store.priceRange}
        </span>
        {store.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-blue-700">
            <IconBadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
        <span className={`absolute bottom-3 left-3 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${store.isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {store.isOpen ? 'Open Now' : 'Closed'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight text-slate-900 group-hover:text-blue-600">
            {store.name}
          </h3>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-bold text-green-700">
            <IconStar className="h-3 w-3 fill-current" />
            {Number(store.rating).toFixed(1)}
          </span>
        </div>

        {store.matchedService ? (
          <div className="mt-3 rounded-lg bg-blue-50 p-2.5 border border-blue-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Matched Service</p>
            <div className="mt-1 flex items-baseline justify-between">
              <p className="text-sm font-bold text-slate-900">{store.matchedService.serviceName}</p>
              <p className="text-sm font-extrabold text-blue-700">
                {formatCurrency(store.matchedService.basePrice)}
                <span className="ml-0.5 text-[10px] font-normal text-slate-500">/{store.matchedService.unit.split(' ')[1] || 'unit'}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">{store.reviewCount} reviews</p>
        )}

        {!store.matchedService && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {store.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <IconMapPin className="h-3.5 w-3.5" /> {store.distanceKm} km
          </span>
          <span className="inline-flex items-center gap-1">
            <IconClock className="h-3.5 w-3.5" /> {store.etaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
