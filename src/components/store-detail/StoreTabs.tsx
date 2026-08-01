'use client';

import { useState } from 'react';
import type { StoreDetail } from '@/lib/types/stores';
import ServicesList from './ServicesList';
import ReviewCard from './ReviewCard';
import ReviewsSummary from './ReviewsSummary';
import AboutSection from './AboutSection';

const TABS = ['Services', 'Reviews', 'About'] as const;
type Tab = (typeof TABS)[number];

interface StoreTabsProps {
  store: StoreDetail;
  selectedServiceId: string | null;
  onSelectService: (serviceId: string) => void;
}

export default function StoreTabs({ store, selectedServiceId, onSelectService }: StoreTabsProps) {
  const [active, setActive] = useState<Tab>('Services');

  return (
    <div className="card overflow-hidden">
      <div role="tablist" className="flex border-b border-slate-200">
        {TABS.map((tab) => {
          const count =
            tab === 'Services'
              ? store.services.length
              : tab === 'Reviews'
                ? store.reviewCount
                : null;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active === tab}
              onClick={() => setActive(tab)}
              className={`relative flex-1 px-4 py-3.5 text-sm font-semibold transition-colors sm:flex-none sm:px-6 ${
                active === tab
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {tab}
              {count !== null && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">({count})</span>
              )}
              {active === tab && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {active === 'Services' && (
          <ServicesList
            services={store.services}
            selectedId={selectedServiceId}
            onSelect={onSelectService}
          />
        )}

        {active === 'Reviews' && (
          <div>
            <ReviewsSummary
              rating={store.rating}
              reviewCount={store.reviewCount}
              breakdown={store.ratingBreakdown}
            />
            <div className="mt-2">
              {store.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}

        {active === 'About' && <AboutSection store={store} />}
      </div>
    </div>
  );
}
