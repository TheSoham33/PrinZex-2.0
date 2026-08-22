import Link from 'next/link';
import { IconPrinter } from '@/components/icons';

const COLUMNS = [
  {
    title: 'For customers',
    links: [
      { href: '/stores', label: 'Browse shops' },
      { href: '/dashboard/orders', label: 'Track an order' },
      { href: '/dashboard/wallet', label: 'Wallet & offers' },
      { href: '/#how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'For sellers',
    links: [
      { href: '/seller/register', label: 'Register your shop' },
      { href: '/seller/dashboard/orders', label: 'Seller dashboard' },
      { href: '/seller/dashboard/orders', label: 'Manage orders' },
      { href: '/seller/dashboard/settings', label: 'Store settings' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/#services', label: 'Services' },
      { href: '/login', label: 'Log in' },
      { href: '/signup', label: 'Create account' },
      { href: '/forgot-password', label: 'Reset password' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <IconPrinter className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Prin<span className="text-blue-600">Zex</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              A marketplace connecting you with trusted local print shops. Built for Kolkata,
              expanding across India.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-slate-900">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} PrinZex. All rights reserved.
          </p>
          <p className="text-sm text-slate-500">Made in Kolkata, India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
