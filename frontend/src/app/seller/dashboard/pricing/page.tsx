'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSellerPricing, updateBulkPrices, updateBulkDiscounts, updatePricingOverrides } from '@/lib/api/seller-inventory';
import {
  type BulkTier,
  type SellerPricingEntry,
} from '@/lib/domain/seller-inventory';
import {
  COVER_COLORS,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
} from '@/lib/domain/stores';
import PricingEditor from '@/components/seller-dashboard/PricingEditor';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconPencil, IconRefreshCw } from '@/components/icons';

export default function SellerPricingPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-pricing'],
    queryFn: fetchSellerPricing,
  });

  const [pricing, setPricing] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [pageRate, setPageRate] = useState<{ bw: string; color: string }>({ bw: '', color: '' });
  // Each option carries an "offered" toggle + its extra price. Only offered
  // options are saved (and shown to customers on the store).
  const [coverTypeOptions, setCoverTypeOptions] = useState<Record<string, { price: string; enabled: boolean }>>({});
  const [coilOptions, setCoilOptions] = useState<Record<string, { price: string; enabled: boolean }>>({});
  const [coverColorOptions, setCoverColorOptions] = useState<Record<string, { price: string; enabled: boolean }>>({});

  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [tierDraft, setTierDraft] = useState('');

  useEffect(() => {
    if (data) {
      setPricing(data.services || []);
      setTiers(data.bulkDiscountTiers || []);
      
      const overrides = (data as any).pricingOverrides || {};

      const documentPrinting = (data.services || []).find(
        (service: any) => service.serviceId === 'doc-print',
      );
      setPageRate({
        // The Document Printing base price is the canonical B&W page price.
        bw: String(documentPrinting?.basePrice ?? overrides.pageRate?.bw ?? ''),
        color: String(overrides.pageRate?.color ?? ''),
      });

      const coverType = overrides.coverType ?? {};
      const ct: Record<string, { price: string; enabled: boolean }> = {};
      SPIRAL_COVER_TYPES.forEach(c => {
        ct[c.value] = {
          price: String(coverType[c.value] ?? ''),
          enabled: coverType[c.value] !== undefined,
        };
      });
      setCoverTypeOptions(ct);

      const coilType = overrides.coilType ?? {};
      const cl: Record<string, { price: string; enabled: boolean }> = {};
      SPIRAL_COIL_TYPES.forEach(c => {
        cl[c.value] = {
          price: String(coilType[c.value] ?? ''),
          enabled: coilType[c.value] !== undefined,
        };
      });
      setCoilOptions(cl);

      const coverColor = overrides.coverColor ?? {};
      const cc: Record<string, { price: string; enabled: boolean }> = {};
      COVER_COLORS.forEach(c => {
        cc[c.value] = {
          price: String(coverColor[c.value] ?? ''),
          enabled: coverColor[c.value] !== undefined,
        };
      });
      setCoverColorOptions(cc);
    }
  }, [data]);

  const updatePriceMutation = useMutation({
    mutationFn: updateBulkPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
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

  const updateOverridesMutation = useMutation({
    mutationFn: updatePricingOverrides,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Specifications pricing saved');
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

  const handleSaveOverrides = () => {
    const pageRatePayload = {
      bw: Number(pageRate.bw) || 0,
      color: Number(pageRate.color) || 0,
    };

    const coverType: Record<string, number> = {};
    Object.entries(coverTypeOptions).forEach(([k, v]) => {
      if (v.enabled) coverType[k] = Number(v.price) || 0;
    });

    const coilType: Record<string, number> = {};
    Object.entries(coilOptions).forEach(([k, v]) => {
      if (v.enabled) coilType[k] = Number(v.price) || 0;
    });

    const coverColor: Record<string, number> = {};
    Object.entries(coverColorOptions).forEach(([k, v]) => {
      if (v.enabled) coverColor[k] = Number(v.price) || 0;
    });

    updateOverridesMutation.mutate({
      pageRate: pageRatePayload,
      coverType,
      coilType,
      coverColor,
    });
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
    <div className="mx-auto max-w-3xl pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set your base rates, specification add-ons, and bulk discounts.
        </p>
      </header>

      {/* Service Rates */}
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Service base rates</h2>
        </div>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-slate-100" />
        ) : (
          pricing.map((entry) => (
            <div key={entry.id} className="border-b border-slate-100 last:border-0">
              <PricingEditor
                entry={{
                  serviceId: entry.id,
                  serviceName: entry.serviceName,
                  basePrice: Number(entry.basePrice),
                  unit: entry.unit
                }}
                onSave={savePrice}
              />

              {entry.serviceId === 'doc-print' && (
                <div className="border-t border-slate-100 bg-blue-50/40 px-4 py-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Document printing prices</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      The base price and B&amp;W printing price always stay the same.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      B&amp;W printing
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={pageRate.bw}
                          onChange={(event) => setPageRate((current) => ({ ...current, bw: event.target.value }))}
                          className="input w-28 py-1 pl-6 text-right text-sm"
                        />
                      </div>
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      Color printing
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={pageRate.color}
                          onChange={(event) => setPageRate((current) => ({ ...current, color: event.target.value }))}
                          className="input w-28 py-1 pl-6 text-right text-sm"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveOverrides}
                      disabled={updateOverridesMutation.isPending}
                      className="btn-primary py-1.5 text-xs"
                    >
                      {updateOverridesMutation.isPending ? 'Saving...' : 'Save printing prices'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Spiral Binding customization prices */}
      {pricing.some((entry) => entry.serviceId === 'bind-spiral') && (
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Spiral Binding customization prices</h2>
          <button 
            onClick={handleSaveOverrides}
            disabled={updateOverridesMutation.isPending}
            className="btn-primary text-xs py-1"
          >
            {updateOverridesMutation.isPending ? 'Saving...' : 'Save All Overrides'}
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Binding — cover type (offer toggle + ₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Cover types</h3>
            <p className="text-xs text-slate-400 mb-3">Toggle which cover types you offer for Spiral Binding and set the extra charge for each.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SPIRAL_COVER_TYPES.map(cover => {
                const opt = coverTypeOptions[cover.value] ?? { price: '', enabled: false };
                return (
                  <div key={cover.value} className="flex items-center justify-between gap-3">
                    <span className={`text-sm ${opt.enabled ? 'text-slate-600' : 'text-slate-400'}`}>{cover.label}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={opt.price} 
                        disabled={!opt.enabled}
                        onChange={(e) => setCoverTypeOptions(p => ({ ...p, [cover.value]: { ...opt, price: e.target.value } }))}
                        className="input w-24 py-1 text-right text-sm disabled:opacity-40"
                      />
                      <ToggleSwitch
                        checked={opt.enabled}
                        label={`Offer ${cover.label}`}
                        hideLabel
                        onChange={(value) => setCoverTypeOptions(p => ({ ...p, [cover.value]: { ...opt, enabled: value } }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Binding — coil type (offer toggle + ₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Coil types</h3>
            <p className="text-xs text-slate-400 mb-3">Spiral binding — toggle which coils you offer and set the extra charge.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SPIRAL_COIL_TYPES.map(coil => {
                const opt = coilOptions[coil.value] ?? { price: '', enabled: false };
                return (
                  <div key={coil.value} className="flex items-center justify-between gap-3">
                    <span className={`text-sm ${opt.enabled ? 'text-slate-600' : 'text-slate-400'}`}>{coil.label}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={opt.price} 
                        disabled={!opt.enabled}
                        onChange={(e) => setCoilOptions(p => ({ ...p, [coil.value]: { ...opt, price: e.target.value } }))}
                        className="input w-24 py-1 text-right text-sm disabled:opacity-40"
                      />
                      <ToggleSwitch
                        checked={opt.enabled}
                        label={`Offer ${coil.label}`}
                        hideLabel
                        onChange={(value) => setCoilOptions(p => ({ ...p, [coil.value]: { ...opt, enabled: value } }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Binding — cover colour (offer toggle + ₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Cover colours</h3>
            <p className="text-xs text-slate-400 mb-3">Spiral Binding — toggle which cover colours you offer and set the extra charge.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COVER_COLORS.map(color => {
                const opt = coverColorOptions[color.value] ?? { price: '', enabled: false };
                return (
                  <div key={color.value} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded-full border ${color.class}`} />
                      <span className={`text-sm ${opt.enabled ? 'text-slate-600' : 'text-slate-400'}`}>{color.label}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={opt.price} 
                        disabled={!opt.enabled}
                        onChange={(e) => setCoverColorOptions(p => ({ ...p, [color.value]: { ...opt, price: e.target.value } }))}
                        className="input w-24 py-1 text-right text-sm disabled:opacity-40"
                      />
                      <ToggleSwitch
                        checked={opt.enabled}
                        label={`Offer ${color.label}`}
                        hideLabel
                        onChange={(value) => setCoverColorOptions(p => ({ ...p, [color.value]: { ...opt, enabled: value } }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Bulk Discounts */}
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Bulk order discounts</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-2.5">Quantity range</th>
              <th scope="col" className="px-4 py-2.5">Discount</th>
              <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const isEditing = editingTier === index;
              const nextTier = tiers[index + 1];
              const displayMax = tier.maxQty || (nextTier ? nextTier.minQty - 1 : null);

              return (
                <tr key={tier.minQty} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {displayMax === null ? `${tier.minQty}+ units` : `${tier.minQty}–${displayMax} units`}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          id={`tier-${index}`}
                          type="number"
                          min={0}
                          max={100}
                          value={tierDraft}
                          onChange={(e) => setTierDraft(e.target.value)}
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
                        <button type="button" onClick={() => saveTier(index)} className="btn-primary text-xs">Save</button>
                        <button type="button" onClick={() => setEditingTier(null)} className="btn-secondary text-xs">Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setTierDraft(String(tier.discountPct)); setEditingTier(index); }}
                        className="btn-secondary text-xs"
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
    </div>
  );
}
