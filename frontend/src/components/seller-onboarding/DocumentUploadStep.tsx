'use client';

import type { DocumentType, UploadedDoc } from '@/lib/seller-types';
import DocumentUploadCard from './DocumentUploadCard';
import { IconAlertCircle, IconShieldCheck } from '@/components/icons';

interface DocumentUploadStepProps {
  documents: UploadedDoc[];
  onUpload: (type: DocumentType, file: File | null) => void;
  error: string | null;
}

export default function DocumentUploadStep({
  documents,
  onUpload,
  error,
}: DocumentUploadStepProps) {
  const uploaded = documents.filter((doc) => doc.file).length;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Verification documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          We need these to verify your business. Approval usually takes 24–48 hours.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-600">
          <strong className="text-slate-900">{uploaded}</strong> of {documents.length} uploaded
        </span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${(uploaded / documents.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => (
          <DocumentUploadCard
            key={doc.type}
            doc={doc}
            onUpload={(file) => onUpload(doc.type, file)}
          />
        ))}
      </div>

      <p className="flex items-start gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Documents are used only for verification and are stored securely.
      </p>
    </div>
  );
}
