'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { toggleCart } from '@/store/slices/cartSlice';
import { getMediaUrl } from '@/lib/utils';
import {
  IconBell,
  IconLayoutDashboard,
  IconLogOut,
  IconMapPin,
  IconPackage,
  IconPrinter,
  IconTruck,
  IconUser,
  IconWallet,
  IconShoppingCart,
} from '@/components/icons';

export const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Overview', icon: IconLayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Orders', icon: IconPackage },
  { href: 'cart', label: 'Cart', icon: IconShoppingCart, isCart: true },
  { href: '/dashboard/tracking', label: 'Tracking', icon: IconTruck },
  { href: '/dashboard/wallet', label: 'Wallet', icon: IconWallet },
  { href: '/dashboard/addresses', label: 'Addresses', icon: IconMapPin },
  { href: '/dashboard/notifications', label: 'Notifications', icon: IconBell },
  { href: '/dashboard/profile', label: 'Profile', icon: IconUser },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const cartItemsCount = useAppSelector((state) => state.cart.items.length);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  const avatarUrl = getMediaUrl(user?.avatarUrl);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <IconPrinter className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Prin<span className="text-blue-600">Zex</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {DASHBOARD_NAV.map((item) => {
          if (item.isCart) {
            return (
              <button
                key="cart-btn"
                type="button"
                onClick={() => dispatch(toggleCart())}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <div className="relative">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {cartItemsCount}
                    </span>
                  )}
                </div>
                {item.label}
              </button>
            );
          }

          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3">
        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        )}
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
