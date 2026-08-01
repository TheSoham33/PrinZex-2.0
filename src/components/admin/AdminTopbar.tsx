'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clearToken } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout, ROLE_BADGE_STYLES, ROLE_LABELS } from '@/store/slices/adminAuthSlice';
import {
  IconBell,
  IconChevronDown,
  IconLogOut,
  IconPrinter,
  IconSearch,
  IconUser,
} from '@/components/icons';

export default function AdminTopbar() {
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  /** Route the query to the most relevant section based on its shape. */
  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    const upper = q.toUpperCase();
    if (upper.startsWith('ORD-')) router.push(`/admin/orders/${upper}`);
    else if (upper.startsWith('T-')) router.push('/admin/support');
    else if (upper.startsWith('PO-')) router.push('/admin/payouts');
    else if (upper.startsWith('SLR-')) router.push(`/admin/sellers/${upper}`);
    else if (upper.startsWith('DLV-')) router.push(`/admin/delivery/${upper}`);
    else if (q.includes('@')) router.push('/admin/users');
    else router.push('/admin/orders');

    setQuery('');
  };

  const initials = admin?.name
    ? admin.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <IconPrinter className="h-5 w-5" />
          </span>
          <span className="hidden text-base font-bold tracking-tight text-slate-900 sm:block">
            PrinZex <span className="text-slate-400">Admin</span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label htmlFor="admin-search" className="sr-only">
            Search orders, users, sellers
          </label>
          <input
            id="admin-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ORD-, T-, PO-, or an email…"
            className="input py-2 pl-9 text-sm"
          />
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Notifications, 4 unread"
          >
            <IconBell className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              4
            </span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-sm font-medium text-slate-700 md:block">
                {admin?.name.split(' ')[0]}
              </span>
              <IconChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{admin?.name}</p>
                  <p className="truncate text-xs text-slate-500">{admin?.email}</p>
                  {admin && (
                    <span
                      className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        ROLE_BADGE_STYLES[admin.role]
                      }`}
                    >
                      {ROLE_LABELS[admin.role]}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <IconUser className="h-4 w-4 text-slate-400" /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearToken();
                    dispatch(adminLogout());
                    router.push('/admin/login');
                  }}
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
