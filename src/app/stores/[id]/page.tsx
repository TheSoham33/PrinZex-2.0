import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import NotFoundState from '@/components/store-detail/NotFoundState';
import { getStoreDetail } from '@/lib/server/store-queries';
import StoreDetailView from './StoreDetailView';

/** Stores are rendered on-demand against the live database. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await getStoreDetail(id);
  if (!store) return { title: 'Store not found' };
  return {
    title: store.name,
    description: store.description.slice(0, 155),
  };
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStoreDetail(id);

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
