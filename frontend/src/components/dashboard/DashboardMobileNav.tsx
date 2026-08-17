'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleCart } from '@/store/slices/cartSlice';
import {
  IconLayoutDashboard,
  IconPackage,
  IconUser,
  IconWallet,
  IconShoppingCart,
} from '@/components/icons';

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: IconLayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Orders', icon: IconPackage },
  { href: 'cart', label: 'Cart', icon: IconShoppingCart, isCart: true },
  { href: '/dashboard/wallet', label: 'Wallet', icon: IconWallet },
  { href: '/dashboard/profile', label: 'Profile', icon: IconUser },
];

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const cartItemsCount = useAppSelector((state) => state.cart.items.length);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
      <div className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
          if (item.isCart) {
            return (
              <button
                key="cart-btn"
                type="button"
                onClick={() => dispatch(toggleCart())}
                className="relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-500 transition-colors"
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {cartItemsCount}
                    </span>
                  )}
                </div>
                {item.label}
              </button>
            );
          }

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
