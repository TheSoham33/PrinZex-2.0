'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheckCircle, IconX } from '@/components/icons';

type ToastVariant = 'success' | 'error';

interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (text: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Fire a transient confirmation message. Safe to call from any child. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, variant: ToastVariant = 'success') => {
    const id = Date.now() + Math.random();
    setMessages((previous) => [...previous, { id, text, variant }]);
    setTimeout(() => {
      setMessages((previous) => previous.filter((message) => message.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Assertive-but-polite region so screen readers announce confirmations. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[60] flex flex-col gap-2 lg:bottom-6"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-xl ${
                message.variant === 'error' ? 'bg-red-600' : 'bg-slate-900'
              }`}
            >
              {message.variant === 'error' ? (
                <IconX className="mt-0.5 h-4 w-4 shrink-0 text-white" />
              ) : (
                <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              )}
              <span className="flex-1">{message.text}</span>
              <button
                type="button"
                onClick={() =>
                  setMessages((previous) => previous.filter((item) => item.id !== message.id))
                }
                className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-white"
                aria-label="Dismiss notification"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
