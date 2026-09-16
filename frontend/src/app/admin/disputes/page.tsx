'use client';

import { Suspense, useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  adminCloseComplaint,
  adminRefundComplaint,
  adminSetSealIntact,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  fetchAdminComplaintDetail,
  fetchAdminComplaints,
  type ComplaintStatus,
} from '@/lib/api/complaints';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IconFlag, IconRefreshCw, IconX } from '@/components/icons';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending_seller', label: 'Awaiting seller' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'seller_accepted', label: 'Seller accepted' },
  { value: 'seller_rejected', label: 'Seller rejected' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'closed', label: 'Closed' },
];

const FINALIZABLE: ComplaintStatus[] = ['escalated', 'seller_accepted', 'seller_rejected'];

function DisputesInner() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const { data: complaints = [], refetch, isFetching } = useQuery({
    queryKey: ['admin-complaints', statusFilter],
    queryFn: () =>
      fetchAdminComplaints(statusFilter === 'all' ? undefined : statusFilter),
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-complaint-detail', selectedId],
    queryFn: () => (selectedId ? fetchAdminComplaintDetail(selectedId) : null),
    enabled: !!selectedId,
  });

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setNote('');
  }, []);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
    queryClient.invalidateQueries({ queryKey: ['admin-complaint-detail', selectedId] });
  };

  const refundMutation = useMutation({
    mutationFn: () => adminRefundComplaint(selectedId!, note || undefined),
    onSuccess: () => {
      showToast('Dispute finalized — refund issued');
      invalidateAll();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Refund failed', 'error'),
  });
  const closeMutation = useMutation({
    mutationFn: () => adminCloseComplaint(selectedId!, note || undefined),
    onSuccess: () => {
      showToast('Dispute finalized — closed without refund');
      invalidateAll();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not close', 'error'),
  });
  const sealMutation = useMutation({
    mutationFn: (intact: boolean) => adminSetSealIntact(selectedId!, intact),
    onSuccess: () => {
      showToast('Seal check recorded');
      invalidateAll();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not record', 'error'),
  });

  const columns: DataTableColumn<Record<string, any>>[] = [
    { key: 'orderId', label: 'Order', render: (r: any) => <span className="font-mono text-xs font-medium text-slate-900">#{String(r.orderId).slice(-6).toUpperCase()}</span> },
    { key: 'customer', label: 'Customer', render: (r: any) => r.customer?.name ?? '—' },
    { key: 'seller', label: 'Store', render: (r: any) => r.seller?.storeName ?? '—' },
    { key: 'type', label: 'Claim', render: (r: any) => COMPLAINT_TYPE_LABELS[r.type as keyof typeof COMPLAINT_TYPE_LABELS] ?? r.type },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'escalatedBy', label: 'Escalated by', render: (r: any) => (r.escalatedBy ? (r.escalatedBy === 'system' ? 'auto (window)' : 'customer') : '—') },
    { key: 'createdAt', label: 'Filed', sortable: true, render: (r: any) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (r: any) => (
        <button type="button" className="btn-secondary text-xs" onClick={() => { setSelectedId(r.id); setNote(''); }}>
          Review
        </button>
      ),
    },
  ];

  const c = detail?.complaint;
  const finalizable = c && FINALIZABLE.includes(c.status);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Disputes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Claims go to the fulfilling seller first — you act as the final tier once escalated.
          </p>
        </div>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-secondary text-sm">
          <IconRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={complaints as any} isLoading={isFetching} emptyMessage="No complaints in this view." />

      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={closeDrawer}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {!detail || !c ? (
              <div className="h-64 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <IconFlag className="h-4 w-4 text-rose-600" />
                      {COMPLAINT_TYPE_LABELS[c.type]}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Order <span className="font-mono">#{c.orderId.slice(-6).toUpperCase()}</span> · filed {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <button type="button" onClick={closeDrawer} className="btn-secondary text-xs">
                    <IconX className="h-4 w-4" /> Close
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-slate-500">{COMPLAINT_STATUS_LABELS[c.status]}</span>
                </div>

                {c.status === 'pending_seller' && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    The seller&apos;s response window runs until {formatDateTime(c.sellerRespondBy)}. Per policy admin
                    only observes now — if the window expires the claim auto-escalates to you.
                  </p>
                )}

                <section className="mt-4 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer&apos;s claim</h3>
                  <p className="mt-2 text-sm text-slate-700">{c.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {c.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="evidence" className="h-16 w-16 rounded border border-slate-200 object-cover" />
                      </a>
                    ))}
                    {c.videoUrl && (
                      <a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
                        Watch unboxing video
                      </a>
                    )}
                  </div>
                  {c.type === 'missing_pages' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">Seal intact?</span>
                      {([true, false] as const).map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          onClick={() => sealMutation.mutate(v)}
                          className={`rounded-md border px-2.5 py-1 text-xs ${
                            c.sealIntact === v
                              ? 'border-blue-500 bg-blue-50 font-semibold text-blue-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {v ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller response</h3>
                  {c.sellerResponseAt ? (
                    <div className="mt-2 space-y-1 text-slate-700">
                      <p>
                        {c.status === 'seller_rejected' || c.sellerRejectReason ? 'Rejected' : 'Accepted'} at {formatDateTime(c.sellerResponseAt)}
                        {c.sealIntact !== null ? ` · seal ${c.sealIntact ? 'intact' : 'broken'}` : ''}
                      </p>
                      {c.sellerRejectReason && <p className="text-rose-700">Reason: {c.sellerRejectReason}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-500">No response yet.</p>
                  )}
                  {c.escalatedAt && (
                    <p className="mt-2 text-xs text-blue-700">
                      Escalated {formatDateTime(c.escalatedAt)} by {c.escalatedBy === 'system' ? 'system (window expired)' : 'customer'}
                      {c.escalationReason ? ` — "${c.escalationReason}"` : ''}
                    </p>
                  )}
                </section>

                <section className="mt-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order context</h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-700">
                    <dt className="text-slate-500">Customer</dt>
                    <dd>{detail.customer.name}</dd>
                    <dt className="text-slate-500">Store</dt>
                    <dd>{detail.seller.storeName}</dd>
                    <dt className="text-slate-500">Order status</dt>
                    <dd>{detail.order.status}</dd>
                    <dt className="text-slate-500">Payment</dt>
                    <dd>{detail.order.paymentStatus} · {detail.order.paymentMethod}</dd>
                    <dt className="text-slate-500">Total</dt>
                    <dd>{formatCurrency(Number(detail.order.total))}</dd>
                    {detail.delivery && (
                      <>
                        <dt className="text-slate-500">Delivery</dt>
                        <dd>
                          {detail.delivery.status}
                          {detail.delivery.failReason ? ` — ${detail.delivery.failReason}` : ''}
                        </dd>
                      </>
                    )}
                  </dl>
                  {detail.timeline.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                      {detail.timeline.map((event, i) => (
                        <li key={i}>
                          <span className="text-slate-400">{formatDateTime(event.timestamp)}</span> — {event.label}
                          {event.note ? `: ${event.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {finalizable && (
                  <section className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <h3 className="text-sm font-semibold text-rose-900">Final decision</h3>
                    <p className="mt-1 text-xs text-rose-700">
                      Your decision is final. Refund returns the paid amount to the customer&apos;s original
                      payment source; close ends the dispute without a refund.
                    </p>
                    <textarea
                      className="input mt-3 min-h-[60px] bg-white"
                      placeholder="Resolution note (optional, logged on the dispute)"
                      value={note}
                      maxLength={500}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={refundMutation.isPending || detail.order.paymentStatus === 'pending'}
                        onClick={() => refundMutation.mutate()}
                      >
                        Refund customer (final)
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={closeMutation.isPending}
                        onClick={() => closeMutation.mutate()}
                      >
                        Close dispute (final)
                      </button>
                    </div>
                    {detail.order.paymentStatus === 'pending' && (
                      <p className="mt-2 text-xs text-rose-700">No captured payment on this order — refund is unavailable; close instead.</p>
                    )}
                  </section>
                )}

                {(c.status === 'refunded' || c.status === 'closed') && (
                  <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    Finalized: {c.status === 'refunded' ? `refund issued ${c.refundedAt ? formatDateTime(c.refundedAt) : ''}` : 'closed without refund'}
                    {c.resolvedBy ? ` by ${c.resolvedBy}` : ''}
                    {c.resolutionNote ? ` — "${c.resolutionNote}"` : ''}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-100" />}>
      <DisputesInner />
    </Suspense>
  );
}
