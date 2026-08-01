'use client';

import { useEffect, useState } from 'react';
import { clearToken } from '@/lib/api-client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { sellerLogout } from '@/store/slices/sellerAuthSlice';
import { useNewOrderCount } from './SellerSidebar';
import {
  IconArchive,
  IconBarChart2,
  IconLogOut,
  IconMoreHorizontal,
  IconPackage,
  IconSettings,
  IconStar,
  IconUsers,
  IconWallet,
  IconX,
} from '@/components/icons';

const PRIMARY = [
  { href: '/seller/dashboard/orders', label: 'Orders', icon: IconPackage, badge: true },
  { href: '/seller/dashboard/analytics', label: 'Analytics', icon: IconBarChart2 },
  { href: '/seller/dashboard/inventory', label: 'Inventory', icon: IconArchive },
  { href: '/seller/dashboard/payouts', label: 'Payouts', icon: IconWallet },
];

const SHEET_LINKS = [
  { href: '/seller/dashboard/reviews', label: 'Reviews', icon: IconStar },
  { href: '/seller/dashboard/team', label: 'Team', icon: IconUsers },
  { href: '/seller/dashboard/settings', label: 'Settings', icon: IconSettings },
];

export default function SellerMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const newCount = useNewOrderCount();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const handleLogout = () => {
    clearToken();
    dispatch(sellerLogout());
    setSheetOpen(false);
    router.push('/seller/login');
  };

  const sheetActive = SHEET_LINKS.some((link) => pathname.startsWith(link.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
        <div className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge && newCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {newCount}
                      <span className="sr-only"> new orders</span>
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              sheetActive ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <IconMoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-2xl bg-white pb-6"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">More</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3">
              {SHEET_LINKS.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                      active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <link.icon
                      className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                    {link.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <IconLogOut className="h-5 w-5" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
