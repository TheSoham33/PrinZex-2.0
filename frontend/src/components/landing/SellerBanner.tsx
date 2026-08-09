import Link from 'next/link';
import { IconArrowRight, IconStore } from '@/components/icons';

const PERKS = [
  'Zero setup fee — list your shop for free',
  'Get discovered by customers within 5 km',
  'Weekly payouts straight to your bank',
];

export default function SellerBanner() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 py-12 sm:px-12 sm:py-16">
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
            aria-hidden
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-inset ring-white/20">
                <IconStore className="h-3.5 w-3.5" /> For print shop owners
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Fill your press with online orders
              </h2>
              <p className="mt-4 max-w-lg text-blue-100">
                Join hundreds of print shops across Kolkata already taking orders on PrinZex.
                Registration takes about five minutes.
              </p>

              <ul className="mt-6 space-y-2.5">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm text-blue-50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-400/20 text-green-300">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <Link href="/seller/register" className="btn mt-8 bg-white px-6 py-3 text-slate-900 hover:bg-blue-50">
                Register your shop <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="hidden lg:block">
              <div className="ml-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-sm text-blue-100">This month on PrinZex</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: 'Avg. orders per shop', value: '68' },
                    { label: 'Avg. monthly earnings', value: '₹42,500' },
                    { label: 'Repeat customer rate', value: '54%' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between border-b border-white/10 pb-3">
                      <span className="text-sm text-blue-200">{row.label}</span>
                      <span className="text-xl font-bold text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
