'use client';

import Link from 'next/link';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import LoginTabs from '@/components/auth/LoginTabs';
import { IconPrinter } from '@/components/icons';

/** Dedicated seller entry point — same split layout, Seller tab preselected. */
export default function SellerLoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <IconPrinter className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">
              Prin<span className="text-blue-600">Zex</span>
            </span>
          </Link>

          <LoginTabs initialTab="Seller" />
        </div>
      </div>
    </div>
  );
}
