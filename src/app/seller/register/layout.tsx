import Link from 'next/link';
import { IconPrinter, IconShieldCheck, IconStore, IconWallet } from '@/components/icons';

const PERKS = [
  { icon: IconStore, title: 'Free listing', body: 'No setup or monthly fee — ever.' },
  { icon: IconWallet, title: 'Weekly payouts', body: 'Money in your account every Monday.' },
  { icon: IconShieldCheck, title: 'Verified badge', body: 'Build trust with new customers.' },
];

export default function SellerRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[22rem_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
            <IconPrinter className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">PrinZex</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Grow your print business online
          </h2>
          <p className="mt-3 leading-relaxed text-blue-100">
            Join 500+ shops taking orders on PrinZex. Registration takes about five minutes.
          </p>

          <ul className="mt-8 space-y-5">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 ring-1 ring-white/20">
                  <perk.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{perk.title}</p>
                  <p className="mt-0.5 text-sm text-blue-200">{perk.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-200">
          Need help? Call us at <span className="font-semibold text-white">1800 123 4567</span>
        </p>
      </aside>

      <div className="bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <IconPrinter className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">
              Prin<span className="text-blue-600">Zex</span>
            </span>
          </Link>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Register your print shop
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Five quick steps and you&apos;ll be ready to take orders.
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
