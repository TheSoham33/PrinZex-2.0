'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { useSidebar } from '@/app/admin/layout';
import { ADMIN_NAV } from './adminNav';
import { IconChevronsLeft, IconChevronsRight, IconLogOut } from '@/components/icons';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const { collapsed, toggle } = useSidebar();

  // Only surface sections this admin's role can reach.
  const items = ADMIN_NAV.filter(
    (item) => item.permission === null || (admin?.permissions && admin.permissions[item.permission]),
  );

  const handleLogout = () => {
    dispatch(adminLogout());
    router.push('/admin/login');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 top-16 hidden flex-col border-r border-slate-200 bg-white transition-[width] lg:flex ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <IconLogOut className="h-5 w-5 shrink-0" />
          {!collapsed && 'Log out'}
          {collapsed && <span className="sr-only">Log out</span>}
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {collapsed ? (
            <IconChevronsRight className="h-5 w-5 shrink-0" />
          ) : (
            <IconChevronsLeft className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
