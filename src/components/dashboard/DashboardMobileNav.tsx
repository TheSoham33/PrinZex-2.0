'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconPackage,
  IconUser,
  IconWallet,
} from '@/components/icons';

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: IconLayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Orders', icon: IconPackage },
  { href: '/dashboard/wallet', label: 'Wallet', icon: IconWallet },
  { href: '/dashboard/profile', label: 'Profile', icon: IconUser },
];

export default function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
      <div className="grid grid-cols-4">
        {MOBILE_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
