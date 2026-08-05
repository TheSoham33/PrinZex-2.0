'use client';

import Link from 'next/link';
import LoginTabs from '@/components/auth/LoginTabs';
import { IconPrinter } from '@/components/icons';

export default function LoginPage() {
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

      <LoginTabs initialTab="Customer" />
    </div>
  );
}
