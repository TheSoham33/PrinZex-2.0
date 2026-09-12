import Link from 'next/link';
import { useState } from 'react';
import type { DashboardOrder } from '@/lib/domain/orders';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import OrderStatusBadge from './OrderStatusBadge';
import ReviewModal from './ReviewModal';
import { IconChevronRight, IconMapPin, IconStore, IconTruck, IconStar } from '@/components/icons';

export default function OrderCard({ order }: { order: DashboardOrder }) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const trackable = order.status === 'out_for_delivery';
  // Allow reviews as soon as order is placed (uploaded)
  const canReview = !['cancelled', 'returned'].includes(order.status);

  return (
    <div className="card p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <IconStore className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{order.serviceName}</p>
            <p className="mt-0.5 text-sm text-slate-500">{order.storeName}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">{order.id}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Quantity</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{order.quantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatCurrency(order.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Placed</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(order.placedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">
            {order.status === 'delivered' ? 'Delivered' : 'Expected'}
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {formatDateTime(order.estimatedDelivery)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link href={`/dashboard/orders/${order.id}`} className="btn-secondary text-xs">
          View details <IconChevronRight className="h-3.5 w-3.5" />
        </Link>
        {trackable && (
          <Link href={`/dashboard/tracking/${order.id}`} className="btn-primary text-xs">
            <IconTruck className="h-3.5 w-3.5" /> Track live
          </Link>
        )}
        {order.status === 'ready_for_pickup' && (
          <span className="btn text-xs text-purple-700">
            <IconMapPin className="h-3.5 w-3.5" /> Ready at store
          </span>
        )}
        {canReview && (
          <button 
            type="button" 
            onClick={() => setReviewModalOpen(true)}
            className="btn-secondary text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <IconStar className="h-3.5 w-3.5" /> Rate & Review
          </button>
        )}
      </div>

      <ReviewModal 
        orderId={order.id} 
        storeName={order.storeName} 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
      />
    </div>
  );
}
