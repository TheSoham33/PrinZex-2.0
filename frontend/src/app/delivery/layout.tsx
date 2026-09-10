'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deliveryLogout } from '@/store/slices/deliveryAuthSlice';
import { deliveryLogoutApi } from '@/lib/api/delivery';
import { IconTruck, IconWallet, IconUser, IconLogOut } from '@/components/icons';

/** Public routes under /delivery that must NOT require a rider session. */
const PUBLIC_PATHS = ['/delivery/login', '/delivery/register'];

const NAV = [
  { href: '/delivery', label: 'Dashboard', icon: IconTruck },
  { href: '/delivery/earnings', label: 'Earnings', icon: IconWallet },
  { href: '/delivery/profile', label: 'Profile', icon: IconUser },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { deliveryBoy, accessToken } = useAppSelector((state) => state.deliveryAuth);
  // Give the persisted session one tick to rehydrate before redirecting.
  const [checked, setChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!isPublic && !accessToken) {
      router.replace('/delivery/login');
    }
  }, [checked, isPublic, accessToken, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (!accessToken) {
    // Redirecting to login (effect above) — render nothing in the meantime.
    return null;
  }

  const handleLogout = () => {
    void deliveryLogoutApi().catch(() => {
      /* best-effort — the local session clears regardless */
    });
    dispatch(deliveryLogout());
    router.replace('/delivery/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <Link href="/delivery" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <IconTruck className="h-4 w-4" />
            </span>
            PrinZex <span className="text-blue-600">Delivery</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 md:inline">
              {deliveryBoy?.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <IconLogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="container-page max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
