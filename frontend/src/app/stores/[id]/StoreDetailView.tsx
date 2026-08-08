'use client';

import { useState } from 'react';
import type { StoreDetail } from '@/lib/mock-data/stores';
import StoreHeader from '@/components/store-detail/StoreHeader';
import StoreInfoBar from '@/components/store-detail/StoreInfoBar';
import StoreTabs from '@/components/store-detail/StoreTabs';
import StickyOrderBar from '@/components/store-detail/StickyOrderBar';

export default function StoreDetailView({ store }: { store: StoreDetail }) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const selectedService =
    store.services.find((service) => service.id === selectedServiceId) ?? null;

  return (
    <>
      <StoreHeader store={store} />
      <div className="container-page">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <StoreTabs
            store={store}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
          <StickyOrderBar storeId={store.id} selectedService={selectedService} isOpen={store.isOpen} />
        </div>
      </div>
    </>
  );
}
