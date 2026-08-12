'use client';

import { useEffect, useRef } from 'react';
import { IconAlertTriangle, IconX } from '@/components/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red styling for destructive actions — always paired with a text label. */
  destructive?: boolean;
  /** Optional extra controls (reason select, refund amount input…). */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  children,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const hasFocused = useRef(false);

  useEffect(() => {
    if (!open) {
      hasFocused.current = false;
      return;
    }

    if (!hasFocused.current) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      // Focus lands on Cancel — the safer default for destructive actions.
      const timer = setTimeout(() => {
        cancelRef.current?.focus();
        hasFocused.current = true;
      }, 20);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        // Return focus to whatever opened the dialog.
        previouslyFocused.current?.focus?.();
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} aria-hidden />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconAlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p id="confirm-message" className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {message}
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

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-secondary flex-1">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={
              destructive
                ? 'btn flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                : 'btn-primary flex-1'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
