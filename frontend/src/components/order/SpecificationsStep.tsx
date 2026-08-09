'use client';

import {
  FINISHING_OPTIONS,
  PAPER_SIZES,
  PAPER_TYPES,
} from '@/lib/mock-data/stores';
import type { OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import { IconAlertCircle } from '@/components/icons';

interface SpecificationsStepProps {
  specs: OrderSpecifications;
  services: ServiceOffering[];
  dispatch: React.Dispatch<OrderAction>;
  error: string | null;
}

export default function SpecificationsStep({
  specs,
  services,
  dispatch,
  error,
}: SpecificationsStepProps) {
  const toggleFinishing = (value: string) => {
    const finishing = specs.finishing.includes(value)
      ? specs.finishing.filter((item) => item !== value)
      : [...specs.finishing, value];
    dispatch({ type: 'SET_SPEC', payload: { finishing } });
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Print specifications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tell us exactly how you want it printed. Pricing updates as you choose.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <section>
        <label htmlFor="service" className="label">
          Service <span className="text-red-500">*</span>
        </label>
        <select
          id="service"
          value={specs.serviceId}
          onChange={(event) =>
            dispatch({ type: 'SET_SPEC', payload: { serviceId: event.target.value } })
          }
          className="input"
        >
          <option value="">Choose a service…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — {formatCurrency(service.startingPrice)} {service.unit}
            </option>
          ))}
        </select>
      </section>

      <section>
        <p className="label">
          Paper type <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAPER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_SPEC', payload: { paperType: type.value } })}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                specs.paperType === type.value
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{type.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{type.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="label">
          Size <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAPER_SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_SPEC', payload: { size: size.value } })}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                specs.size === size.value
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{size.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{size.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <label htmlFor="quantity" className="label">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { quantity: Math.max(1, specs.quantity - 1) },
                })
              }
              className="btn-secondary h-11 w-11 shrink-0 p-0 text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="quantity"
              type="number"
              min={1}
              max={10000}
              value={specs.quantity}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { quantity: Math.max(1, Number(event.target.value) || 1) },
                })
              }
              className="input text-center"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_SPEC', payload: { quantity: specs.quantity + 1 } })}
              className="btn-secondary h-11 w-11 shrink-0 p-0 text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </section>

        <section>
          <p className="label">Colour</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'bw', label: 'Black & White', hint: 'Most economical' },
                { value: 'color', label: 'Colour', hint: 'Full colour print' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  dispatch({ type: 'SET_SPEC', payload: { colorOption: option.value } })
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.colorOption === option.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section>
        <p className="label">Finishing (optional)</p>
        <div className="flex flex-wrap gap-2.5">
          {FINISHING_OPTIONS.map((option) => {
            const active = specs.finishing.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleFinishing(option.value)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                {option.label}
                <span className="ml-1.5 text-xs text-slate-400">
                  +{formatCurrency(option.price)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
