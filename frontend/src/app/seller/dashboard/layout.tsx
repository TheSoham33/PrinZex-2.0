'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import SellerNavbar from '@/components/seller-dashboard/SellerNavbar';
import SellerSidebar from '@/components/seller-dashboard/SellerSidebar';
import SellerMobileNav from '@/components/seller-dashboard/SellerMobileNav';
import DynamicBreadcrumbs from '@/components/common/DynamicBreadcrumbs';
import { ToastProvider } from '@/components/seller-dashboard/Toast';
import { IconAlertTriangle, IconMessageSquare, IconPrinter } from '@/components/icons';

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const seller = useAppSelector((state) => state.sellerAuth.seller);
  // Give the persisted session one tick to rehydrate before redirecting.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!seller) {
      router.replace('/seller/login');
    } else if (seller.status === 'PENDING') {
      router.replace('/seller/pending');
    }
  }, [checked, seller, router]);

  // Logged out or awaiting approval — show a placeholder while redirecting.
  if (!seller || seller.status === 'PENDING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-blue-600 text-white">
            <IconPrinter className="h-6 w-6" />
          </span>
          <p className="text-sm text-slate-500">
            {checked ? 'Redirecting…' : 'Loading your seller hub…'}
          </p>
        </div>
      </div>
    );
  }

  const isSuspended = seller.status === 'SUSPENDED';

  // Suspended sellers get a terminal message instead of any dashboard content.
  if (isSuspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <IconAlertTriangle className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Your store has been suspended</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your seller account is currently suspended, so the dashboard isn&apos;t available. This
            usually happens after a policy violation or a failed verification check. Our support
            team can walk you through what&apos;s needed to restore access.
          </p>
          <a href="mailto:support@prinzex.in" className="btn-primary mt-6 w-full">
            <IconMessageSquare className="h-4 w-4" /> Contact support
          </a>
          <Link href="/" className="btn-secondary mt-3 w-full">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <SellerNavbar />
        <SellerSidebar />
        <div className="pt-16 lg:pl-60">
          <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
            <DynamicBreadcrumbs sellerDashboard />
            {children}
          </main>
        </div>
        <SellerMobileNav />
      </div>
    </ToastProvider>
  );
}
