'use client';

import { useRef, useState, type DragEvent } from 'react';
import type { UploadedFile } from '@/lib/domain/stores';
import { formatFileSize } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import { IconAlertCircle, IconFileText, IconTrash, IconUpload } from '@/components/icons';

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.ai,.psd,.cdr';
const MAX_BYTES = 25 * 1024 * 1024;

interface UploadStepProps {
  file: UploadedFile | null;
  instructions: string;
  dispatch: React.Dispatch<OrderAction>;
  error: string | null;
}

export default function UploadStep({ file, instructions, dispatch, error }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const acceptFile = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size > MAX_BYTES) {
      setLocalError('That file is larger than 25 MB. Please compress it and try again.');
      return;
    }
    setLocalError(null);
    dispatch({
      type: 'SET_FILE',
      payload: { name: selected.name, size: selected.size, type: selected.type },
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const shownError = localError ?? error;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Upload your file</h2>
        <p className="mt-1 text-sm text-slate-600">
          PDF keeps formatting most reliably. Max 25 MB per file.
        </p>
      </header>

      {shownError && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {shownError}
        </p>
      )}

      {file ? (
        <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <IconFileText className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{file.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatFileSize(file.size)} · Ready to send
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'SET_FILE', payload: null });
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Remove file"
          >
            <IconTrash className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
            <IconUpload className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-slate-900">
            Drop your file here, or <span className="text-blue-600">browse</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">PDF, DOCX, JPG, PNG, AI, PSD, CDR · up to 25 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(event) => acceptFile(event.target.files?.[0])}
        className="hidden"
      />

      <section>
        <label htmlFor="instructions" className="label">
          Special instructions (optional)
        </label>
        <textarea
          id="instructions"
          rows={4}
          maxLength={500}
          value={instructions}
          onChange={(event) => dispatch({ type: 'SET_INSTRUCTIONS', payload: event.target.value })}
          placeholder="e.g. print double-sided, bind pages 1–40 separately, use the second page as the cover…"
          className="input resize-none"
        />
        <p className="mt-1.5 text-right text-xs text-slate-400">{instructions.length}/500</p>
      </section>
    </div>
  );
}
