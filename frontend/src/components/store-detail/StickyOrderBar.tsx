'use client';

import Link from 'next/link';
import type { ServiceOffering } from '@/lib/mock-data/stores';
import { formatCurrency } from '@/lib/utils';
import { IconArrowRight, IconHelpCircle } from '@/components/icons';

interface StickyOrderBarProps {
  storeId: string;
  selectedService: ServiceOffering | null;
  isOpen?: boolean;
}

export default function StickyOrderBar({ storeId, selectedService, isOpen = true }: StickyOrderBarProps) {
  const href = selectedService
    ? `/stores/${storeId}/order?service=${selectedService.id}`
    : `/stores/${storeId}/order`;

  const canOrder = selectedService && isOpen;

  return (
    <>
      {/* Desktop: sticky sidebar card */}
      <aside className="hidden lg:block">
        <div className="card sticky top-24 p-5">
          <h3 className="font-semibold text-slate-900">Start your order</h3>

          {!isOpen && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 border border-red-100">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Store Closed</p>
              <p className="mt-1 text-sm text-red-700">
                This shop is currently not accepting new orders. Please check back during their business hours.
              </p>
            </div>
          )}

          {selectedService ? (
            <div className={`mt-4 rounded-xl p-4 ${isOpen ? 'bg-blue-50' : 'bg-slate-50 opacity-60'}`}>
              <p className={`text-xs font-medium ${isOpen ? 'text-blue-600' : 'text-slate-500'}`}>Selected service</p>
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
            isOpen && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <IconHelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                Pick a service from the list to see pricing and continue.
              </div>
            )
          )}

          <Link
            href={href}
            aria-disabled={!canOrder}
            tabIndex={canOrder ? undefined : -1}
            className={`mt-4 w-full ${
              canOrder ? 'btn-primary' : 'btn pointer-events-none bg-slate-200 text-slate-400'
            }`}
          >
            {isOpen ? 'Continue to order' : 'Store Closed'} <IconArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-3 text-center text-xs text-slate-500">
            {isOpen ? 'No payment taken until you confirm' : 'Browsing only mode'}
          </p>
        </div>
      </aside>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {!isOpen ? (
              <p className="text-sm font-bold text-red-600">Shop Closed</p>
            ) : selectedService ? (
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
            aria-disabled={!canOrder}
            tabIndex={canOrder ? undefined : -1}
            className={`shrink-0 ${
              canOrder ? 'btn-primary' : 'btn pointer-events-none bg-slate-200 text-slate-400'
            }`}
          >
            {isOpen ? 'Order' : 'Closed'} <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
