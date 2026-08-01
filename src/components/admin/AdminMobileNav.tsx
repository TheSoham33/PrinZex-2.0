'use client';

import { useEffect, useState } from 'react';
import { clearToken } from '@/lib/api-client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { ADMIN_NAV } from './adminNav';
import { IconLogOut, IconMoreHorizontal, IconX } from '@/components/icons';

export default function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const permitted = ADMIN_NAV.filter(
    (item) => item.permission === null || admin?.permissions[item.permission],
  );
  // Bottom bar shows the first four; everything else lives in the sheet.
  const primary = permitted.slice(0, 4);
  const overflow = permitted.slice(4);

  const handleLogout = () => {
    clearToken();
    dispatch(adminLogout());
    setSheetOpen(false);
    router.push('/admin/login');
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-500"
          >
            <IconMoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {sheetOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setSheetOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="More admin sections"
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
                {overflow.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`}
                      />
                      {item.label}
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
          </div>,
          document.body,
        )}
    </>
  );
}
