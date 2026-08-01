'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import type { AdminPermissions } from '@/store/slices/adminAuthSlice';
import AdminTopbar from '@/components/admin/AdminTopbar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import { ToastProvider } from '@/components/seller-dashboard/Toast';
import { SIDEBAR_STORAGE_KEY } from '@/components/admin/adminNav';
import { IconPrinter } from '@/components/icons';

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

/**
 * Permission check for the signed-in admin. Used to gate nav items, page
 * actions, and whole pages.
 */
export function usePermission(permission: keyof AdminPermissions): boolean {
  const admin = useAppSelector((state) => state.adminAuth.admin);
  return Boolean(admin?.permissions[permission]);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const [checked, setChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isLoginRoute = pathname === '/admin/login';

  // Sidebar collapse is a UI preference, so localStorage is the right home.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // Let the persisted session rehydrate before deciding to redirect.
  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (checked && !admin && !isLoginRoute) router.replace('/admin/login');
  }, [checked, admin, isLoginRoute, router]);

  // The login page renders standalone, outside the admin shell.
  if (isLoginRoute) return <>{children}</>;

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-slate-900 text-white">
            <IconPrinter className="h-6 w-6" />
          </span>
          <p className="text-sm text-slate-500">
            {checked ? 'Redirecting to sign in…' : 'Loading admin portal…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50">
          <AdminTopbar />
          <AdminSidebar />
          <div className={`pt-16 transition-[padding] ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
            <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
          </div>
          <AdminMobileNav />
        </div>
      </ToastProvider>
    </SidebarContext.Provider>
  );
}
