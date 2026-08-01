import { Suspense } from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import NotFoundState from '@/components/store-detail/NotFoundState';
import { getStoreDetail } from '@/lib/server/store-queries';
import OrderPageLogic from './OrderPageLogic';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await getStoreDetail(id);
  return { title: store ? `Order from ${store.name}` : 'Place an order' };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStoreDetail(id);

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
