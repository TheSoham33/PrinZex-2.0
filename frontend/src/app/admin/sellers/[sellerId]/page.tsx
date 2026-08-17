'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminSellerById, 
  approveSeller, 
  rejectSeller, 
  suspendSeller, 
  updateSellerCommission 
} from '@/lib/api/admin-sellers';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import VerificationModal, { type VerificationMode } from '@/components/admin/VerificationModal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheckCircle,
  IconFileText,
  IconMapPin,
  IconPhone,
  IconStar,
  IconX,
  IconRefreshCw,
} from '@/components/icons';

const TABS = ['Overview', 'Documents', 'Orders', 'Reviews', 'Financials'] as const;
type Tab = (typeof TABS)[number];

export default function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = use(params);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: seller, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-seller', sellerId],
    queryFn: () => fetchAdminSellerById(sellerId),
  });

  const [tab, setTab] = useState<Tab>('Overview');
  const [verifyMode, setVerifyMode] = useState<VerificationMode | null>(null);
  const [removeReview, setRemoveReview] = useState<string | null>(null);
  const [commissionEditing, setCommissionEditing] = useState(false);
  const [commissionDraft, setCommissionDraft] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => approveSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller', sellerId] });
      showToast('Store approved successfully');
      setVerifyMode(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller', sellerId] });
      showToast('Store application rejected');
      setVerifyMode(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => suspendSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller', sellerId] });
      showToast('Store suspended');
      setVerifyMode(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const commissionMutation = useMutation({
    mutationFn: (rate: number) => updateSellerCommission(sellerId, rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller', sellerId] });
      showToast('Commission updated');
      setCommissionEditing(false);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleVerifyConfirm = useCallback(({ reason }: { reason?: string }) => {
    if (verifyMode === 'approve') {
      approveMutation.mutate();
    } else if (verifyMode === 'reject') {
      rejectMutation.mutate(reason || 'No reason provided');
    }
  }, [verifyMode, approveMutation, rejectMutation]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="card h-40 animate-pulse bg-slate-100" />
        <div className="card h-80 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (isError || !seller) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Seller not found</h1>
          <p className="mt-1 text-sm text-slate-600">
            No seller matches <span className="font-mono">{sellerId}</span>.
          </p>
          <Link href="/admin/sellers" className="btn-primary mt-6">
            <IconArrowLeft className="h-4 w-4" /> Back to sellers
          </Link>
        </div>
      </div>
    );
  }

  const orderColumns: DataTableColumn<any>[] = [
    { key: 'id', label: 'Order ID', sortable: true, render: (r) => (
      <Link href={`/admin/orders/${r.id}`} className="font-mono text-blue-600 hover:underline">{r.id}</Link>
    ) },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'service', label: 'Service' },
    { key: 'total', label: 'Total', sortable: true, render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'placedAt', label: 'Placed', sortable: true, render: (r) => formatDate(r.placedAt) },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/sellers" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <IconArrowLeft className="h-4 w-4" /> All sellers
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

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{seller.storeName}</h1>
            <StatusBadge status={seller.status.toLowerCase()} size="md" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{seller.id}</span> · {seller.ownerName} · {seller.city}
          </p>
        </div>

        {seller.status.toLowerCase() === 'pending' && (
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setVerifyMode('approve')} 
              disabled={approveMutation.isPending}
              className="btn bg-green-600 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              <IconCheckCircle className="h-4 w-4" /> {approveMutation.isPending ? 'Approving...' : 'Approve store'}
            </button>
            <button 
              type="button" 
              onClick={() => setVerifyMode('reject')} 
              disabled={rejectMutation.isPending}
              className="btn border border-red-300 bg-white text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <IconX className="h-4 w-4" /> Reject
            </button>
          </div>
        )}

        {seller.status.toLowerCase() === 'approved' && (
          <button 
            type="button" 
            onClick={() => setVerifyMode('reject')} // Using reject mode for suspension here or we could add a dedicated suspend UI
            className="btn border border-red-300 bg-white text-sm text-red-600 hover:bg-red-50"
          >
            Suspend Store
          </button>
        )}
      </header>

      <div role="tablist" aria-label="Seller sections" className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
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

      {tab === 'Overview' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-900">Store information</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Owner</dt><dd className="text-right font-medium text-slate-900">{seller.ownerName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="break-all text-right font-medium text-slate-900">{seller.email}</dd></div>
              <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-slate-500">Phone</dt><dd className="inline-flex items-center gap-1.5 font-medium text-slate-900"><IconPhone className="h-3.5 w-3.5 text-slate-400" />{seller.phone}</dd></div>
              <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-slate-500">Address</dt><dd className="inline-flex items-start gap-1.5 text-right font-medium text-slate-900"><IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{seller.storeAddress || seller.address}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="font-medium text-slate-900">{formatDate(seller.createdAt || (seller as any).joinedAt)}</dd></div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-900">Performance</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Completion rate</dt><dd className="font-bold text-slate-900">{seller.performance?.completionRate || seller.completionRate}%</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">On-time delivery</dt><dd className="font-bold text-slate-900">{seller.performance?.onTimeRate || seller.onTimeDeliveryPct}%</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Average rating</dt><dd className="inline-flex items-center gap-1 font-bold text-slate-900"><IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{seller.performance?.averageRating || seller.rating || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Total orders</dt><dd className="font-bold text-slate-900">{seller.performance?.totalOrders || seller.totalOrders}</dd></div>
            </dl>
          </section>

          <section className="card p-5 sm:col-span-2">
            <h2 className="text-sm font-bold text-slate-900">Services offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {seller.services?.map((s: any) => (
                <span key={typeof s === 'string' ? s : s.id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {typeof s === 'string' ? s : s.serviceName}
                </span>
              ))}
              {(!seller.services || seller.services.length === 0) && <p className="text-sm text-slate-500">No services listed.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === 'Documents' && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {seller.documents?.map((doc: any) => (
            <div key={doc.id || doc.type} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <IconFileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 uppercase">{doc.docType?.replace(/_/g, ' ') || doc.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{doc.fileUrl?.split('/').pop() || doc.fileName}</p>
                  <div className="mt-2"><StatusBadge status={doc.isVerified ? 'verified' : 'needs_review'} /></div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
              </div>
            </div>
          ))}
          {(!seller.documents || seller.documents.length === 0) && <div className="card sm:col-span-2 px-6 py-12 text-center text-sm text-slate-500">No documents uploaded.</div>}
        </div>
      )}

      {tab === 'Orders' && (
        <div className="mt-6">
          <DataTable
            data={seller.orders || []}
            columns={orderColumns}
            searchable
            searchPlaceholder="Search this seller's orders"
            caption={`Orders for ${seller.storeName}`}
            pagination={{ pageSize: 10 }}
            emptyMessage="This seller has no orders yet."
          />
        </div>
      )}

      {tab === 'Reviews' && (
        <div className="mt-6 space-y-3">
          {(!seller.reviews || seller.reviews.length === 0) ? (
            <div className="card px-6 py-12 text-center text-sm text-slate-500">No reviews yet.</div>
          ) : (
            seller.reviews.map((review: any) => (
              <div key={review.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{review.customerName || review.customer}</p>
                    <div className="mt-1 flex items-center gap-0.5" aria-label={`${review.overallRating || review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <IconStar key={i} className={`h-3.5 w-3.5 ${i < (review.overallRating || review.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(review.createdAt || review.date)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Financials' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-900">Commission</h2>
            {commissionEditing ? (
              <div className="mt-3 flex items-end gap-2">
                <div className="w-24">
                  <label htmlFor="comm-rate" className="label text-xs">Rate (%)</label>
                  <input 
                    id="comm-rate" 
                    type="number" 
                    min={0} 
                    max={100} 
                    autoFocus 
                    value={commissionDraft} 
                    onChange={(e) => setCommissionDraft(e.target.value)} 
                    className="input py-2 text-sm" 
                  />
                </div>
                <button
                  type="button"
                  disabled={commissionMutation.isPending}
                  onClick={() => {
                    const rate = Number(commissionDraft);
                    if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
                      commissionMutation.mutate(rate / 100);
                    } else {
                      showToast('Invalid percentage', 'error');
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  {commissionMutation.isPending ? '...' : 'Save'}
                </button>
                <button type="button" onClick={() => setCommissionEditing(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <p className="text-3xl font-bold text-slate-900">{Math.round(seller.commissionRate * 100)}%</p>
                <button type="button" onClick={() => { setCommissionEditing(true); setCommissionDraft(String(Math.round(seller.commissionRate * 100))); }} className="btn-secondary text-xs">
                  Edit
                </button>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-900">Balances</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Total earned</dt><dd className="font-bold text-slate-900">{formatCurrency(seller.totalRevenue || 0)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2.5"><dt className="text-slate-500">Pending balance</dt><dd className="font-bold text-green-700">{formatCurrency(seller.pendingPayoutBalance || seller.pendingBalance || 0)}</dd></div>
            </dl>
          </section>
        </div>
      )}

      <VerificationModal
        open={verifyMode !== null}
        mode={verifyMode ?? 'approve'}
        storeName={seller.storeName}
        onCancel={() => setVerifyMode(null)}
        onConfirm={handleVerifyConfirm}
        loading={approveMutation.isPending || rejectMutation.isPending}
      />

      <ConfirmModal
        open={Boolean(removeReview)}
        title="Remove this review?"
        message="The review will no longer be visible on the public store page. This cannot be undone."
        confirmLabel="Remove review"
        destructive
        onCancel={() => setRemoveReview(null)}
        onConfirm={() => {
          // TODO: Implement real review removal API
          showToast('Review removal API not implemented yet', 'warn');
          setRemoveReview(null);
        }}
      />
    </div>
  );
}
