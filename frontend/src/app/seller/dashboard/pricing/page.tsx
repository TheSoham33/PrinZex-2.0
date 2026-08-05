'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerPricing } from '@/lib/api/seller-inventory';
import {
  MOCK_BULK_TIERS,
  type BulkTier,
  type SellerPricingEntry,
} from '@/lib/mock-data/seller-inventory';
import PricingEditor from '@/components/seller-dashboard/PricingEditor';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconPencil, IconRefreshCw, IconZap } from '@/components/icons';

export default function SellerPricingPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-pricing'],
    queryFn: fetchSellerPricing,
  });

  const [pricing, setPricing] = useState<SellerPricingEntry[]>([]);
  const [tiers, setTiers] = useState<BulkTier[]>(MOCK_BULK_TIERS);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierDraft, setTierDraft] = useState('');
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPct, setRushPct] = useState('25');

  useEffect(() => {
    if (data) setPricing(data);
  }, [data]);

  const savePrice = (serviceId: string, basePrice: number, unit: string) => {
    setPricing((previous) =>
      previous.map((entry) =>
        entry.serviceId === serviceId ? { ...entry, basePrice, unit } : entry,
      ),
    );
    showToast('Price updated');
  };

  const saveTier = (id: string) => {
    const parsed = Number(tierDraft);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      setTiers((previous) =>
        previous.map((tier) => (tier.id === id ? { ...tier, discountPct: parsed } : tier)),
      );
      showToast('Bulk discount updated');
    }
    setEditingTier(null);
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load pricing</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set your base rates, bulk discounts and rush premium.
        </p>
      </header>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Service rates</h2>
        </div>

        {isLoading ? (
          <div className="h-72 animate-pulse bg-slate-100" />
        ) : (
          pricing.map((entry) => (
            <PricingEditor key={entry.serviceId} entry={entry} onSave={savePrice} />
          ))
        )}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Bulk order discounts</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Automatically applied when a customer orders in volume.
          </p>
        </div>

        <table className="w-full">
          <caption className="sr-only">Bulk discount tiers by quantity range</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-2.5">
                Quantity range
              </th>
              <th scope="col" className="px-4 py-2.5">
                Discount
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-sm text-slate-700">
                  {tier.maxQty === null
                    ? `${tier.minQty}+ units`
                    : `${tier.minQty}–${tier.maxQty} units`}
                </td>
                <td className="px-4 py-3">
                  {editingTier === tier.id ? (
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`tier-${tier.id}`} className="sr-only">
                        Discount percentage for {tier.minQty} units and up
                      </label>
                      <input
                        id={`tier-${tier.id}`}
                        type="number"
                        min={0}
                        max={100}
                        value={tierDraft}
                        onChange={(event) => setTierDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveTier(tier.id);
                          if (event.key === 'Escape') setEditingTier(null);
                        }}
                        className="input w-20 py-1.5 text-sm"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-900">{tier.discountPct}% off</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingTier === tier.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => saveTier(tier.id)}
                        className="btn-primary text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTier(null)}
                        className="btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTierDraft(String(tier.discountPct));
                        setEditingTier(tier.id);
                      }}
                      className="btn-secondary text-xs"
                      aria-label={`Edit discount for ${tier.minQty} units and up`}
                    >
                      <IconPencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card mt-6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <IconZap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rush order premium</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Charge extra for same-day turnaround jobs.
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={rushEnabled}
            onChange={setRushEnabled}
            label="Enable rush order premium"
            hideLabel
          />
        </div>

        {rushEnabled && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <div className="w-32">
              <label htmlFor="rush-pct" className="label">
                Extra charge
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="rush-pct"
                  type="number"
                  min={0}
                  max={200}
                  value={rushPct}
                  onChange={(event) => setRushPct(event.target.value)}
                  className="input py-2 text-sm"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
            <p className="pb-2.5 text-sm text-slate-600">
              Charge {rushPct || 0}% extra for same-day rush orders.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
