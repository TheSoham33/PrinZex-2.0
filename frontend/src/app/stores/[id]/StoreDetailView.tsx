'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StoreDetail } from '@/lib/domain/stores';
import StoreHeader from '@/components/store-detail/StoreHeader';
import StoreTabs from '@/components/store-detail/StoreTabs';
import StickyOrderBar from '@/components/store-detail/StickyOrderBar';
import { isStoreOpen } from '@/lib/api/mappers';

/**
 * Stable, primitive key for the weekly hours. Using this (instead of the
 * `hours` array itself) keeps the effect's dependency array fixed-length and
 * composed only of strings, so it can never change size between renders.
 */
function getHoursKey(hours: StoreDetail['hours']): string {
  return (hours ?? [])
    .map((entry) => `${entry.day}|${entry.closed ? 'closed' : `${entry.open}-${entry.close}`}`)
    .join(',');
}

export default function StoreDetailView({ store }: { store: StoreDetail }) {
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('service');

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(store.isOpen);

  // Recalculate on client to ensure timezone correctness. Same inputs as the
  // store listing so "outside" and "inside" never disagree.
  useEffect(() => {
    setIsOpen(isStoreOpen(store.openingTime, store.closingTime, { hours: store.hours }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.openingTime, store.closingTime, getHoursKey(store.hours)]);

  useEffect(() => {
    if (serviceIdParam) {
      setSelectedServiceId(serviceIdParam);
    }
  }, [serviceIdParam]);

  const selectedService =
    store.services.find((service) => service.id === selectedServiceId) ?? null;

  return (
    <>
      <StoreHeader store={{ ...store, isOpen }} />
      <div className="container-page">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <StoreTabs
            store={store}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
          <StickyOrderBar storeId={store.id} selectedService={selectedService} isOpen={isOpen} />
        </div>
      </div>
    </>
  );
}
