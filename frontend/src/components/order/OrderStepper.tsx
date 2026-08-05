'use client';

import { IconCheckCircle } from '@/components/icons';

const STEPS = ['Specifications', 'Upload', 'Delivery', 'Payment'];

interface OrderStepperProps {
  current: number;
  maxReached: number;
  onStepClick: (step: number) => void;
}

export default function OrderStepper({ current, maxReached, onStepClick }: OrderStepperProps) {
  return (
    <nav aria-label="Order progress">
      <ol className="flex items-center">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const complete = step < current;
          const active = step === current;
          const reachable = step <= maxReached;

          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(step)}
                className={`flex items-center gap-2.5 ${reachable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    complete
                      ? 'bg-blue-600 text-white'
                      : active
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {complete ? <IconCheckCircle className="h-4 w-4" /> : step}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:block ${
                    active ? 'text-blue-600' : complete ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>

              {index < STEPS.length - 1 && (
                <span
                  className={`mx-3 h-0.5 flex-1 rounded ${complete ? 'bg-blue-600' : 'bg-slate-200'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
