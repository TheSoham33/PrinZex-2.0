'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  createComplaint,
  escalateComplaint,
  fetchMyComplaints,
  uploadEvidence,
  type Complaint,
  type ComplaintType,
} from '@/lib/api/complaints';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconFlag,
  IconImageIcon,
  IconUpload,
} from '@/components/icons';

const TYPES: ComplaintType[] = ['missing_pages', 'wrong_item', 'print_quality', 'damaged_in_transit'];

const STATUS_TONE: Record<Complaint['status'], string> = {
  pending_seller: 'bg-amber-100 text-amber-800',
  seller_accepted: 'bg-emerald-100 text-emerald-800',
  seller_rejected: 'bg-rose-100 text-rose-800',
  escalated: 'bg-blue-100 text-blue-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
};

/** Customer side of the dispute flow: file a claim (photos, or a mandatory
 *  unboxing video for missing pages), watch its status, escalate a seller
 *  decision they disagree with. */
export default function ComplaintPanel({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<ComplaintType>('print_quality');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: complaints } = useQuery({
    queryKey: ['my-complaints', orderId],
    queryFn: () => fetchMyComplaints(orderId),
  });
  const complaint = complaints?.[0] ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['my-complaints', orderId] });

  const uploadPhotos = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 6 - photoUrls.length);
    for (const file of list) {
      setUploading(file.name);
      try {
        const { fileUrl } = await uploadEvidence(file);
        setPhotoUrls((prev) => (prev.length >= 6 ? prev : [...prev, fileUrl]));
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Photo upload failed', 'error');
      } finally {
        setUploading(null);
      }
    }
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const uploadVideo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(file.name);
    try {
      const { fileUrl } = await uploadEvidence(file);
      setVideoUrl(fileUrl);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Video upload failed', 'error');
    } finally {
      setUploading(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const submit = useMutation({
    mutationFn: () =>
      createComplaint({ orderId, type, description, photoUrls, videoUrl }),
    onSuccess: () => {
      showToast('Claim filed — the store has been notified');
      setFormOpen(false);
      setDescription('');
      setPhotoUrls([]);
      setVideoUrl(null);
      invalidate();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not file the claim', 'error'),
  });

  const escalate = useMutation({
    mutationFn: () => escalateComplaint(complaint!.id, escalationReason || undefined),
    onSuccess: () => {
      showToast('Escalated — admin will review with full context');
      setEscalationReason('');
      invalidate();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not escalate', 'error'),
  });

  const canFile = orderStatus === 'delivered' && !complaint;
  const canEscalate =
    complaint &&
    (complaint.status === 'seller_accepted' ||
      complaint.status === 'seller_rejected' ||
      complaint.status === 'refunded');

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Order issue & claims</h2>
        {canFile && !formOpen && (
          <button type="button" className="btn-secondary" onClick={() => setFormOpen(true)}>
            <IconFlag className="h-4 w-4" /> Report an issue
          </button>
        )}
      </div>

      {!complaint && !formOpen && (
        <p className="mt-3 text-sm text-slate-500">
          {orderStatus === 'delivered'
            ? 'Something wrong with this order? File a claim with photo or video evidence — the store responds first, and admin steps in if needed.'
            : 'Once your order is delivered you can report missing pages, wrong items, print-quality problems or transit damage here.'}
        </p>
      )}

      {formOpen && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div>
            <span className="label">What went wrong?</span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {TYPES.map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    type === t
                      ? 'border-blue-500 bg-blue-50 font-medium text-blue-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="complaint-type"
                    className="sr-only"
                    checked={type === t}
                    onChange={() => setType(t)}
                  />
                  {COMPLAINT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="complaint-desc">Describe the issue</label>
            <textarea
              id="complaint-desc"
              className="input min-h-[90px]"
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is missing or wrong? Include page counts / quantities where relevant."
              required
            />
          </div>

          {type === 'missing_pages' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <IconAlertCircle className="h-4 w-4" /> Unboxing video required
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Missing-pages claims need a video of you opening the sealed parcel — the store and
                admin check whether the seal was intact. Photos are optional here.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => void uploadVideo(e.target.files)}
                  className="text-xs"
                />
                <IconUpload className="h-4 w-4 text-amber-700" />
              </div>
              {videoUrl ? (
                <p className="mt-1 text-xs font-medium text-emerald-700">Unboxing video attached ✓</p>
              ) : (
                <p className="mt-1 text-xs text-amber-700">No video yet — the claim cannot be submitted without it (max 100 MB).</p>
              )}
            </div>
          ) : (
            <div>
              <span className="label flex items-center gap-1.5">
                <IconImageIcon className="h-4 w-4" /> Photos of the issue (required, up to 6)
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={(e) => void uploadPhotos(e.target.files)}
                  className="text-xs"
                />
                {photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="evidence" className="h-12 w-12 rounded border border-slate-200 object-cover" />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">JPG/PNG up to 10 MB each.</p>
            </div>
          )}

          {uploading && <p className="text-xs text-slate-500">Uploading {uploading}…</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={
                submit.isPending ||
                !!uploading ||
                (type === 'missing_pages' ? !videoUrl : photoUrls.length === 0)
              }
            >
              {submit.isPending ? 'Filing claim…' : 'Submit claim'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {complaint && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[complaint.status]}`}>
              {COMPLAINT_STATUS_LABELS[complaint.status]}
            </span>
            <span className="text-sm font-medium text-slate-800">
              {COMPLAINT_TYPE_LABELS[complaint.type]}
            </span>
            <span className="text-xs text-slate-400">filed {formatDateTime(complaint.createdAt)}</span>
          </div>

          <p className="text-sm text-slate-600">{complaint.description}</p>

          {(complaint.photoUrls.length > 0 || complaint.videoUrl) && (
            <div className="flex flex-wrap items-center gap-2">
              {complaint.photoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="evidence" className="h-14 w-14 rounded border border-slate-200 object-cover" />
              ))}
              {complaint.videoUrl && (
                <a href={complaint.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
                  Watch unboxing video
                </a>
              )}
            </div>
          )}

          {complaint.status === 'pending_seller' && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <IconClock className="h-3.5 w-3.5" />
              The store must respond by {formatDateTime(complaint.sellerRespondBy)} — otherwise the claim goes to admin automatically.
            </p>
          )}

          {complaint.status === 'seller_rejected' && complaint.sellerRejectReason && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Store&apos;s reason: {complaint.sellerRejectReason}
            </p>
          )}

          {complaint.status === 'refunded' && (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <IconCheckCircle className="h-4 w-4" /> Refund issued to the original payment source.
            </p>
          )}

          {complaint.status === 'escalated' && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Admin is reviewing the claim with full context — their decision is final.
            </p>
          )}

          {canEscalate && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">Disagree with this outcome?</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="input max-w-xs"
                  placeholder="Why do you disagree? (optional)"
                  value={escalationReason}
                  maxLength={500}
                  onChange={(e) => setEscalationReason(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={escalate.isPending}
                  onClick={() => escalate.mutate()}
                >
                  <IconFlag className="h-4 w-4" /> Escalate to admin
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
