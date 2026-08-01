'use client';

import { useEffect, useRef, useState } from 'react';
import { clearToken } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { sellerLogout } from '@/store/slices/sellerAuthSlice';
import { useNewOrderCount } from './SellerSidebar';
import {
  IconBell,
  IconChevronDown,
  IconLogOut,
  IconPrinter,
  IconSettings,
} from '@/components/icons';

export default function SellerNavbar() {
  const seller = useAppSelector((state) => state.sellerAuth.seller);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const newCount = useNewOrderCount();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    clearToken();
    dispatch(sellerLogout());
    setMenuOpen(false);
    router.push('/seller/login');
  };

  const initials = seller?.storeName
    ? seller.storeName
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PS';

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/seller/dashboard/orders" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <IconPrinter className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-900">
              Prin<span className="text-blue-600">Zex</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Seller Hub
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[12rem] truncate text-sm font-medium text-slate-600 md:block">
            {seller?.storeName}
          </span>

          <Link
            href="/seller/dashboard/orders"
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Notifications, ${newCount} new orders`}
          >
            <IconBell className="h-5 w-5" />
            {newCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {newCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials}
              </span>
              <IconChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {seller?.storeName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{seller?.email}</p>
                </div>
                <Link
                  href="/seller/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <IconSettings className="h-4 w-4 text-slate-400" /> Store settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <IconLogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
