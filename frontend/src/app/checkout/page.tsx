'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCart, setCartOpen } from '@/store/slices/cartSlice';
import { useQuery } from '@tanstack/react-query';
import { fetchAddresses } from '@/lib/api/customer';
import { placeOrder } from '@/lib/api/orders';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { formatCurrency, toApiDeliverySpeed } from '@/lib/utils';
import { IconMapPin, IconTruck, IconCreditCard, IconAlertCircle, IconCheckCircle } from '@/components/icons';
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

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [placing, setPlacing] = useState(false);
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
  const total = subtotal + tax + deliveryFee;

  const handleCheckout = async () => {
    if (!selectedAddressId && deliverySpeed !== 'PICKUP') {
      setError('Please select a delivery address');
      return;
    }

    setPlacing(true);
    setError(null);

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
        specialInstructions: item.specialInstructions,
        fileUrl: "/uploads/designs/demo.pdf" // In real app, would use the actual uploaded URL
      }));

      const results = await Promise.all(orderPromises);
      
      dispatch(clearCart());
      router.push('/dashboard/orders?checkout=success');
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please try again.');
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
                  <div>
                    <label className="label">Select Address</label>
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
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 mb-6">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {error && (
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
                  {placing ? 'Processing Order...' : `Pay & Place Order`}
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
