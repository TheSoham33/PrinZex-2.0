'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchDeliveryBoys, 
  updateDeliveryBoyStatus,
  fetchDeliveryBoyById,
  verifyDeliveryBoyDocument,
} from '@/lib/api/admin-delivery';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconStar, IconRefreshCw } from '@/components/icons';

const DELIVERY_ZONES = [
  'Salt Lake', 'New Town', 'Sector V', 'Koramangala', 'HSR Layout', 'Indiranagar'
];

export default function AdminDeliveryPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const handleCloseDrawer = useCallback(() => setDrawerId(null), []);

  const { data: riders = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-delivery', statusFilter],
    queryFn: () => fetchDeliveryBoys({ status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase() }),
  });

  const { data: currentRider, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-delivery-detail', drawerId],
    queryFn: () => drawerId ? fetchDeliveryBoyById(drawerId) : null,
    enabled: !!drawerId,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      updateDeliveryBoyStatus(id, 'SUSPENDED', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery'] });
      showToast('Delivery partner suspended');
      setSuspendTarget(null);
      setSuspendReason('');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleCloseSuspendModal = useCallback(() => {
    setSuspendTarget(null);
    setSuspendReason('');
  }, []);

  const handleConfirmSuspend = useCallback(() => {
    if (suspendTarget) {
      suspendMutation.mutate({ id: suspendTarget.id, reason: suspendReason });
    }
  }, [suspendTarget, suspendReason, suspendMutation]);

  const verifyMutation = useMutation({
    mutationFn: (docType: string) => verifyDeliveryBoyDocument(drawerId!, docType, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-detail', drawerId] });
      showToast('Document verified');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{r.name}</p>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City', sortable: true },
    { key: 'vehicleType', label: 'Vehicle', sortable: true },
    { key: 'totalDeliveries', label: 'Deliveries', sortable: true, render: (r) => r.totalDeliveries || 0 },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1 font-medium text-slate-900">
        <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(r.averageRating || r.rating || 0).toFixed(1)}
      </span>
    ) },
    { key: 'totalEarnings', label: 'Earnings', sortable: true, render: (r) => formatCurrency(r.totalEarnings || 0) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setDrawerId(r.id)} className="btn-secondary text-xs">View</button>
          {r.status.toLowerCase() !== 'suspended' && (
            <button 
              type="button" 
              onClick={() => { setSuspendTarget(r); setSuspendReason(''); }} 
              className="btn-secondary text-xs text-red-600"
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Delivery partners</h1>
          <p className="mt-1 text-sm text-slate-600">
            {riders.length} registered partners.
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

      <DataTable
        data={riders}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by name or phone"
        caption="Delivery partners registered on the platform"
        pagination={{ pageSize: 10 }}
        emptyMessage="No delivery partners match these filters."
        filters={
          <div>
            <label htmlFor="dlv-status" className="label text-xs">Status</label>
            <select id="dlv-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        }
      />

      <ConfirmModal
        open={Boolean(suspendTarget)}
        title="Suspend this partner?"
        message={`${suspendTarget?.name ?? ''} will stop receiving delivery assignments immediately.`}
        confirmLabel="Suspend partner"
        destructive
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
            placeholder="Why is this rider being suspended?"
            className="input resize-none"
          />
        </div>
      </ConfirmModal>

      <UserDetailDrawer
        open={Boolean(drawerId)}
        onClose={handleCloseDrawer}
        title={currentRider?.name ?? 'Loading...'}
        subtitle={currentRider ? `${currentRider.vehicleType} · ${currentRider.city}` : undefined}
        ariaLabel="Rider details"
      >
        {loadingDetail ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        ) : currentRider && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Personal</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Partner ID</dt><dd className="font-mono text-slate-900">{currentRider.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{currentRider.phone}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="break-all text-right text-slate-900">{currentRider.email}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(currentRider.createdAt)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Vehicle</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="text-slate-900 uppercase">{currentRider.vehicleType}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Registration</dt><dd className="font-mono text-slate-900">{currentRider.vehicleRegNo}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Documents</h3>
              <div className="mt-2 space-y-2">
                {currentRider.documents?.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 uppercase">{d.docType.replace(/_/g, ' ')}</p>
                      <div className="flex gap-2 mt-1">
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View file</a>
                        {!d.isVerified && (
                          <button 
                            onClick={() => verifyMutation.mutate(d.docType)}
                            disabled={verifyMutation.isPending}
                            className="text-xs text-green-600 hover:underline"
                          >
                            {verifyMutation.isPending ? '...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={d.isVerified ? 'verified' : 'needs_review'} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Performance</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total deliveries</dt><dd className="font-bold text-slate-900">{currentRider.totalDeliveries || 0}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Rating</dt><dd className="font-bold text-slate-900">{(currentRider.averageRating || 0).toFixed(1)} ★</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total earnings</dt><dd className="font-bold text-slate-900">{formatCurrency(currentRider.totalEarnings || 0)}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}
