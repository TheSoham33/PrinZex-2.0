'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptComplaint,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  fetchSellerComplaints,
  rejectComplaint,
} from '@/lib/api/complaints';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertTriangle, IconCheckCircle, IconClock, IconX } from '@/components/icons';

/**
 * Seller side of the dispute flow: the claim lands here first. Accept (fires
 * the refund) or reject WITH a reason — inside the response window, after
 * which the claim auto-escalates to admin. For missing-pages claims the
 * seller records the seal-intact yes/no they observed in the unboxing video.
 */
export default function SellerComplaintPanel({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [sealIntact, setSealIntact] = useState<boolean | null>(null);

  const { data: complaints } = useQuery({
    queryKey: ['seller-complaints'],
    queryFn: fetchSellerComplaints,
    refetchInterval: 60_000,
  });
  const complaint = complaints?.find((c) => c.orderId === orderId) ?? null;
  const complaintId = complaint?.id ?? '';

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['seller-complaints'] });
  const pending = complaint?.status === 'pending_seller';

  const accept = useMutation({
    mutationFn: () =>
      acceptComplaint(complaintId, sealIntact === null ? {} : { sealIntact }),
    onSuccess: () => {
      showToast('Claim accepted — the customer is being refunded');
      invalidate();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not accept the claim', 'error'),
  });

  const reject = useMutation({
    mutationFn: () =>
      rejectComplaint(complaintId, {
        reason,
        ...(sealIntact === null ? {} : { sealIntact }),
      }),
    onSuccess: () => {
      showToast('Claim rejected — the customer can escalate to admin');
      setRejecting(false);
      setReason('');
      invalidate();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not reject the claim', 'error'),
  });

  if (!complaint) return null;

  return (
    <section className="card mt-4 border-amber-200 p-5 ring-1 ring-inset ring-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconAlertTriangle className="h-4 w-4 text-amber-600" /> Customer claim
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            pending ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {COMPLAINT_STATUS_LABELS[complaint.status]}
        </span>
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <p className="font-medium text-slate-800">{COMPLAINT_TYPE_LABELS[complaint.type]}</p>
        <p className="text-slate-600">{complaint.description}</p>

        {(complaint.photoUrls.length > 0 || complaint.videoUrl) && (
          <div className="flex flex-wrap items-center gap-2">
            {complaint.photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="evidence" className="h-14 w-14 rounded border border-slate-200 object-cover" />
            ))}
            {complaint.videoUrl && (
              <a href={complaint.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
                Watch the unboxing video
              </a>
            )}
          </div>
        )}

        {pending && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700">
            <IconClock className="h-3.5 w-3.5" />
            Respond by {formatDateTime(complaint.sellerRespondBy)} — no response auto-escalates the claim to admin.
          </p>
        )}

        {complaint.type === 'missing_pages' && pending && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              Seal check — did the parcel seal look intact in the video?
            </p>
            <div className="mt-2 flex gap-2">
              {([true, false] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setSealIntact(value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    sealIntact === value
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {value ? 'Seal intact' : 'Seal broken'}
                </button>
              ))}
            </div>
          </div>
        )}

        {pending && !rejecting && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn-primary"
              disabled={accept.isPending}
              onClick={() => accept.mutate()}
            >
              <IconCheckCircle className="h-4 w-4" /> Accept claim (refund customer)
            </button>
            <button type="button" className="btn-secondary" onClick={() => setRejecting(true)}>
              <IconX className="h-4 w-4" /> Reject claim
            </button>
          </div>
        )}

        {pending && rejecting && (
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="label" htmlFor="reject-reason">Rejection reason (required, shown to the customer)</label>
            <textarea
              id="reject-reason"
              className="input min-h-[70px]"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the decision — e.g. the video shows all pages were included."
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={reject.isPending || !reason.trim()}
                onClick={() => reject.mutate()}
              >
                Confirm rejection
              </button>
              <button type="button" className="btn-secondary" onClick={() => setRejecting(false)}>
                Back
              </button>
            </div>
          </div>
        )}

        {complaint.status === 'seller_rejected' && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            You rejected this claim{complaint.sellerRejectReason ? `: "${complaint.sellerRejectReason}"` : ''}. The customer may escalate it to admin.
          </p>
        )}
        {complaint.status === 'escalated' && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Escalated{complaint.escalatedBy === 'system' ? ' (response window expired)' : ' by the customer'} — admin reviews now; their decision is final.
          </p>
        )}
        {complaint.status === 'refunded' && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Refund issued{complaint.resolvedBy === 'admin' ? ' by admin (final)' : ''}.
          </p>
        )}
        {complaint.status === 'closed' && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Closed by admin without refund.
          </p>
        )}
      </div>
    </section>
  );
}
