import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import NotFoundState from '@/components/store-detail/NotFoundState';
import OrderPageLogic from './OrderPageLogic';
import { mapBackendStoreDetailToFrontend } from '@/lib/api/mappers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getStore(id: string) {
  try {
    const res = await fetch(`${API_URL}/stores/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getStore(id);
  const store = data?.seller;
  return { title: store ? `Order from ${store.storeName}` : 'Place an order' };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStore(id);
  const frontendStore = data ? mapBackendStoreDetailToFrontend(data.seller, data.latestReviews) : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        {frontendStore ? (
          <OrderPageLogic store={frontendStore} />
        ) : (
          <NotFoundState storeId={id} />
        )}
      </main>
    </div>
  );
}
