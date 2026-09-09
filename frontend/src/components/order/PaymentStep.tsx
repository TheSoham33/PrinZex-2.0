'use client';

import { useState } from 'react';
import type { CostBreakdown, PaymentMethod } from '@/lib/domain/stores';
import { formatCurrency, walletCoverableMax } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconCreditCard,
  IconTag,
  IconTruck,
  IconWallet,
} from '@/components/icons';
import { ErrorNote, FieldError } from '@/components/ui';

const METHODS: { value: PaymentMethod; label: string; hint: string; icon: typeof IconWallet }[] = [
  { value: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm', icon: IconWallet },
  { value: 'card', label: 'Card', hint: 'Credit or debit card', icon: IconCreditCard },
  { value: 'wallet', label: 'PrinZex Wallet', hint: 'Pay from balance', icon: IconWallet },
  { value: 'cod', label: 'Cash on Delivery', hint: 'Pay when it arrives', icon: IconTruck },
];

interface PaymentStepProps {
  method: PaymentMethod;
  cost: CostBreakdown;
  dispatch: React.Dispatch<OrderAction>;
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  error: string | null;
  /** Id of the input the error belongs to (site-wide rule: show under the field). */
  errorField?: string | null;
  /** Coupon code validated server-side against the Coupon table. */
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  couponError: string | null;
  couponLoading: boolean;
  /**
   * Signed-in customer's wallet (balance drives the partial-wallet option and
   * the full-wallet affordability note). Absent for guests.
   */
  wallet?: { balance: number; useWallet: boolean; onToggle: (value: boolean) => void };
  /**
   * Admin toggle (Settings → Platform): may the wallet settle the platform
   * fee? Default false — the fee is always paid online from real money.
   */
  platformFeeFromWallet?: boolean;
}

export default function PaymentStep({
  method,
  cost,
  dispatch,
  agreed,
  onAgreedChange,
  error,
  errorField,
  couponCode,
  onCouponCodeChange,
  couponError,
  couponLoading,
  wallet,
  platformFeeFromWallet = false,
}: PaymentStepProps) {
  const [code, setCode] = useState(couponCode);
  const couponApplied = !!couponCode && cost.discount > 0;

  // The wallet may settle everything EXCEPT the platform fee (unless the
  // admin checkbox allows wallet-paid fees) — the fee always comes from real
  // money online. Partial wallet: the wallet settles up to that ceiling, the
  // gateway charges the remainder.
  const coverableMax = walletCoverableMax(cost.total, cost.platformFee ?? 0, platformFeeFromWallet);
  const walletApplied =
    wallet && method !== 'cod' && (method === 'wallet' || wallet.useWallet)
      ? Math.min(wallet.balance, coverableMax)
      : 0;
  const onlineDue = Math.max(0, cost.total - walletApplied);
  // Pure-wallet payment is impossible while a fee exists that it may not cover.
  const feeBlocksWallet = (cost.platformFee ?? 0) > 0 && !platformFeeFromWallet;

  const handleApply = () => {
    onCouponCodeChange(code.trim().toUpperCase());
  };

  const handleRemoveCoupon = () => {
    setCode('');
    onCouponCodeChange('');
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Payment</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose how you&apos;d like to pay. You can apply a coupon before confirming.
        </p>
      </header>

      {/* Form-level errors only — field-scoped ones render under their input */}
      <ErrorNote message={errorField ? null : error} />

      <section>
        <p className="label">Payment method</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {METHODS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_PAYMENT', payload: option.value })}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                method === option.value
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  method === option.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <option.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{option.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Wallet: guidance for full-wallet payment — balance too low, or the
          platform fee that must be paid online — plus the optional "use your
          balance first" panel on online methods. */}
      {method === 'wallet' && wallet && (wallet.balance < cost.total || feeBlocksWallet) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" id="order-wallet">
          <p className="flex items-start gap-2 text-sm text-amber-800">
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {feeBlocksWallet ? (
              <>
                The platform fee of {formatCurrency(cost.platformFee ?? 0)} must be paid
                online. Pick UPI/Card and tick &quot;use wallet balance&quot; — the wallet covers
                everything except that fee.
              </>
            ) : (
              <>
                Your wallet has {formatCurrency(wallet.balance)} but this order needs{' '}
                {formatCurrency(cost.total)}. Pick UPI/Card and tick &quot;use wallet balance&quot; to pay
                part from the wallet, or top up your wallet first.
              </>
            )}
          </p>
        </div>
      )}
      {(method === 'upi' || method === 'card') && wallet && wallet.balance > 0 && (
        <section id="order-wallet" className="rounded-xl border border-green-200 bg-green-50/60 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              id="order-use-wallet"
              type="checkbox"
              checked={wallet.useWallet}
              onChange={(event) => wallet.onToggle(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-green-600 focus:ring-2 focus:ring-green-500/30"
            />
            <span className="text-slate-700">
              <span className="font-semibold text-slate-900">
                Use wallet balance ({formatCurrency(wallet.balance)} available)
              </span>
              <br />
              {walletApplied >= cost.total
                ? 'Your wallet covers this order in full — nothing to pay online.'
                : `${formatCurrency(walletApplied)} goes from your wallet, ${formatCurrency(onlineDue)} via ${method.toUpperCase()}.`}
            </span>
          </label>
        </section>
      )}

      <section>
        <label htmlFor="coupon" className="label">
          Have a coupon?
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconTag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="coupon"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="input pl-9 uppercase"
            />
          </div>
          {couponApplied ? (
            <button type="button" onClick={handleRemoveCoupon} className="btn-secondary shrink-0">
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={!code.trim() || couponLoading}
              className="btn-secondary shrink-0 disabled:opacity-50"
            >
              {couponLoading ? 'Checking…' : 'Apply'}
            </button>
          )}
        </div>

        {couponError && (
          <p className="field-error mt-2 text-red-600">
            <IconAlertCircle className="h-3.5 w-3.5" /> {couponError}
          </p>
        )}
        {couponApplied && !couponError && (
          <p className="field-error mt-2 text-green-600">
            <IconCheckCircle className="h-3.5 w-3.5" /> {couponCode} applied — you saved{' '}
            {formatCurrency(cost.discount)}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">Final amount</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(cost.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Delivery</dt>
            <dd className="font-medium text-slate-900">
              {cost.deliveryFee === 0 ? 'Free' : formatCurrency(cost.deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">GST (18%)</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(cost.tax)}</dd>
          </div>
          {(cost.platformFee ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">Platform fee</dt>
              <dd className="font-medium text-slate-900">{formatCurrency(cost.platformFee!)}</dd>
            </div>
          )}
          {cost.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <dt>Discount</dt>
              <dd className="font-medium">−{formatCurrency(cost.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2.5">
            <dt className="font-semibold text-slate-900">Total payable</dt>
            <dd className="text-lg font-extrabold text-slate-900">{formatCurrency(cost.total)}</dd>
          </div>
          {walletApplied > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <dt>From PrinZex Wallet</dt>
                <dd className="font-medium">−{formatCurrency(walletApplied)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-semibold text-slate-900">
                  {method === 'wallet' || onlineDue === 0 ? 'Due now' : 'Payable online'}
                </dt>
                <dd className="text-lg font-extrabold text-slate-900">
                  {onlineDue === 0 ? 'Fully covered' : formatCurrency(onlineDue)}
                </dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <div id="order-terms">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => onAgreedChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
          />
          <span>
            I agree to PrinZex&apos;s <span className="font-medium text-blue-600">Terms of Service</span> and
            confirm that the uploaded file is print-ready.
          </span>
        </label>
        <FieldError message={errorField === 'order-terms' ? error : null} />
      </div>
    </div>
  );
}
