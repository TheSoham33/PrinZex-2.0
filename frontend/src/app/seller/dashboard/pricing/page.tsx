'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSellerPricing, updateBulkPrices, updateBulkDiscounts } from '@/lib/api/seller-inventory';
import {
  type BulkTier,
  type SellerPricingEntry,
} from '@/lib/mock-data/seller-inventory';
import PricingEditor from '@/components/seller-dashboard/PricingEditor';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconPencil, IconRefreshCw, IconZap } from '@/components/icons';

export default function SellerPricingPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-pricing'],
    queryFn: fetchSellerPricing,
  });

  const [pricing, setPricing] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [editingTier, setEditingTier] = useState<number | null>(null); // Use index as ID if needed or minQty
  const [tierDraft, setTierDraft] = useState('');
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPct, setRushPct] = useState('25');

  useEffect(() => {
    if (data) {
      setPricing(data.services || []);
      setTiers(data.bulkDiscountTiers || []);
    }
  }, [data]);

  const updatePriceMutation = useMutation({
    mutationFn: updateBulkPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      showToast('Price updated');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const updateTiersMutation = useMutation({
    mutationFn: updateBulkDiscounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      showToast('Bulk discount updated');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const savePrice = (serviceId: string, basePrice: number, unit: string) => {
    updatePriceMutation.mutate([{ serviceId, basePrice, unit }]);
  };

  const saveTier = (index: number) => {
    const parsed = Number(tierDraft);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      const nextTiers = tiers.map((tier, i) => 
        i === index ? { ...tier, discountPct: parsed } : { minQty: tier.minQty, discountPct: tier.discountPct }
      );
      updateTiersMutation.mutate(nextTiers);
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
            <PricingEditor 
              key={entry.id} 
              entry={{
                serviceId: entry.id,
                serviceName: entry.serviceName,
                basePrice: Number(entry.basePrice),
                unit: entry.unit
              }} 
              onSave={savePrice} 
            />
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
            {tiers.map((tier, index) => {
              const isEditing = editingTier === index;
              // Determine maxQty for display if not present in real data
              const nextTier = tiers[index + 1];
              const displayMax = tier.maxQty || (nextTier ? nextTier.minQty - 1 : null);

              return (
                <tr key={tier.minQty} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {displayMax === null
                      ? `${tier.minQty}+ units`
                      : `${tier.minQty}–${displayMax} units`}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`tier-${index}`} className="sr-only">
                          Discount percentage for {tier.minQty} units and up
                        </label>
                        <input
                          id={`tier-${index}`}
                          type="number"
                          min={0}
                          max={100}
                          value={tierDraft}
                          onChange={(event) => setTierDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveTier(index);
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
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveTier(index)}
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
                          setEditingTier(index);
                        }}
                        className="btn-secondary text-xs"
                        aria-label={`Edit discount for ${tier.minQty} units and up`}
                      >
                        <IconPencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
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
