'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSellerKycStatus,
  uploadSellerKycDocuments,
  type SellerDocumentType,
  type SellerKycDocument,
} from '@/lib/api/seller-settings';
import { useToast } from '@/components/seller-dashboard/Toast';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconFileText,
  IconRefreshCw,
  IconShieldCheck,
  IconUpload,
} from '@/components/icons';

/**
 * Seller settings → KYC documents (gap #7).
 *
 * Sellers self-serve their verification documents instead of stalling on
 * support: view per-document status and upload/re-upload straight to the SAME
 * multipart endpoint the onboarding wizard uses. A re-upload replaces the file
 * and resets verification, after which the document lands back in the admin
 * verification queue — all reflected in the per-document badge.
 */

const DOC_META: Record<SellerDocumentType, { label: string; hint: string }> = {
  gst_certificate: { label: 'GST Certificate', hint: 'GST registration certificate (PDF, JPG or PNG)' },
  business_license: { label: 'Business License', hint: 'Trade license or business registration' },
  owner_id: { label: 'Owner ID Proof', hint: 'Aadhaar, PAN or passport of the owner' },
  address_proof: { label: 'Address Proof', hint: 'Utility bill or rent agreement for the store' },
};

const DOC_ORDER: SellerDocumentType[] = [
  'gst_certificate',
  'business_license',
  'owner_id',
  'address_proof',
];

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // mirrors the backend multer limit

function statusOf(doc: SellerKycDocument): 'verified' | 'needs_review' | 'missing' {
  if (!doc.uploaded) return 'missing';
  return doc.isVerified ? 'verified' : 'needs_review';
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SellerKycSection() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<SellerDocumentType | null>(null);

  const kycQ = useQuery({
    queryKey: ['seller-kyc-status'],
    queryFn: fetchSellerKycStatus,
  });

  const uploadM = useMutation({
    mutationFn: uploadSellerKycDocuments,
    onSuccess: (documents, formData) => {
      queryClient.invalidateQueries({ queryKey: ['seller-kyc-status'] });
      // The FormData field name is the doc type; the label lookup is by key.
      const docType = Array.from(formData.keys())[0] as SellerDocumentType | undefined;
      const label = docType ? DOC_META[docType]?.label : 'Document';
      showToast(`${label} uploaded — sent for re-verification`);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
    onSettled: () => setUploading(null),
  });

  const upload = (docType: SellerDocumentType, file: File) => {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      showToast('That file is over 5 MB — please upload a smaller file', 'error');
      return;
    }
    const formData = new FormData();
    formData.append(docType, file);
    setUploading(docType);
    uploadM.mutate(formData);
  };

  if (kycQ.isLoading) {
    return <div className="card mt-6 h-72 animate-pulse bg-slate-100" />;
  }

  if (kycQ.isError) {
    return (
      <div className="card mt-6 px-6 py-12 text-center">
        <IconAlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Couldn&apos;t load your documents</h2>
        <p className="mt-1 text-sm text-slate-600">Try again in a moment.</p>
        <button type="button" onClick={() => kycQ.refetch()} className="btn-primary mt-5">
          <IconRefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const status = kycQ.data;
  const documents = DOC_ORDER.map(
    (docType) =>
      status?.documents.find((doc) => doc.docType === docType) ?? {
        docType,
        uploaded: false,
        isVerified: false,
        verifiedAt: null,
        uploadedAt: null,
      },
  );
  const verifiedCount = documents.filter((doc) => doc.isVerified).length;

  return (
    <div className="mt-6 space-y-4">
      {status?.rejectionReason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Application note:</strong> {status.rejectionReason}
          </p>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Verification documents</h2>
            <p className="mt-1 text-sm text-slate-600">
              {verifiedCount} of {DOC_ORDER.length} documents verified. Upload or replace a document
              any time — the team re-checks it and you&apos;ll see the result here.
            </p>
          </div>
          <StatusBadge
            status={status?.isVerified ? 'verified' : 'needs_review'}
            label={status?.isVerified ? 'Store verified' : 'Documents under review'}
          />
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.docType}
              doc={doc}
              busy={uploading === doc.docType}
              onUpload={(file) => upload(doc.docType, file)}
            />
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Replacing an already-verified document sends it back to &quot;under review&quot; until the
          team checks the new file. Documents are used only for verification.
        </p>
      </div>
    </div>
  );
}

interface DocumentRowProps {
  doc: SellerKycDocument;
  busy: boolean;
  onUpload: (file: File) => void;
}

function DocumentRow({ doc, busy, onUpload }: DocumentRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = DOC_META[doc.docType];
  const state = statusOf(doc);
  const uploadedAt = formatDate(doc.uploadedAt);

  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          state === 'verified'
            ? 'bg-green-600 text-white'
            : state === 'needs_review'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-white text-slate-400 shadow-sm ring-1 ring-slate-200'
        }`}
      >
        {state === 'verified' ? (
          <IconCheckCircle className="h-5 w-5" />
        ) : state === 'needs_review' ? (
          <IconClock className="h-5 w-5" />
        ) : (
          <IconFileText className="h-5 w-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
          <StatusBadge
            status={state === 'missing' ? 'inactive' : state}
            label={state === 'missing' ? 'Not uploaded' : state === 'verified' ? 'Verified' : 'Under review'}
          />
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {state === 'missing' ? meta.hint : uploadedAt ? `Uploaded ${uploadedAt}` : meta.hint}
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn-secondary shrink-0 text-xs"
      >
        <IconUpload className="h-3.5 w-3.5" />
        {busy ? 'Uploading…' : state === 'missing' ? 'Upload' : 'Replace'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          // Allow re-selecting the same file after a validation error.
          event.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
