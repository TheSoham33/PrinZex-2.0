'use client';

import Link from 'next/link';
import type { ServiceOffering } from '@/lib/types/stores';
import { formatCurrency } from '@/lib/utils';
import { IconArrowRight, IconHelpCircle } from '@/components/icons';

interface StickyOrderBarProps {
  storeId: string;
  selectedService: ServiceOffering | null;
}

export default function StickyOrderBar({ storeId, selectedService }: StickyOrderBarProps) {
  const href = selectedService
    ? `/stores/${storeId}/order?service=${selectedService.id}`
    : `/stores/${storeId}/order`;

  return (
    <>
      {/* Desktop: sticky sidebar card */}
      <aside className="hidden lg:block">
        <div className="card sticky top-24 p-5">
          <h3 className="font-semibold text-slate-900">Start your order</h3>

          {selectedService ? (
            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-600">Selected service</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedService.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                From{' '}
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedService.startingPrice)}
                </span>{' '}
                {selectedService.unit}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <IconHelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              Pick a service from the list to see pricing and continue.
            </div>
          )}

          <Link
            href={href}
            aria-disabled={!selectedService}
            tabIndex={selectedService ? undefined : -1}
            className={`mt-4 w-full ${
              selectedService ? 'btn-primary' : 'btn pointer-events-none bg-slate-200 text-slate-400'
            }`}
          >
            Continue to order <IconArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-3 text-center text-xs text-slate-500">
            No payment taken until you confirm
          </p>
        </div>
      </aside>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {selectedService ? (
              <>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedService.name}
                </p>
                <p className="text-xs text-slate-500">
                  From {formatCurrency(selectedService.startingPrice)} {selectedService.unit}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a service to continue</p>
            )}
          </div>
          <Link
            href={href}
            aria-disabled={!selectedService}
            tabIndex={selectedService ? undefined : -1}
            className={`shrink-0 ${
              selectedService ? 'btn-primary' : 'btn pointer-events-none bg-slate-200 text-slate-400'
            }`}
          >
            Order <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
