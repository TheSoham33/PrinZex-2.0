'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { sellerLogout } from '@/store/slices/sellerAuthSlice';
import { fetchSellerOrders } from '@/lib/api/seller-orders';
import {
  IconArchive,
  IconBarChart2,
  IconLogOut,
  IconPackage,
  IconSettings,
  IconStar,
  IconTag,
  IconUsers,
  IconWallet,
} from '@/components/icons';

export const SELLER_NAV = [
  { href: '/seller/dashboard/orders', label: 'Orders', icon: IconPackage, badge: true },
  { href: '/seller/dashboard/analytics', label: 'Analytics', icon: IconBarChart2, disabled: true },
  { href: '/seller/dashboard/inventory', label: 'Inventory', icon: IconArchive, disabled: true },
  { href: '/seller/dashboard/pricing', label: 'Pricing', icon: IconTag, disabled: true },
  { href: '/seller/dashboard/payouts', label: 'Payouts', icon: IconWallet, disabled: true },
  { href: '/seller/dashboard/reviews', label: 'Reviews', icon: IconStar, disabled: true },
  { href: '/seller/dashboard/team', label: 'Team', icon: IconUsers, disabled: true },
  { href: '/seller/dashboard/settings', label: 'Settings', icon: IconSettings, disabled: true },
];

/**
 * Reads the same `['seller-orders']` cache the orders page mutates, so the
 * "placed" badge updates the instant an order is accepted or rejected.
 */
export function useNewOrderCount(): number {
  const { data } = useQuery({ queryKey: ['seller-orders'], queryFn: () => fetchSellerOrders({}) });
  const items = data?.data || (Array.isArray(data) ? data : []);
  return items.filter((order: any) => order.status === 'placed' || order.status === 'new').length;
}

export default function SellerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const newCount = useNewOrderCount();

  const handleLogout = () => {
    dispatch(sellerLogout());
    router.push('/seller/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 top-16 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {SELLER_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const showBadge = item.badge && newCount > 0;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                title="Coming Soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 opacity-60 transition-colors"
              >
                <item.icon className="h-5 w-5 text-slate-300" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  {newCount}
                  <span className="sr-only"> new orders</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <IconLogOut className="h-5 w-5" /> Log out
        </button>
      </div>
    </aside>
  );
}
