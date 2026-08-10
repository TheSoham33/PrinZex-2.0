'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminOrders } from '@/lib/api/admin-orders';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IconZap, IconRefreshCw } from '@/components/icons';

const STATUSES = [
  'placed', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'refunded',
];

function OrdersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [rushOnly, setRushOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');

  const { data: orders = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-orders', selectedStatuses, storeFilter, rushOnly, fromDate],
    queryFn: () => fetchAdminOrders({ 
      status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
      isRush: rushOnly || undefined,
    }),
  });

  const stores = useMemo(() => {
    const names = orders.map((o: any) => o.sellerName).filter(Boolean);
    return Array.from(new Set(names)).sort() as string[];
  }, [orders]);

  // Frontend filter for things the backend might not handle yet or for more granular control
  const filtered = useMemo(() => {
    return orders.filter((o: any) => {
      if (selectedStatuses.length > 1 && !selectedStatuses.includes(o.status)) return false;
      if (storeFilter !== 'all' && o.sellerName !== storeFilter) return false;
      if (fromDate && o.createdAt.slice(0, 10) < fromDate) return false;
      return true;
    });
  }, [orders, selectedStatuses, storeFilter, fromDate]);

  const columns: DataTableColumn<any>[] = [
    { key: 'id', label: 'Order ID', sortable: true, render: (r) => (
      <div className="flex items-center gap-1.5">
        <Link href={`/admin/orders/${r.id}`} className="font-mono font-medium text-blue-600 hover:underline text-xs">
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
    { key: 'sellerName', label: 'Store', sortable: true },
    { key: 'serviceName', label: 'Service' },
    { key: 'total', label: 'Total', sortable: true, render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Placed', sortable: true, render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => router.push(`/admin/orders/${r.id}`)} className="btn-secondary text-xs">
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">{orders.length} orders across the platform.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-sm"
        >
          <IconRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
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
        pagination={{ pageSize: 10 }}
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
                {stores.map((s) => <option key={s || 'none'} value={s || ''}>{s || 'Unknown'}</option>)}
              </select>
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
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse bg-slate-100" />}>
      <OrdersInner />
    </Suspense>
  );
}
