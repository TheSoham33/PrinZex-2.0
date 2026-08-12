'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import LoginTabs from '@/components/auth/LoginTabs';
import { IconPrinter } from '@/components/icons';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  
  const returnUrl = searchParams.get('returnUrl') || '';
  // If we're redirecting back to seller registration, we MUST login as a customer first.
  const initialTab = returnUrl.includes('/seller/register') ? 'Customer' : 'Customer';

  useEffect(() => {
    if (user) {
      router.replace(returnUrl || '/stores');
    }
  }, [user, router, returnUrl]);

  if (user) return null;

  return (
    <div>
      <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <IconPrinter className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-slate-900">
          Prin<span className="text-blue-600">Zex</span>
        </span>
      </Link>

      <LoginTabs initialTab={initialTab} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 rounded-2xl" />}>
      <LoginContent />
    </Suspense>
  );
}
