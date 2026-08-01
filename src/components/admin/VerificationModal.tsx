'use client';

import { useEffect, useRef, useState } from 'react';
import { REJECTION_REASONS } from '@/lib/mock-data/admin-sellers';
import { IconAlertTriangle, IconCheckCircle, IconX } from '@/components/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export type VerificationMode = 'approve' | 'reject';

interface VerificationModalProps {
  open: boolean;
  mode: VerificationMode;
  storeName: string;
  onCancel: () => void;
  onConfirm: (payload: { reason?: string; note: string }) => void;
}

/** Approve / reject dialog for seller applications. */
export default function VerificationModal({
  open,
  mode,
  storeName,
  onCancel,
  onConfirm,
}: VerificationModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setNote('');
    setReason(REJECTION_REASONS[0]);

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => cancelRef.current?.focus(), 20);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isReject = mode === 'reject';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        className="relative w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isReject ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}
          >
            {isReject ? <IconAlertTriangle className="h-5 w-5" /> : <IconCheckCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="verify-title" className="text-lg font-bold text-slate-900">
              {isReject ? 'Reject application' : 'Approve store'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {isReject
                ? `${storeName} will be notified that their application was not approved.`
                : `${storeName} will go live and can start receiving orders immediately.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Close dialog"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {isReject && (
            <div>
              <label htmlFor="reject-reason" className="label">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                id="reject-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input"
              >
                {REJECTION_REASONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="verify-note" className="label">
              {isReject ? 'Additional note (optional)' : 'Note (optional)'}
            </label>
            <textarea
              id="verify-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isReject
                  ? 'Anything else the applicant should know…'
                  : 'Internal note about this approval…'
              }
              className="input resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ reason: isReject ? reason : undefined, note })}
            className={
              isReject
                ? 'btn flex-1 bg-red-600 text-white hover:bg-red-700'
                : 'btn flex-1 bg-green-600 text-white hover:bg-green-700'
            }
          >
            {isReject ? 'Reject application' : 'Approve store'}
          </button>
        </div>
      </div>
    </div>
  );
}
