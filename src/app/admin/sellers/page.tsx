'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminSellers } from '@/lib/api/admin-sellers';
import type { AdminSeller } from '@/lib/mock-data/admin-sellers';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IconAlertCircle, IconCheckCircle, IconStar } from '@/components/icons';

function SellersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sellers'],
    queryFn: fetchAdminSellers,
  });

  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [approveTarget, setApproveTarget] = useState<AdminSeller | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminSeller | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [commissionFor, setCommissionFor] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState('');

  useEffect(() => {
    if (data) setSellers(data);
  }, [data]);

  const filtered = useMemo(
    () => sellers.filter((s) => statusFilter === 'all' || s.status === statusFilter),
    [sellers, statusFilter],
  );

  const setStatus = (id: string, status: AdminSeller['status'], message: string) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    showToast(message);
  };

  const saveCommission = (id: string) => {
    const rate = Number(commissionDraft);
    if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
      setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, commissionRate: rate } : s)));
      showToast('Commission updated');
    }
    setCommissionFor(null);
  };

  const columns: DataTableColumn<AdminSeller>[] = [
    { key: 'storeName', label: 'Store', sortable: true, render: (r) => (
      <div className="min-w-0">
        <Link href={`/admin/sellers/${r.id}`} className="font-medium text-blue-600 hover:underline">
          {r.storeName}
        </Link>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'ownerName', label: 'Owner', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'servicesCount', label: 'Services', sortable: true },
    { key: 'totalOrders', label: 'Orders', sortable: true },
    { key: 'totalRevenue', label: 'Revenue', sortable: true, render: (r) => formatCurrency(r.totalRevenue) },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => r.rating > 0 ? (
      <span className="inline-flex items-center gap-1 font-medium text-slate-900">
        <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}
      </span>
    ) : <span className="text-slate-400">—</span> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'joinedAt', label: 'Joined', sortable: true, render: (r) => formatDate(r.joinedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => router.push(`/admin/sellers/${r.id}`)} className="btn-secondary text-xs">
            View
          </button>
          {r.status === 'pending' && (
            <button type="button" onClick={() => setApproveTarget(r)} className="btn-secondary text-xs text-green-700">
              <IconCheckCircle className="h-3.5 w-3.5" /> Approve
            </button>
          )}
          {r.status !== 'suspended' && (
            <button type="button" onClick={() => { setSuspendTarget(r); setSuspendReason(''); }} className="btn-secondary text-xs text-red-600">
              Suspend
            </button>
          )}
          {commissionFor === r.id ? (
            <span className="inline-flex items-center gap-1.5">
              <label htmlFor={`comm-${r.id}`} className="sr-only">Commission % for {r.storeName}</label>
              <input
                id={`comm-${r.id}`}
                type="number"
                min={0}
                max={100}
                autoFocus
                value={commissionDraft}
                onChange={(e) => setCommissionDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCommission(r.id);
                  if (e.key === 'Escape') setCommissionFor(null);
                }}
                className="input w-16 py-1 text-xs"
              />
              <button type="button" onClick={() => saveCommission(r.id)} className="btn-primary text-xs">Save</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setCommissionFor(r.id); setCommissionDraft(String(r.commissionRate)); }}
              className="btn-secondary text-xs"
            >
              {r.commissionRate}%
            </button>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = sellers.filter((s) => s.status === 'pending').length;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sellers</h1>
        <p className="mt-1 text-sm text-slate-600">
          {sellers.length} print shops · {pendingCount} awaiting review.
        </p>
      </header>

      {pendingCount > 0 && statusFilter !== 'pending' && (
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
        >
          <IconAlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">
            {pendingCount} seller {pendingCount === 1 ? 'application needs' : 'applications need'} review — tap to filter
          </span>
        </button>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search store or owner"
        caption="Registered print shops on the platform"
        pagination={{ pageSize: 8 }}
        emptyMessage="No sellers match these filters."
        filters={
          <div>
            <label htmlFor="seller-status" className="label text-xs">Status</label>
            <select id="seller-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        }
      />

      <ConfirmModal
        open={Boolean(approveTarget)}
        title="Approve this store?"
        message={`${approveTarget?.storeName ?? ''} will go live and can start receiving orders immediately.`}
        confirmLabel="Approve store"
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (approveTarget) setStatus(approveTarget.id, 'approved', `${approveTarget.storeName} approved`);
          setApproveTarget(null);
        }}
      />

      <ConfirmModal
        open={Boolean(suspendTarget)}
        title="Suspend this store?"
        message={`${suspendTarget?.storeName ?? ''} will be hidden from customers and cannot accept new orders.`}
        confirmLabel="Suspend store"
        destructive
        confirmDisabled={!suspendReason.trim()}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) setStatus(suspendTarget.id, 'suspended', `${suspendTarget.storeName} suspended`);
          setSuspendTarget(null);
        }}
      >
        <div>
          <label htmlFor="suspend-reason" className="label">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="suspend-reason"
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Why is this store being suspended?"
            className="input resize-none"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}

export default function AdminSellersPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse bg-slate-100" />}>
      <SellersInner />
    </Suspense>
  );
}
