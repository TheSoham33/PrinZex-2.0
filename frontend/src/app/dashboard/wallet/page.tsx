'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWalletTransactions, fetchWalletBalance } from '@/lib/api/wallet';
import WalletCard from '@/components/dashboard/WalletCard';
import TransactionRow from '@/components/dashboard/TransactionRow';
import { IconPackageOpen, IconTag } from '@/components/icons';

const TABS = ['Transactions', 'Vouchers & Coupons'] as const;

export default function WalletPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Transactions');

  const balanceQuery = useQuery({ queryKey: ['wallet-balance'], queryFn: fetchWalletBalance });
  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => fetchWalletTransactions(),
  });

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
              {transactionsQuery.data?.map((transaction: any) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <IconTag className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-900">No coupons available</p>
            <p className="mt-1 text-sm text-slate-600">
              Active offers and vouchers will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
