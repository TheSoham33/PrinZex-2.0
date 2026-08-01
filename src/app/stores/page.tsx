import { Suspense } from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import StoreCardSkeleton from '@/components/stores/StoreCardSkeleton';
import StoreListing from './StoreListing';

export const metadata: Metadata = {
  title: 'Browse print shops',
  description: 'Compare print shops near you by rating, distance, price and turnaround time.',
};

function ListingFallback() {
  return (
    <div className="container-page py-8">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <StoreCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export default function StoresPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        {/* useSearchParams requires a Suspense boundary during prerender. */}
        <Suspense fallback={<ListingFallback />}>
          <StoreListing />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
