import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconMailCheck,
  IconPhone,
  IconPrinter,
  IconShieldCheck,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Application submitted',
  description: 'Your PrinZex seller application is under review.',
};

const TIMELINE = [
  {
    icon: IconCheckCircle,
    title: 'Application received',
    body: 'We have everything we need from you.',
    done: true,
  },
  {
    icon: IconShieldCheck,
    title: 'Document verification',
    body: 'Our team is checking your GST and business documents.',
    done: false,
  },
  {
    icon: IconPrinter,
    title: 'Store goes live',
    body: 'Your shop appears in search and starts receiving orders.',
    done: false,
  },
];

export default function SellerPendingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <IconPrinter className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">
              Prin<span className="text-blue-600">Zex</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="card overflow-hidden">
            <div className="flex flex-col items-center bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white ring-4 ring-white/20">
                <IconClock className="h-8 w-8" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                Application submitted!
              </h1>
              <p className="mt-2 max-w-md text-sm text-blue-100">
                Thanks for registering. Our team reviews new shops within 24–48 hours.
              </p>
            </div>

            <div className="p-6">
              <ol className="space-y-5">
                {TIMELINE.map((item, index) => (
                  <li key={item.title} className="relative flex gap-4">
                    {index < TIMELINE.length - 1 && (
                      <span
                        className={`absolute left-[19px] top-11 h-[calc(100%-0.5rem)] w-0.5 ${
                          item.done ? 'bg-blue-500' : 'bg-slate-200'
                        }`}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        item.done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div className="pt-1.5">
                      <p
                        className={`font-semibold ${item.done ? 'text-slate-900' : 'text-slate-500'}`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex items-start gap-2.5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <IconMailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                We&apos;ll email you the moment your shop is approved. Keep an eye on your inbox.
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/seller/dashboard" className="btn-primary flex-1">
                  Go to seller dashboard <IconArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/" className="btn-secondary flex-1">
                  Back to home
                </Link>
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                <IconPhone className="h-3.5 w-3.5" /> Questions? Call 1800 123 4567 (9 AM – 7 PM)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
