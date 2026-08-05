import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import NotFoundState from '@/components/store-detail/NotFoundState';
import StoreDetailView from './StoreDetailView';
import { mapBackendStoreDetailToFrontend } from '@/lib/api/mappers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getStore(id: string) {
  try {
    const res = await fetch(`${API_URL}/stores/${id}`, { next: { revalidate: 60 } });
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
  
  if (!store) return { title: 'Store not found' };
  return {
    title: store.storeName,
    description: store.description?.slice(0, 155),
  };
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStore(id);
  const frontendStore = data ? mapBackendStoreDetailToFrontend(data.seller, data.latestReviews) : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12">
        {frontendStore ? <StoreDetailView store={frontendStore} /> : <NotFoundState storeId={id} />}
      </main>
      <Footer />
    </div>
  );
}
