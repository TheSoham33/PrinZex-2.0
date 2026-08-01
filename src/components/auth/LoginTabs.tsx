'use client';

import { useState } from 'react';
import CustomerLoginForm from './CustomerLoginForm';
import SellerLoginForm from './SellerLoginForm';

const TABS = ['Customer', 'Seller'] as const;
export type LoginTab = (typeof TABS)[number];

export default function LoginTabs({ initialTab = 'Customer' }: { initialTab?: LoginTab }) {
  const [tab, setTab] = useState<LoginTab>(initialTab);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {tab === 'Customer' ? 'Welcome back' : 'Seller sign in'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {tab === 'Customer'
          ? 'Log in to track orders, manage addresses and reorder in a tap.'
          : 'Access your seller hub to run your print shop.'}
      </p>

      <div
        role="tablist"
        aria-label="Account type"
        className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1"
      >
        {TABS.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Customer' ? <CustomerLoginForm /> : <SellerLoginForm />}
      </div>
    </div>
  );
}
