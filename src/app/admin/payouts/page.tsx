'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryPayouts, fetchSellerPayouts } from '@/lib/api/admin-payouts';
import {
  type DeliveryPayout,
  type PayoutBreakdownRow,
  type SellerPayout,
} from '@/lib/types/admin-payouts';

/** The next payout run is scheduled for the next Monday. */
const NEXT_SCHEDULED_PAYOUT = (() => {
  const date = new Date();
  const day = date.getDay();
  const daysToMonday = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + daysToMonday);
  return date.toISOString().slice(0, 10);
})();
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IconCheckCircle, IconWallet } from '@/components/icons';

type Tab = 'Seller payouts' | 'Delivery boy payouts';

interface BreakdownView {
  title: string;
  rows: PayoutBreakdownRow[];
}

export default function AdminPayoutsPage() {
  const { showToast } = useToast();
  const sellerQuery = useQuery({ queryKey: ['admin-seller-payouts'], queryFn: fetchSellerPayouts });
  const deliveryQuery = useQuery({ queryKey: ['admin-delivery-payouts'], queryFn: fetchDeliveryPayouts });

  const [tab, setTab] = useState<Tab>('Seller payouts');
  const [sellerRows, setSellerRows] = useState<SellerPayout[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<DeliveryPayout[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState<'all' | 'selected' | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownView | null>(null);

  useEffect(() => {
    if (sellerQuery.data) setSellerRows(sellerQuery.data);
  }, [sellerQuery.data]);
  useEffect(() => {
    if (deliveryQuery.data) setDeliveryRows(deliveryQuery.data);
  }, [deliveryQuery.data]);

  // Selection is per-tab, so reset it when switching.
  useEffect(() => setSelected([]), [tab]);

  const isSellerTab = tab === 'Seller payouts';
  const allRows: (SellerPayout | DeliveryPayout)[] = isSellerTab ? sellerRows : deliveryRows;

  const summary = useMemo(() => {
    const pending = allRows.filter((r) => r.status === 'pending');
    return {
      total: pending.reduce((sum, r) => sum + r.amount, 0),
      count: pending.length,
    };
  }, [allRows]);

  const advance = (ids: string[], to: 'processing' | 'paid') => {
    if (isSellerTab) {
      setSellerRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status: to } : r)));
    } else {
      setDeliveryRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status: to } : r)));
    }
  };

  const actionCell = (row: SellerPayout | DeliveryPayout, name: string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.status === 'pending' && (
        <button type="button" onClick={() => { advance([row.id], 'processing'); showToast(`${row.id} approved`); }} className="btn-secondary text-xs text-green-700">
          <IconCheckCircle className="h-3.5 w-3.5" /> Approve
        </button>
      )}
      {row.status === 'processing' && (
        <button type="button" onClick={() => { advance([row.id], 'paid'); showToast(`${row.id} marked as paid`); }} className="btn-secondary text-xs">
          Mark as paid
        </button>
      )}
      <button type="button" onClick={() => setBreakdown({ title: `${row.id} · ${name}`, rows: row.breakdown })} className="btn-secondary text-xs">
        Breakdown
      </button>
    </div>
  );

  const sellerColumns: DataTableColumn<SellerPayout>[] = [
    { key: 'id', label: 'Payout ID', sortable: true, render: (r) => (
      <div><p className="font-mono font-medium text-slate-900">{r.id}</p><p className="font-mono text-xs text-slate-400">{r.bankAccount}</p></div>
    ) },
    { key: 'storeName', label: 'Store', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (r) => <span className="font-bold">{formatCurrency(r.amount)}</span> },
    { key: 'ordersIncluded', label: 'Orders', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'requestedAt', label: 'Requested', sortable: true, render: (r) => formatDate(r.requestedAt) },
    { key: 'actions', label: 'Actions', render: (r) => actionCell(r, r.storeName) },
  ];

  const deliveryColumns: DataTableColumn<DeliveryPayout>[] = [
    { key: 'id', label: 'Payout ID', sortable: true, render: (r) => (
      <div><p className="font-mono font-medium text-slate-900">{r.id}</p><p className="font-mono text-xs text-slate-400">{r.bankAccount}</p></div>
    ) },
    { key: 'name', label: 'Partner', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (r) => <span className="font-bold">{formatCurrency(r.amount)}</span> },
    { key: 'deliveriesIncluded', label: 'Deliveries', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', label: 'Date', sortable: true, render: (r) => formatDate(r.date) },
    { key: 'actions', label: 'Actions', render: (r) => actionCell(r, r.name) },
  ];

  const bulkBar = (
    <button type="button" onClick={() => setBulkConfirm('selected')} className="btn-primary text-xs">
      <IconCheckCircle className="h-3.5 w-3.5" /> Bulk approve selected
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payouts</h1>
          <p className="mt-1 text-sm text-slate-600">Approve and settle seller and partner earnings.</p>
        </div>
        {summary.count > 0 && (
          <button type="button" onClick={() => setBulkConfirm('all')} className="btn-primary">
            Process all pending ({summary.count})
          </button>
        )}
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><IconWallet className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-500">Total pending</p><p className="text-xl font-bold text-slate-900">{formatCurrency(summary.total)}</p></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><IconCheckCircle className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-500">Pending requests</p><p className="text-xl font-bold text-slate-900">{summary.count}</p></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><IconWallet className="h-5 w-5" /></span>
          <div><p className="text-xs text-slate-500">Next scheduled</p><p className="text-xl font-bold text-slate-900">{formatDate(NEXT_SCHEDULED_PAYOUT)}</p></div>
        </div>
      </div>

      <div role="tablist" aria-label="Payout type" className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['Seller payouts', 'Delivery boy payouts'] as Tab[]).map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {isSellerTab ? (
        <DataTable
          data={sellerRows}
          columns={sellerColumns}
          isLoading={sellerQuery.isLoading}
          error={sellerQuery.error as Error | null}
          onRetry={() => sellerQuery.refetch()}
          searchable
          searchPlaceholder="Search payout or store"
          caption="Seller payout queue"
          pagination={{ pageSize: 8 }}
          selectable
          rowId={(r) => r.id}
          selectedIds={selected}
          onSelectionChange={setSelected}
          bulkBar={bulkBar}
        />
      ) : (
        <DataTable
          data={deliveryRows}
          columns={deliveryColumns}
          isLoading={deliveryQuery.isLoading}
          error={deliveryQuery.error as Error | null}
          onRetry={() => deliveryQuery.refetch()}
          searchable
          searchPlaceholder="Search payout or partner"
          caption="Delivery partner payout queue"
          pagination={{ pageSize: 8 }}
          selectable
          rowId={(r) => r.id}
          selectedIds={selected}
          onSelectionChange={setSelected}
          bulkBar={bulkBar}
        />
      )}

      <ConfirmModal
        open={bulkConfirm !== null}
        title={
          bulkConfirm === 'all'
            ? `Approve ${summary.count} pending payouts?`
            : `Approve ${selected.filter((id) => allRows.find((r) => r.id === id)?.status === 'pending').length} selected payouts?`
        }
        message="Approved payouts move to processing and are queued for the next bank settlement run."
        confirmLabel="Approve payouts"
        onCancel={() => setBulkConfirm(null)}
        onConfirm={() => {
          const ids =
            bulkConfirm === 'all'
              ? allRows.filter((r) => r.status === 'pending').map((r) => r.id)
              : selected.filter((id) => allRows.find((r) => r.id === id)?.status === 'pending');
          advance(ids, 'processing');
          showToast(`${ids.length} payout${ids.length === 1 ? '' : 's'} approved`);
          setSelected([]);
          setBulkConfirm(null);
        }}
      />

      <UserDetailDrawer
        open={Boolean(breakdown)}
        onClose={() => setBreakdown(null)}
        title="Payout breakdown"
        subtitle={breakdown?.title}
        ariaLabel="Per-order commission breakdown for this payout"
      >
        {breakdown && (
          <div>
            {breakdown.rows.length === 0 ? (
              <p className="text-sm text-slate-500">No line items recorded for this payout.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Per-order commission breakdown</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2">Order</th>
                    <th scope="col" className="py-2 text-right">Total</th>
                    <th scope="col" className="py-2 text-right">Commission</th>
                    <th scope="col" className="py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.rows.map((row) => (
                    <tr key={row.orderId} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="py-2.5 font-mono font-normal text-slate-700">{row.orderId}</th>
                      <td className="py-2.5 text-right text-slate-600">{formatCurrency(row.orderTotal)}</td>
                      <td className="py-2.5 text-right text-red-600">−{formatCurrency(row.commission)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}
