import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import NotFoundState from '@/components/store-detail/NotFoundState';
import { getStoreById, MOCK_STORE_DETAILS } from '@/lib/mock-data/stores';
import StoreDetailView from './StoreDetailView';

/** Pre-render every known store at build time. */
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
  if (!store) return { title: 'Store not found' };
  return {
    title: store.name,
    description: store.description.slice(0, 155),
  };
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStoreById(id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12">
        {store ? <StoreDetailView store={store} /> : <NotFoundState storeId={id} />}
      </main>
      <Footer />
    </div>
  );
}
