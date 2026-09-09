'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCart, setCartOpen } from '@/store/slices/cartSlice';
import { useQuery } from '@tanstack/react-query';
import { fetchAddresses } from '@/lib/api/customer';
import { placeOrder } from '@/lib/api/orders';
import { fetchWalletBalance } from '@/lib/api/wallet';
import { fetchPublicPlatformSettings } from '@/lib/api/settings';
import { fileUrlsForOrder } from '@/lib/domain/files';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { formatCurrency, scrollToField, toApiDeliverySpeed, walletCoverableMax } from '@/lib/utils';
import { IconCreditCard, IconAlertCircle } from '@/components/icons';
import { FieldError } from '@/components/ui';
import { DELIVERY_SPEEDS } from '@/lib/domain/stores';

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items } = useAppSelector((state) => state.cart);
  const user = useAppSelector((state) => state.auth.user);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    enabled: !!user
  });

  // Wallet balance powers the partial-wallet split at cart checkout, same
  // rule as the single-order payment step.
  const { data: walletBalance = 0 } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: fetchWalletBalance,
    enabled: !!user
  });
  const [useWallet, setUseWallet] = useState(true);

  // Admin-configured platform fee (+ whether the wallet may cover it). The
  // backend charges it PER ORDER — a cart of N becomes N orders.
  const { data: platformSettings } = useQuery({
    queryKey: ['public-platform-settings'],
    queryFn: fetchPublicPlatformSettings,
    staleTime: 60_000,
  });
  const platformFee = (platformSettings?.platformFee ?? 0) * Math.max(1, items.length);
  const feeFromWallet = platformSettings?.platformFeeFromWallet ?? false;

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [placing, setPlacing] = useState(false);
  /** Id of the section the error belongs to — renders under it + scrolls there. */
  const [errorField, setErrorField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect when the cart is empty. Done in an effect — calling router.replace
  // during render would update a different component (Router) while rendering.
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/stores');
    }
  }, [items.length, router]);

  if (items.length === 0) {
    return null;
  }

  const subtotal = items.reduce((sum, item) => sum + item.costBreakdown.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.costBreakdown.tax, 0);
  const deliveryFee = DELIVERY_SPEEDS.find(s => s.key.toUpperCase() === deliverySpeed)?.cost || 0;
  const total = subtotal + tax + deliveryFee + platformFee;

  // Wallet split for the chosen method — the backend drains the wallet
  // across the cart's orders until the balance or the coverable total runs
  // out (platform fee excluded unless the admin checkbox allows it).
  const methodIsOnline = paymentMethod === 'card' || paymentMethod === 'upi';
  const coverableMax = walletCoverableMax(total, platformFee, feeFromWallet);
  const walletApplied =
    paymentMethod === 'wallet' || (methodIsOnline && useWallet)
      ? Math.min(walletBalance, coverableMax)
      : 0;
  const onlineDue = Math.max(0, total - walletApplied);
  // A pure wallet payment is impossible while a fee exists it may not cover.
  const feeBlocksWallet = platformFee > 0 && !feeFromWallet;

  const handleCheckout = async () => {
    if (!selectedAddressId && deliverySpeed !== 'PICKUP') {
      // Under-field message + scroll to the offending section (site-wide rule).
      setError('Please select a delivery address');
      setErrorField('checkout-address');
      scrollToField('checkout-address');
      return;
    }

    setPlacing(true);
    setError(null);
    setErrorField(null);

    try {
      // Since the backend currently only supports single-service orders,
      // we place multiple orders. In a real production app, we'd update the backend.
      const orderPromises = items.map(item => placeOrder({
        sellerId: item.storeId,
        sellerServiceId: item.serviceId,
        quantity: item.specifications.quantity,
        specifications: item.specifications,
        deliveryAddressId: selectedAddressId,
        deliverySpeed: toApiDeliverySpeed(deliverySpeed),
        paymentMethod: paymentMethod,
        // Partial wallet on online methods — the backend debits each order
        // with a guarded atomic decrement until the balance runs out.
        useWallet: methodIsOnline && useWallet && walletBalance > 0 ? true : undefined,
        specialInstructions: item.specialInstructions,
        // Office files were converted to PDF and stored at attach time;
        // other types keep the pre-existing client-side stub for now.
        fileUrls: fileUrlsForOrder(item.files)
      }));

      const results = await Promise.all(orderPromises);
      
      dispatch(clearCart());
      router.push('/dashboard/orders?checkout=success');
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please try again.');
      setErrorField(null); // API failures stay form-level
      setPlacing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container-page">
          <Breadcrumbs items={[{ label: 'Checkout', active: true }]} />
          
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

          <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
            <div className="space-y-8">
              {/* 1. Review Items */}
              <section className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm">1</span>
                  Review Print Jobs
                </h2>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.serviceName}</h3>
                        <p className="text-sm text-slate-500">{item.storeName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.specifications.quantity}x · {item.specifications.totalPages ? `${item.specifications.totalPages} pages · ` : ''}{item.specifications.paperType} · {item.specifications.size}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(item.costBreakdown.total)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. Delivery */}
              <section className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm">2</span>
                  Delivery Details
                </h2>

                <div className="mb-6">
                  <label className="label">Delivery Speed</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DELIVERY_SPEEDS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setDeliverySpeed(s.key.toUpperCase())}
                        className={`p-4 border rounded-xl text-left transition-all ${
                          deliverySpeed === s.key.toUpperCase() 
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold text-slate-900 text-sm">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                        <p className="text-xs font-semibold text-blue-600 mt-2">{s.cost === 0 ? 'Free' : formatCurrency(s.cost)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {deliverySpeed !== 'PICKUP' && (
                  <div id="checkout-address">
                    <label className="label">Select Address</label>
                    <FieldError message={errorField === 'checkout-address' ? error : null} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 border rounded-xl text-left transition-all ${
                            selectedAddressId === addr.id 
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <p className="font-bold text-slate-900 text-sm">{addr.label}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{addr.fullAddress}</p>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/addresses')}
                        className="p-4 border border-dashed border-slate-300 rounded-xl text-center hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-semibold text-blue-600">+ Add New Address</p>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. Payment */}
              <section className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm">3</span>
                  Payment Method
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['upi', 'card', 'wallet', 'cod'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 border rounded-xl text-left transition-all flex items-center gap-3 ${
                        paymentMethod === method 
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <IconCreditCard className="h-5 w-5 text-slate-400" />
                      <span className="font-bold text-slate-900 uppercase text-sm">{method}</span>
                    </button>
                  ))}
                </div>

                {/* Wallet: guidance for full-wallet (low balance, or the
                    platform fee that must be paid online), or the optional
                    "use your balance first" split on online methods. */}
                {paymentMethod === 'wallet' && (walletBalance < total || feeBlocksWallet) && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-start gap-2 text-sm text-amber-800">
                      <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {feeBlocksWallet ? (
                        <>
                          The platform fee of {formatCurrency(platformFee)} must be paid online.
                          Pick UPI/Card and tick &quot;use wallet balance&quot; — the wallet covers
                          everything except that fee.
                        </>
                      ) : (
                        <>
                          Your wallet has {formatCurrency(walletBalance)} but this order needs{' '}
                          {formatCurrency(total)}. Pick UPI/Card and tick &quot;use wallet balance&quot;
                          to pay part from the wallet, or top up your wallet first.
                        </>
                      )}
                    </p>
                  </div>
                )}
                {methodIsOnline && walletBalance > 0 && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50/60 p-4">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        id="checkout-use-wallet"
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-green-600 focus:ring-2 focus:ring-green-500/30"
                      />
                      <span className="text-slate-700">
                        <span className="font-semibold text-slate-900">
                          Use wallet balance ({formatCurrency(walletBalance)} available)
                        </span>
                        <br />
                        {walletApplied >= total
                          ? 'Your wallet covers this order in full — nothing to pay online.'
                          : `${formatCurrency(walletApplied)} goes from your wallet, ${formatCurrency(onlineDue)} via ${paymentMethod.toUpperCase()}.`}
                      </span>
                    </label>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar Summary */}
            <aside className="space-y-6">
              <div className="card p-6 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Order Summary</h2>
                <div className="space-y-3 text-sm border-b border-slate-100 pb-4 mb-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  {platformFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Platform fee</span>
                      <span>{formatCurrency(platformFee)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 mb-6">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {walletApplied > 0 && (
                  <div className="space-y-2 text-sm mb-6 -mt-4">
                    <div className="flex justify-between text-green-600">
                      <span>From PrinZex Wallet</span>
                      <span className="font-medium">−{formatCurrency(walletApplied)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{paymentMethod === 'wallet' || onlineDue === 0 ? 'Due now' : 'Payable online'}</span>
                      <span>{onlineDue === 0 ? 'Fully covered' : formatCurrency(onlineDue)}</span>
                    </div>
                  </div>
                )}

                {/* Form-level errors only — field-scoped ones render under their section */}
                {error && !errorField && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                    <IconAlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={placing}
                  className="btn-primary w-full py-4 text-base shadow-lg shadow-blue-200"
                >
                  {placing
                    ? 'Processing Order...'
                    : walletApplied > 0 && onlineDue === 0
                      ? 'Place Order — Pay from Wallet'
                      : walletApplied > 0
                        ? `Pay & Place Order · ${formatCurrency(onlineDue)} online`
                        : 'Pay & Place Order'}
                </button>
                <p className="mt-4 text-center text-xs text-slate-400">
                  By placing an order, you agree to our Terms of Service.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
