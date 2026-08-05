'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav';
import { IconPrinter } from '@/components/icons';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  // Wait one tick so the persisted session can rehydrate before we redirect.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (checked && !user) router.replace('/login');
  }, [checked, user, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-blue-600 text-white">
            <IconPrinter className="h-6 w-6" />
          </span>
          <p className="text-sm text-slate-500">
            {checked ? 'Redirecting to login…' : 'Loading your dashboard…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <DashboardMobileNav />
    </div>
  );
}
