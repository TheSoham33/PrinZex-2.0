'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminSellers, 
  approveSeller, 
  suspendSeller, 
  updateSellerCommission 
} from '@/lib/api/admin-sellers';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IconAlertCircle, IconCheckCircle, IconStar, IconRefreshCw } from '@/components/icons';

function SellersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [commissionFor, setCommissionFor] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState('');

  const { data: sellers = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-sellers', statusFilter],
    queryFn: () => fetchAdminSellers({ status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase() }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      showToast('Store approved successfully');
      setApproveTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => suspendSeller(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      showToast('Store suspended');
      setSuspendTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const commissionMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) => updateSellerCommission(id, rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      showToast('Commission updated');
      setCommissionFor(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleSaveCommission = (id: string) => {
    const rate = Number(commissionDraft);
    if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
      commissionMutation.mutate({ id, rate: rate / 100 }); // API expects 0.12 for 12%
    } else {
      showToast('Enter a valid percentage (0-100)', 'error');
    }
  };

  const handleCloseApproveModal = useCallback(() => setApproveTarget(null), []);
  const handleConfirmApprove = useCallback(() => {
    if (approveTarget) approveMutation.mutate(approveTarget.id);
  }, [approveTarget, approveMutation]);

  const handleCloseSuspendModal = useCallback(() => {
    setSuspendTarget(null);
    setSuspendReason('');
  }, []);

  const handleConfirmSuspend = useCallback(() => {
    if (suspendTarget) suspendMutation.mutate({ id: suspendTarget.id, reason: suspendReason });
  }, [suspendTarget, suspendReason, suspendMutation]);

  const columns: DataTableColumn<any>[] = [
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
    { key: 'totalOrders', label: 'Orders', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => r.rating > 0 ? (
      <span className="inline-flex items-center gap-1 font-medium text-slate-900">
        <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(r.rating).toFixed(1)}
      </span>
    ) : <span className="text-slate-400">—</span> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
    { key: 'createdAt', label: 'Joined', sortable: true, render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => router.push(`/admin/sellers/${r.id}`)} className="btn-secondary text-xs">
            View
          </button>
          {r.status.toLowerCase() === 'pending' && (
            <button 
              type="button" 
              onClick={() => setApproveTarget(r)} 
              disabled={approveMutation.isPending}
              className="btn-secondary text-xs text-green-700"
            >
              <IconCheckCircle className="h-3.5 w-3.5" /> {approveMutation.isPending ? '...' : 'Approve'}
            </button>
          )}
          {r.status.toLowerCase() !== 'suspended' && (
            <button 
              type="button" 
              onClick={() => { setSuspendTarget(r); setSuspendReason(''); }} 
              className="btn-secondary text-xs text-red-600"
            >
              Suspend
            </button>
          )}
          {commissionFor === r.id ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                autoFocus
                value={commissionDraft}
                onChange={(e) => setCommissionDraft(e.target.value)}
                className="input w-16 py-1 text-xs"
              />
              <button 
                type="button" 
                onClick={() => handleSaveCommission(r.id)} 
                disabled={commissionMutation.isPending}
                className="btn-primary text-xs"
              >
                {commissionMutation.isPending ? '...' : 'Save'}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setCommissionFor(r.id); setCommissionDraft(String(Number(r.commissionRate || 0.12) * 100)); }}
              className="btn-secondary text-xs"
            >
              {Math.round(Number(r.commissionRate || 0.12) * 100)}%
            </button>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = sellers.filter((s: any) => s.status.toLowerCase() === 'pending').length;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sellers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {sellers.length} print shops · {pendingCount} awaiting review.
          </p>
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
        data={sellers}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search store or owner"
        caption="Registered print shops on the platform"
        pagination={{ pageSize: 10 }}
        emptyMessage="No sellers match these filters."
        filters={
          <div>
            <label htmlFor="seller-status" className="label text-xs">Status</label>
            <select 
              id="seller-status" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="input py-2 text-sm"
            >
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
        onCancel={handleCloseApproveModal}
        onConfirm={handleConfirmApprove}
        loading={approveMutation.isPending}
      />

      <ConfirmModal
        open={Boolean(suspendTarget)}
        title="Suspend this store?"
        message={`${suspendTarget?.storeName ?? ''} will be hidden from customers and cannot accept new orders.`}
        confirmLabel="Suspend store"
        destructive
        confirmDisabled={!suspendReason.trim() || suspendMutation.isPending}
        onCancel={handleCloseSuspendModal}
        onConfirm={handleConfirmSuspend}
        loading={suspendMutation.isPending}
      >
        <div className="mt-4">
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
