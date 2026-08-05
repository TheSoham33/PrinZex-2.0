'use client';

import { useRef } from 'react';
import type { UploadedDoc } from '@/lib/seller-types';
import { IconCheckCircle, IconFileText, IconTrash, IconUpload } from '@/components/icons';

interface DocumentUploadCardProps {
  doc: UploadedDoc;
  onUpload: (fileName: string | null) => void;
}

export default function DocumentUploadCard({ doc, onUpload }: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        doc.file ? 'border-green-300 bg-green-50/50' : 'border-dashed border-slate-300 bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            doc.file ? 'bg-green-600 text-white' : 'bg-white text-slate-400 shadow-sm'
          }`}
        >
          {doc.file ? <IconCheckCircle className="h-5 w-5" /> : <IconFileText className="h-5 w-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {doc.label} <span className="text-red-500">*</span>
          </p>
          {doc.file ? (
            <p className="mt-0.5 truncate text-xs text-green-700">{doc.file}</p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">PDF, JPG or PNG · up to 5 MB</p>
          )}
        </div>

        {doc.file ? (
          <button
            type="button"
            onClick={() => {
              onUpload(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${doc.label}`}
          >
            <IconTrash className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-secondary shrink-0 text-xs"
          >
            <IconUpload className="h-3.5 w-3.5" /> Upload
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file.name);
        }}
        className="hidden"
      />
    </div>
  );
}
