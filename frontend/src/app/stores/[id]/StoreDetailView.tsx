'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StoreDetail } from '@/lib/mock-data/stores';
import StoreHeader from '@/components/store-detail/StoreHeader';
import StoreTabs from '@/components/store-detail/StoreTabs';
import StickyOrderBar from '@/components/store-detail/StickyOrderBar';

export default function StoreDetailView({ store }: { store: StoreDetail }) {
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('service');
  
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  useEffect(() => {
    if (serviceIdParam) {
      setSelectedServiceId(serviceIdParam);
    }
  }, [serviceIdParam]);

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
