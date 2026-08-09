'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { toggleCart } from '@/store/slices/cartSlice';
import { getMediaUrl } from '@/lib/utils';
import {
  IconChevronDown,
  IconLogOut,
  IconMenu,
  IconPackage,
  IconPrinter,
  IconStore,
  IconUser,
  IconX,
  IconShoppingCart,
} from '@/components/icons';

const NAV_LINKS = [
  { href: '/stores', label: 'Browse Shops' },
  { href: '/services', label: 'Services' },
  { href: '/#how-it-works', label: 'How it works' },
];

export default function Navbar() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Portals need `document`, which doesn't exist during server rendering.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close the avatar dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  // Lock body scroll while the mobile drawer is open, and allow Escape to close.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Close the drawer if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [menuOpen]);

  const handleLogout = () => {
    dispatch(logout());
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push('/');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  const avatarUrl = getMediaUrl(user?.avatarUrl);
  const cartItemsCount = useAppSelector((state) => state.cart.items.length);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <IconPrinter className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Prin<span className="text-blue-600">Zex</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user && (
            <button
              type="button"
              onClick={() => dispatch(toggleCart())}
              className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Cart, ${cartItemsCount} items`}
            >
              <IconShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {cartItemsCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition-colors hover:bg-slate-50"
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <span className="max-w-[8rem] truncate text-sm font-medium text-slate-700">
                  {user.name.split(' ')[0]}
                </span>
                <IconChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard/orders"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <IconPackage className="h-4 w-4 text-slate-400" /> My Orders
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <IconUser className="h-4 w-4 text-slate-400" /> Profile
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
          ) : (
            <>
              <Link href="/seller/register" className="btn-ghost text-sm">
                <IconStore className="h-4 w-4" /> Become a seller
              </Link>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </nav>

      {/*
        Rendered through a portal into <body>. The header sets `backdrop-blur`,
        and a backdrop-filter makes an element the containing block for its
        fixed-position descendants — which clamped this drawer to the 64px
        header instead of the viewport. Escaping the header fixes that.
      */}
      {menuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] animate-slide-in-right flex-col bg-white shadow-xl"
            >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <span className="font-bold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {user && (
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/orders"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      My Orders
                    </Link>
                  </>
                )}
                <Link
                  href="/seller/register"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Become a seller
                </Link>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 p-4">
              {user ? (
                <button type="button" onClick={handleLogout} className="btn-secondary w-full text-red-600">
                  <IconLogOut className="h-4 w-4" /> Log out
                </button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full">
                    Log in
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                    Sign up
                  </Link>
                </>
              )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
