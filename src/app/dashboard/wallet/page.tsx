'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchWalletBalance, MOCK_COUPONS } from '@/lib/api/wallet';
import WalletCard from '@/components/dashboard/WalletCard';
import TransactionRow from '@/components/dashboard/TransactionRow';
import { formatDate } from '@/lib/utils';
import { IconCheckCircle, IconCopy, IconPackageOpen, IconTag } from '@/components/icons';

const TABS = ['Transactions', 'Vouchers & Coupons'] as const;

export default function WalletPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Transactions');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const balanceQuery = useQuery({ queryKey: ['wallet-balance'], queryFn: fetchWalletBalance });
  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: fetchTransactions,
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Wallet</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your balance, past transactions and available offers.
        </p>
      </header>

      <div className="mt-6">
        <WalletCard balance={balanceQuery.data ?? 0} loading={balanceQuery.isLoading} />
      </div>

      <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="card mt-6 p-5">
        {tab === 'Transactions' ? (
          transactionsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (transactionsQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <IconPackageOpen className="h-6 w-6" />
              </span>
              <p className="mt-3 font-semibold text-slate-900">No transactions yet</p>
              <p className="mt-1 text-sm text-slate-600">
                Money you add or spend will show up here.
              </p>
            </div>
          ) : (
            <div>
              {transactionsQuery.data?.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {MOCK_COUPONS.map((coupon) => (
              <div
                key={coupon.code}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <IconTag className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{coupon.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{coupon.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Valid till {formatDate(coupon.expiresOn)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyCode(coupon.code)}
                  className="btn-secondary shrink-0 font-mono text-xs"
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <IconCheckCircle className="h-3.5 w-3.5 text-green-600" /> Copied
                    </>
                  ) : (
                    <>
                      <IconCopy className="h-3.5 w-3.5" /> {coupon.code}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
