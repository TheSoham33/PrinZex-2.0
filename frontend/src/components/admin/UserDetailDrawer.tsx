'use client';

import { useEffect, useRef } from 'react';
import { IconX } from '@/components/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface UserDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Describes the drawer contents for assistive tech. */
  ariaLabel: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Right-hand slide-in panel used for quick-view across admin listing pages. */
export default function UserDetailDrawer({
  open,
  onClose,
  title,
  ariaLabel,
  subtitle,
  children,
  footer,
}: UserDetailDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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
      const timer = setTimeout(() => {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes && nodes.length > 0) {
          nodes[0].focus();
          hasFocused.current = true;
        }
      }, 20);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        previouslyFocused.current?.focus?.();
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65]">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="absolute right-0 top-0 flex h-full w-full max-w-[26rem] animate-slide-in-right flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Close panel"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && <div className="shrink-0 border-t border-slate-200 p-4">{footer}</div>}
      </div>
    </div>
  );
}
