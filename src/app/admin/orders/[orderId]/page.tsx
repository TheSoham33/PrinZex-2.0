'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminOrderById } from '@/lib/api/admin-orders';
import { fetchDeliveryBoys } from '@/lib/api/admin-delivery';
import type { AdminOrder } from '@/lib/mock-data/admin-orders';
import type { DeliveryBoy } from '@/lib/mock-data/admin-delivery';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Modal from '@/components/seller-dashboard/Modal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconCheckCircle,
  IconFileText,
  IconMapPin,
  IconPhone,
  IconStar,
  IconTruck,
  IconUser,
  IconZap,
} from '@/components/icons';

const ACTOR_LABEL = {
  customer: 'Customer',
  seller: 'Seller',
  delivery: 'Delivery',
  system: 'System',
} as const;

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { showToast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => fetchAdminOrderById(orderId),
  });
  const { data: riders } = useQuery({ queryKey: ['admin-delivery'], queryFn: fetchDeliveryBoys });

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [resolveFor, setResolveFor] = useState<'customer' | 'seller' | null>(null);

  useEffect(() => {
    if (data) {
      setOrder(data);
      setRefundAmount(String(data.total));
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="card h-64 animate-pulse bg-slate-100" />
        <div className="card h-72 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Order not found</h1>
          <p className="mt-1 text-sm text-slate-600">
            No order matches <span className="font-mono">{orderId}</span>.
          </p>
          <Link href="/admin/orders" className="btn-primary mt-6">
            <IconArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>
      </div>
    );
  }

  // Only verified, active partners in the order's city can be assigned.
  const available = (riders ?? []).filter(
    (r) => r.status === 'active' && r.verified && order.address.toLowerCase().includes(r.city.toLowerCase().slice(0, 4)),
  );
  const assignable = available.length > 0 ? available : (riders ?? []).filter((r) => r.status === 'active' && r.verified);

  const riderColumns: DataTableColumn<DeliveryBoy>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'vehicleType', label: 'Vehicle' },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1"><IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating.toFixed(1)}</span>
    ) },
    {
      key: 'assign',
      label: 'Action',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setOrder((prev) => (prev ? { ...prev, deliveryBoyId: r.id, deliveryBoyName: r.name } : prev));
            showToast(`${r.name} assigned to ${order.id}`);
            setReassignOpen(false);
          }}
          className="btn-primary text-xs"
        >
          Assign
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <IconArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">{order.id}</h1>
            {order.isRush && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <IconZap className="h-3 w-3" /> Rush
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{order.serviceName} · {formatDateTime(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} size="md" />
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Order summary</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-900">{order.customerName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Store</dt><dd className="text-right"><Link href={`/admin/sellers/${order.storeId}`} className="font-medium text-blue-600 hover:underline">{order.storeName}</Link></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Quantity</dt><dd className="font-medium text-slate-900">{order.quantity}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Delivery</dt><dd className="font-medium text-slate-900">{order.deliverySpeed}</dd></div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-2.5"><dt className="text-slate-500">Total</dt><dd className="text-lg font-bold text-slate-900">{formatCurrency(order.total)}</dd></div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{order.specifications}</p>
          <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-slate-50 p-3">
            <IconFileText className="h-4.5 w-4.5 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-700">{order.fileName}</span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {order.address}
          </p>
        </section>

        <section className="card flex flex-col p-5">
          <h2 className="text-sm font-bold text-slate-900">Delivery partner</h2>
          {order.deliveryBoyName ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <IconTruck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{order.deliveryBoyName}</p>
                <p className="font-mono text-xs text-slate-400">{order.deliveryBoyId}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                  <IconPhone className="h-3 w-3" /> Contactable in app
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <IconAlertCircle className="h-4 w-4 shrink-0" /> No delivery partner assigned yet.
            </p>
          )}
          <button type="button" onClick={() => setReassignOpen(true)} className="btn-secondary mt-4 w-full">
            <IconUser className="h-4 w-4" /> {order.deliveryBoyName ? 'Reassign delivery boy' : 'Assign delivery boy'}
          </button>
        </section>
      </div>

      {order.dispute && (
        <section className="card mt-4 border-l-4 border-l-red-500 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <IconAlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Dispute — {order.dispute.reason}</h2>
                <StatusBadge status={order.dispute.resolution === 'unresolved' ? 'open' : 'resolved'} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Raised by {order.dispute.raisedBy} · {formatDateTime(order.dispute.raisedAt)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{order.dispute.detail}</p>

              {order.dispute.resolution === 'unresolved' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setResolveFor('customer')} className="btn-secondary text-xs">
                    Resolve in favour of customer
                  </button>
                  <button type="button" onClick={() => setResolveFor('seller')} className="btn-secondary text-xs">
                    Resolve in favour of seller
                  </button>
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <IconCheckCircle className="h-4 w-4" /> Resolved in favour of the {order.dispute.resolution}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="card mt-4 p-5">
        <h2 className="text-sm font-bold text-slate-900">Refund</h2>
        {order.refunded ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
            <IconCheckCircle className="h-4 w-4" /> {formatCurrency(order.refundAmount)} refunded
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">No refund has been issued for this order.</p>
            <button type="button" onClick={() => setRefundOpen(true)} className="btn-secondary text-sm">
              Issue refund
            </button>
          </div>
        )}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="mb-5 text-sm font-bold text-slate-900">Status timeline</h2>
        <ol className="relative">
          {order.timeline.map((event, index) => {
            const done = Boolean(event.timestamp);
            const last = index === order.timeline.length - 1;
            return (
              <li key={index} className="relative flex gap-4 pb-5 last:pb-0">
                {!last && (
                  <span className={`absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5 ${done ? 'bg-blue-500' : 'bg-slate-200'}`} aria-hidden />
                )}
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${done ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {done ? <IconCheckCircle className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{event.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ACTOR_LABEL[event.actor]} · {event.timestamp ? formatDateTime(event.timestamp) : 'Pending'}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Modal open={reassignOpen} title="Assign a delivery partner" onClose={() => setReassignOpen(false)}>
        <p className="mb-4 text-sm text-slate-600">
          Showing active, verified partners{available.length > 0 ? ' near this address' : ''}.
        </p>
        <DataTable
          data={assignable}
          columns={riderColumns}
          searchable
          searchPlaceholder="Search partners"
          caption="Available delivery partners"
          emptyMessage="No available partners."
        />
      </Modal>

      <ConfirmModal
        open={refundOpen}
        title="Issue refund"
        message={`Refund the customer for order ${order.id}. Adjust the amount for a partial refund.`}
        confirmLabel="Issue refund"
        onCancel={() => setRefundOpen(false)}
        onConfirm={() => {
          const amount = Number(refundAmount);
          if (Number.isFinite(amount) && amount > 0) {
            setOrder((prev) => (prev ? { ...prev, refunded: true, refundAmount: amount, status: 'refunded' } : prev));
            showToast(`${formatCurrency(amount)} refunded`);
          }
          setRefundOpen(false);
        }}
      >
        <div>
          <label htmlFor="detail-refund" className="label">Refund amount (₹)</label>
          <input id="detail-refund" type="number" min={1} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="input" />
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={resolveFor !== null}
        title={`Resolve in favour of the ${resolveFor ?? ''}?`}
        message={
          resolveFor === 'customer'
            ? 'The customer will be refunded and the seller notified of the outcome.'
            : 'The seller keeps the payment and the customer will be notified of the outcome.'
        }
        confirmLabel="Confirm resolution"
        onCancel={() => setResolveFor(null)}
        onConfirm={() => {
          setOrder((prev) =>
            prev && prev.dispute
              ? { ...prev, dispute: { ...prev.dispute, resolution: resolveFor ?? 'unresolved' } }
              : prev,
          );
          showToast(`Dispute resolved in favour of the ${resolveFor}`);
          setResolveFor(null);
        }}
      />
    </div>
  );
}
