'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPayouts } from '@/lib/api/seller-inventory';
import {
  COMMISSION_RATE,
  PAYOUT_STATUS_STYLES,
} from '@/lib/types/seller-inventory';
import PayoutCard from '@/components/seller-dashboard/PayoutCard';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  IconAlertCircle,
  IconChevronRight,
  IconDownload,
  IconRefreshCw,
  IconShieldCheck,
} from '@/components/icons';

export default function SellerPayoutsPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-payouts'],
    queryFn: fetchPayouts,
  });

  const payouts = data ?? [];

  const pendingBalance = payouts
    .filter((payout) => payout.status !== 'paid')
    .reduce((sum, payout) => sum + payout.amount, 0);

  // Next payout run is the upcoming Monday.
  const nextPayoutDate = (() => {
    const date = new Date();
    const day = date.getDay();
    date.setDate(date.getDate() + (day === 0 ? 1 : 8 - day));
    return date.toISOString().slice(0, 10);
  })();

  const handleDownload = () => {
    // TODO: generate a real PDF statement server-side.
    showToast('Preparing your statement…');
    setTimeout(() => window.print(), 400);
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load payouts</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payouts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your earnings and weekly bank transfers.
        </p>
      </header>

      <div className="mt-6">
        <PayoutCard
          balance={pendingBalance}
          nextPayoutDate={nextPayoutDate}
          onRequestEarly={() => showToast('Early payout requested — we’ll review within 24 hours.')}
        />
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900">
              Platform commission — {COMMISSION_RATE}%
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              We deduct {COMMISSION_RATE}% from each completed order before payout. This covers
              payment processing, customer support and marketing that brings orders to your shop.
              Cancelled and returned orders are never charged commission.
            </p>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Example calculation</p>
              <dl className="mt-2 space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <dt>Order value</dt>
                  <dd className="font-medium text-slate-900">{formatCurrency(1000)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Commission ({COMMISSION_RATE}%)</dt>
                  <dd className="font-medium text-red-600">
                    −{formatCurrency(1000 * (COMMISSION_RATE / 100))}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <dt className="font-semibold text-slate-900">You receive</dt>
                  <dd className="font-bold text-green-700">
                    {formatCurrency(1000 - 1000 * (COMMISSION_RATE / 100))}
                  </dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={() => showToast('Commission policy coming soon.')}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View commission policy <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Payout history</h2>
        </div>

        {isLoading ? (
          <div className="h-72 animate-pulse bg-slate-100" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
              <caption className="sr-only">History of payouts to your bank account</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3">
                    Payout ID
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Orders
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Statement
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-medium text-slate-900">{payout.id}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {payout.bankAccount}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(payout.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{payout.ordersIncluded}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                          PAYOUT_STATUS_STYLES[payout.status]
                        }`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="btn-secondary whitespace-nowrap text-xs"
                        aria-label={`Download statement for payout ${payout.id}`}
                      >
                        <IconDownload className="h-3.5 w-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
