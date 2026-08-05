import { Suspense } from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import NotFoundState from '@/components/store-detail/NotFoundState';
import { getStoreById, MOCK_STORE_DETAILS } from '@/lib/mock-data/stores';
import OrderPageLogic from './OrderPageLogic';

export function generateStaticParams() {
  return MOCK_STORE_DETAILS.map((store) => ({ id: store.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = getStoreById(id);
  return { title: store ? `Order from ${store.name}` : 'Place an order' };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStoreById(id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        {store ? (
          <Suspense
            fallback={
              <div className="container-page py-10">
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="mt-6 h-96 animate-pulse rounded-xl bg-slate-100" />
              </div>
            }
          >
            <OrderPageLogic store={store} />
          </Suspense>
        ) : (
          <NotFoundState storeId={id} />
        )}
      </main>
    </div>
  );
}
