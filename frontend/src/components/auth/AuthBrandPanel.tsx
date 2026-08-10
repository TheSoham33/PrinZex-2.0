import Link from 'next/link';
import { IconPrinter, IconShieldCheck, IconStore, IconTruck } from '@/components/icons';

const HIGHLIGHTS = [
  { icon: IconStore, text: '500+ verified print shops across Kolkata' },
  { icon: IconTruck, text: 'Same-day delivery or 2-hour store pickup' },
  { icon: IconShieldCheck, text: 'Secure payments, refunded if a shop cancels' },
];

export default function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
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
        <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
          Printing shouldn&apos;t mean standing in a queue.
        </h2>
        <p className="mt-4 max-w-md leading-relaxed text-blue-100">
          Upload once, compare shops nearby, and get exactly what you need — delivered.
        </p>

        <ul className="mt-8 space-y-4">
          {HIGHLIGHTS.map((item) => (
            <li key={item.text} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 ring-1 ring-white/20">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="pt-1.5 text-sm text-blue-50">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-blue-200">© {new Date().getFullYear()} PrinZex · Made in Kolkata</p>
    </div>
  );
}
