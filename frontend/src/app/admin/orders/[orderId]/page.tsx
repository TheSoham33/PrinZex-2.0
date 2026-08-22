'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminOrderById, assignDeliveryBoy } from '@/lib/api/admin-orders';
import { fetchDeliveryBoys } from '@/lib/api/admin-delivery';
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
  IconRefreshCw,
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
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => fetchAdminOrderById(orderId),
  });

  const { data: riders = [] } = useQuery({ 
    queryKey: ['admin-delivery'], 
    queryFn: () => fetchDeliveryBoys({ status: 'ACTIVE' }) 
  });

  const [reassignOpen, setReassignOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [resolveFor, setResolveFor] = useState<'customer' | 'seller' | null>(null);

  useEffect(() => {
    if (order) {
      setRefundAmount(String(order.total));
    }
  }, [order]);

  const assignMutation = useMutation({
    mutationFn: (riderId: string) => assignDeliveryBoy(orderId, riderId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      showToast(`Delivery partner assigned successfully`);
      setReassignOpen(false);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

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

  // Logic: any ACTIVE partner can be assigned.
  const assignable = (riders ?? []).filter((r: any) => r.status.toLowerCase() === 'active');

  const riderColumns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'vehicleType', label: 'Vehicle' },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1"><IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(r.averageRating || r.rating || 0).toFixed(1)}</span>
    ) },
    {
      key: 'assign',
      label: 'Action',
      render: (r) => (
        <button
          type="button"
          disabled={assignMutation.isPending}
          onClick={() => assignMutation.mutate(r.id)}
          className="btn-primary text-xs"
        >
          {assignMutation.isPending ? '...' : 'Assign'}
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <IconArrowLeft className="h-4 w-4" /> All orders
        </Link>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-xs"
        >
          <IconRefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

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
          <p className="mt-1 text-sm text-slate-500">{order.serviceName} · {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} size="md" />
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Order summary</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-900">{order.customer?.name || order.customerName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Store</dt><dd className="text-right"><Link href={`/admin/sellers/${order.sellerId}`} className="font-medium text-blue-600 hover:underline">{order.seller?.storeName || order.storeName}</Link></dd></div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-2.5"><dt className="text-slate-500">Total</dt><dd className="text-lg font-bold text-slate-900">{formatCurrency(order.total)}</dd></div>
          </dl>
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {order.deliveryAddress?.fullAddress || order.address}
          </p>
        </section>

        {/* Only show delivery assignment if the order is not in a terminal or pending state */}
        {!['placed', 'cancelled', 'delivered', 'refunded', 'returned'].includes(order.status) && (
          <section className="card flex flex-col p-5">
            <h2 className="text-sm font-bold text-slate-900">Delivery partner</h2>
            {(order.delivery?.deliveryBoy || order.deliveryBoyName) ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <IconTruck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{order.delivery?.deliveryBoy?.name || order.deliveryBoyName}</p>
                  <p className="font-mono text-xs text-slate-400">{order.delivery?.deliveryBoy?.id || order.deliveryBoyId}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <IconAlertCircle className="h-4 w-4 shrink-0" /> No delivery partner assigned yet.
              </p>
            )}
            <button type="button" onClick={() => setReassignOpen(true)} className="btn-secondary mt-4 w-full">
              <IconUser className="h-4 w-4" /> {(order.delivery?.deliveryBoy || order.deliveryBoyName) ? 'Reassign delivery boy' : 'Assign delivery boy'}
            </button>
          </section>
        )}
      </div>

      <section className="card mt-4 p-5">
        <h2 className="mb-5 text-sm font-bold text-slate-900">Status timeline</h2>
        {(!order.timeline || order.timeline.length === 0) ? (
          <p className="text-sm text-slate-500">No events recorded yet.</p>
        ) : (
          <ol className="relative">
            {order.timeline.map((event: any, index: number) => {
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
                    <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{event.label || event.status}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {event.updatedBy ? `Updated by ${event.updatedBy}` : 'Pending'} · {event.timestamp ? formatDateTime(event.timestamp) : 'Pending'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <Modal open={reassignOpen} title="Assign a delivery partner" onClose={() => setReassignOpen(false)}>
        <p className="mb-4 text-sm text-slate-600">
          Showing active, verified partners.
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
    </div>
  );
}
