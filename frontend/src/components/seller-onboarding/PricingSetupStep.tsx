'use client';

import { PRICING_UNITS, type PricingEntry, type PricingUnit } from '@/lib/seller-types';
import { IconAlertCircle, IconPackageOpen } from '@/components/icons';

interface PricingSetupStepProps {
  pricing: PricingEntry[];
  onUpdate: (serviceId: string, patch: Partial<PricingEntry>) => void;
  onSetAllUnits: (unit: PricingUnit) => void;
  error: string | null;
}

export default function PricingSetupStep({
  pricing,
  onUpdate,
  onSetAllUnits,
  error,
}: PricingSetupStepProps) {
  if (pricing.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <IconPackageOpen className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">No services selected</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-600">
          Go back to the previous step and pick the services your shop offers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Set your prices</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your starting price for each service. You can change these any time.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
        <label htmlFor="allUnits" className="text-sm font-medium text-slate-700">
          Quick set all units:
        </label>
        <select
          id="allUnits"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) onSetAllUnits(event.target.value as PricingUnit);
          }}
          className="input max-w-[12rem] py-2 text-sm"
        >
          <option value="">Choose a unit…</option>
          {PRICING_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="hidden grid-cols-[1fr_8rem_10rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid">
          <span>Service</span>
          <span>Base price (₹)</span>
          <span>Unit</span>
        </div>

        <div className="divide-y divide-slate-200">
          {pricing.map((entry) => (
            <div
              key={entry.serviceId}
              className="grid gap-3 p-4 sm:grid-cols-[1fr_8rem_10rem] sm:items-center sm:gap-4"
            >
              <p className="text-sm font-medium text-slate-900">{entry.serviceName}</p>

              <div>
                <label htmlFor={`price-${entry.serviceId}`} className="sr-only">
                  Price for {entry.serviceName}
                </label>
                <input
                  id={`price-${entry.serviceId}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={entry.basePrice || ''}
                  onChange={(event) =>
                    onUpdate(entry.serviceId, { basePrice: Number(event.target.value) })
                  }
                  placeholder="0"
                  className={`input py-2 ${entry.basePrice <= 0 ? 'input-error' : ''}`}
                />
              </div>

              <div>
                <label htmlFor={`unit-${entry.serviceId}`} className="sr-only">
                  Unit for {entry.serviceName}
                </label>
                <select
                  id={`unit-${entry.serviceId}`}
                  value={entry.unit}
                  onChange={(event) =>
                    onUpdate(entry.serviceId, { unit: event.target.value as PricingUnit })
                  }
                  className="input py-2"
                >
                  {PRICING_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Tip: quote your most common job size. Customers see &ldquo;from ₹X&rdquo; on your store card.
      </p>
    </div>
  );
}
