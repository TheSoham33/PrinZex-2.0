'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/mock-data/stores';
import { DELIVERY_SPEEDS } from '@/lib/mock-data/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import ReviewModal from '@/components/dashboard/ReviewModal';
import {
  IconArrowRight,
  IconCheckCircle,
  IconCopy,
  IconMapPin,
  IconPackage,
  IconStore,
  IconTruck,
  IconStar,
} from '@/components/icons';

export default function ConfirmationView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(orderId);
      if (raw) setOrder(JSON.parse(raw) as Order);
    } catch {
      /* ignore malformed draft */
    }
    setLoading(false);
  }, [orderId]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const speedLabel = order
    ? DELIVERY_SPEEDS.find((option) => option.key === order.deliverySpeed)?.label
    : null;

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white ring-4 ring-white/20">
              <IconCheckCircle className="h-9 w-9" />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Order confirmed!</h1>
            <p className="mt-2 max-w-md text-sm text-green-50">
              We&apos;ve sent your files to the shop. You&apos;ll get a notification as soon as they
              start printing.
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Order ID</p>
                <p className="font-mono text-lg font-bold text-slate-900">{orderId}</p>
              </div>
              <button
                type="button"
                onClick={copyId}
                className="btn-secondary text-xs"
                aria-label="Copy order ID"
              >
                <IconCopy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {order ? (
              <dl className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <IconStore className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Print shop</dt>
                    <dd className="font-medium text-slate-900">{order.storeName}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IconTruck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Delivery</dt>
                    <dd className="font-medium text-slate-900">
                      {speedLabel} · by {formatDate(order.estimatedDeliveryDate)}
                    </dd>
                  </div>
                </div>

                {order.address && (
                  <div className="flex items-start gap-3">
                    <IconMapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-500">Deliver to</dt>
                      <dd className="font-medium text-slate-900">{order.address.label}</dd>
                      <dd className="mt-0.5 text-sm text-slate-600">{order.address.fullAddress}</dd>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <IconPackage className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Job details</dt>
                    <dd className="font-medium text-slate-900">
                      {order.specifications.quantity} ×{' '}
                      {order.specifications.size || 'custom size'},{' '}
                      {order.specifications.colorOption === 'color'
                        ? 'colour'
                        : order.specifications.colorOption === 'mixed'
                          ? 'B&W + colour pages'
                          : 'B&W'}
                      {order.specifications.paperType ? `, ${order.specifications.paperType}` : ''}
                    </dd>
                    {order.file && (
                      <dd className="mt-0.5 truncate text-sm text-slate-600">{order.file.name}</dd>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-slate-200 pt-4">
                  <dt className="font-semibold text-slate-900">Total paid</dt>
                  <dd className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(order.costBreakdown.total)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                We couldn&apos;t load the full details for this order in this browser session, but
                it was placed successfully. Open it from your dashboard to see everything.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/orders" className="btn-primary flex-1">
                Track my order <IconArrowRight className="h-4 w-4" />
              </Link>
              <button 
                type="button" 
                onClick={() => setReviewModalOpen(true)}
                className="btn-secondary flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <IconStar className="h-4 w-4" /> Rate experience
              </button>
            </div>
          </div>
        </div>
      </div>

      {order && (
        <ReviewModal 
          orderId={orderId} 
          storeName={order.storeName} 
          isOpen={reviewModalOpen} 
          onClose={() => setReviewModalOpen(false)} 
        />
      )}
    </div>
  );
}
