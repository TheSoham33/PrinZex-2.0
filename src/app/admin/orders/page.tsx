'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminOrders } from '@/lib/api/admin-orders';
import type { AdminOrder } from '@/lib/mock-data/admin-orders';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IconZap } from '@/components/icons';

const STATUSES: AdminOrder['status'][] = [
  'placed', 'accepted', 'processing', 'dispatched', 'delivered', 'cancelled', 'refunded',
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: fetchAdminOrders,
  });

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [rushOnly, setRushOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  useEffect(() => {
    if (data) setOrders(data);
  }, [data]);

  const stores = useMemo(
    () => Array.from(new Set(orders.map((o) => o.storeName))).sort(),
    [orders],
  );

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(o.status)) return false;
        if (storeFilter !== 'all' && o.storeName !== storeFilter) return false;
        if (rushOnly && !o.isRush) return false;
        if (fromDate && o.placedAt.slice(0, 10) < fromDate) return false;
        return true;
      }),
    [orders, selectedStatuses, storeFilter, rushOnly, fromDate],
  );

  const columns: DataTableColumn<AdminOrder>[] = [
    { key: 'id', label: 'Order ID', sortable: true, render: (r) => (
      <div className="flex items-center gap-1.5">
        <Link href={`/admin/orders/${r.id}`} className="font-mono font-medium text-blue-600 hover:underline">
          {r.id}
        </Link>
        {r.isRush && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            <IconZap className="h-2.5 w-2.5" /> Rush
          </span>
        )}
      </div>
    ) },
    { key: 'customerName', label: 'Customer', sortable: true },
    { key: 'storeName', label: 'Store', sortable: true },
    { key: 'serviceName', label: 'Service' },
    { key: 'total', label: 'Total', sortable: true, render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'placedAt', label: 'Placed at', sortable: true, render: (r) => formatDateTime(r.placedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => router.push(`/admin/orders/${r.id}`)} className="btn-secondary text-xs">
            View
          </button>
          {!['cancelled', 'delivered', 'refunded'].includes(r.status) && (
            <button type="button" onClick={() => setCancelTarget(r)} className="btn-secondary text-xs text-red-600">
              Cancel
            </button>
          )}
          {!r.refunded && (
            <button
              type="button"
              onClick={() => { setRefundTarget(r); setRefundAmount(String(r.total)); }}
              className="btn-secondary text-xs"
            >
              Refund
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-600">{orders.length} orders across the platform.</p>
      </header>

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search order, customer or store"
        caption="All platform orders"
        pagination={{ pageSize: 8 }}
        emptyMessage="No orders match these filters."
        filters={
          <>
            <fieldset>
              <legend className="label text-xs">Status</legend>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => {
                  const on = selectedStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelectedStatuses((prev) =>
                          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                        )
                      }
                      className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                        on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="store-filter" className="label text-xs">Store</label>
              <select id="store-filter" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All stores</option>
                {stores.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="order-from" className="label text-xs">Placed from</label>
              <input id="order-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input py-2 text-sm" />
            </div>

            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rushOnly}
                onChange={(e) => setRushOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              Rush orders only
            </label>
          </>
        }
      />

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Cancel this order?"
        message={`Order ${cancelTarget?.id ?? ''} will be cancelled and the customer notified. This cannot be undone.`}
        confirmLabel="Cancel order"
        destructive
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            setOrders((prev) => prev.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o)));
            showToast(`${cancelTarget.id} cancelled`);
          }
          setCancelTarget(null);
        }}
      />

      <ConfirmModal
        open={Boolean(refundTarget)}
        title="Process refund"
        message={`Issue a refund for order ${refundTarget?.id ?? ''}. The amount is editable if a partial refund was agreed.`}
        confirmLabel="Issue refund"
        onCancel={() => setRefundTarget(null)}
        onConfirm={() => {
          const amount = Number(refundAmount);
          if (refundTarget && Number.isFinite(amount) && amount > 0) {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === refundTarget.id
                  ? { ...o, refunded: true, refundAmount: amount, status: 'refunded' }
                  : o,
              ),
            );
            showToast(`${formatCurrency(amount)} refunded for ${refundTarget.id}`);
          }
          setRefundTarget(null);
        }}
      >
        <div>
          <label htmlFor="refund-amount" className="label">Refund amount (₹)</label>
          <input
            id="refund-amount"
            type="number"
            min={1}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            className="input"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
