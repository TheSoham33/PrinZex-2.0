'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSellerPricing, updateBulkPrices, updateBulkDiscounts, updatePricingOverrides } from '@/lib/api/seller-inventory';
import {
  type BulkTier,
  type SellerPricingEntry,
} from '@/lib/mock-data/seller-inventory';
import {
  PAPER_TYPES,
  PAPER_SIZES,
  BINDING_CORNER_SIZES,
  COVER_COLORS,
  COVER_TYPES,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
} from '@/lib/mock-data/stores';
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
  const [paperPrices, setPaperPrices] = useState<Record<string, string>>({});
  const [sizePrices, setSizePrices] = useState<Record<string, string>>({});
  const [colorPrices, setColorPrices] = useState<Record<string, string>>({ bw: '0', color: '0' });
  const [cornerPrices, setCornerPrices] = useState<Record<string, string>>({});
  const [coverTypePrices, setCoverTypePrices] = useState<Record<string, string>>({});
  const [coilPrices, setCoilPrices] = useState<Record<string, string>>({});
  const [coverColorPrices, setCoverColorPrices] = useState<Record<string, string>>({});

  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [tierDraft, setTierDraft] = useState('');
  const [rushEnabled, setRushEnabled] = useState(true);
  const [rushPct, setRushPct] = useState('25');

  useEffect(() => {
    if (data) {
      setPricing(data.services || []);
      setTiers(data.bulkDiscountTiers || []);
      
      const overrides = (data as any).pricingOverrides || {};
      const pp: Record<string, string> = {};
      PAPER_TYPES.forEach(t => pp[t.value] = String(overrides.paperType?.[t.value] || '0'));
      setPaperPrices(pp);

      const sp: Record<string, string> = {};
      PAPER_SIZES.forEach(s => sp[s.value] = String(overrides.size?.[s.value] || '0'));
      setSizePrices(sp);

      setColorPrices({
        bw: String(overrides.colorOption?.bw || '0'),
        color: String(overrides.colorOption?.color || '0')
      });

      const cp: Record<string, string> = {};
      BINDING_CORNER_SIZES.forEach(c => cp[c.value] = String(overrides.pageCornerSize?.[c.value] || '0'));
      setCornerPrices(cp);

      const ct: Record<string, string> = {};
      [...SPIRAL_COVER_TYPES, ...COVER_TYPES].forEach(c => ct[c.value] = String(overrides.coverType?.[c.value] || '0'));
      setCoverTypePrices(ct);

      const cl: Record<string, string> = {};
      SPIRAL_COIL_TYPES.forEach(c => cl[c.value] = String(overrides.coilType?.[c.value] || '0'));
      setCoilPrices(cl);

      const cc: Record<string, string> = {};
      COVER_COLORS.forEach(c => cc[c.value] = String(overrides.coverColor?.[c.value] || '0'));
      setCoverColorPrices(cc);
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

  const updateOverridesMutation = useMutation({
    mutationFn: updatePricingOverrides,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
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
    const paperType: Record<string, number> = {};
    Object.entries(paperPrices).forEach(([k, v]) => paperType[k] = Number(v));

    const size: Record<string, number> = {};
    Object.entries(sizePrices).forEach(([k, v]) => size[k] = Number(v));

    const colorOption = {
      bw: Number(colorPrices.bw),
      color: Number(colorPrices.color)
    };

    const pageCornerSize: Record<string, number> = {};
    Object.entries(cornerPrices).forEach(([k, v]) => pageCornerSize[k] = Number(v));

    const coverType: Record<string, number> = {};
    Object.entries(coverTypePrices).forEach(([k, v]) => coverType[k] = Number(v));

    const coilType: Record<string, number> = {};
    Object.entries(coilPrices).forEach(([k, v]) => coilType[k] = Number(v));

    const coverColor: Record<string, number> = {};
    Object.entries(coverColorPrices).forEach(([k, v]) => coverColor[k] = Number(v));

    updateOverridesMutation.mutate({
      paperType,
      size,
      colorOption,
      pageCornerSize,
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

      {/* Specification Overrides */}
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Specification & Binding Add-ons</h2>
          <button 
            onClick={handleSaveOverrides}
            disabled={updateOverridesMutation.isPending}
            className="btn-primary text-xs py-1"
          >
            {updateOverridesMutation.isPending ? 'Saving...' : 'Save All Overrides'}
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Paper Types */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Paper Type Extra (₹)</h3>
            <div className="grid grid-cols-2 gap-4">
              {PAPER_TYPES.map(type => (
                <div key={type.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{type.label}</span>
                  <input 
                    type="number" 
                    value={paperPrices[type.value] || '0'} 
                    onChange={(e) => setPaperPrices(p => ({ ...p, [type.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Size Extra (₹)</h3>
            <div className="grid grid-cols-2 gap-4">
              {PAPER_SIZES.map(size => (
                <div key={size.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{size.label}</span>
                  <input 
                    type="number" 
                    value={sizePrices[size.value] || '0'} 
                    onChange={(e) => setSizePrices(p => ({ ...p, [size.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Color Option Extra (₹)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">B&W</span>
                <input 
                  type="number" 
                  value={colorPrices.bw} 
                  onChange={(e) => setColorPrices(p => ({ ...p, bw: e.target.value }))}
                  className="input w-24 py-1 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">Colour</span>
                <input 
                  type="number" 
                  value={colorPrices.color} 
                  onChange={(e) => setColorPrices(p => ({ ...p, color: e.target.value }))}
                  className="input w-24 py-1 text-right text-sm"
                />
              </div>
            </div>
          </div>

          {/* Binding pages — page corner size (₹/page) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Page Corner Size Extra (₹/page)</h3>
            <p className="text-xs text-slate-400 mb-3">Binding services only — added to the per-page price.</p>
            <div className="grid grid-cols-2 gap-4">
              {BINDING_CORNER_SIZES.map(corner => (
                <div key={corner.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{corner.label}</span>
                  <input 
                    type="number" 
                    value={cornerPrices[corner.value] || '0'} 
                    onChange={(e) => setCornerPrices(p => ({ ...p, [corner.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Binding — cover type (₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Cover Type Extra (₹/binding)</h3>
            <p className="text-xs text-slate-400 mb-3">Binding services only — added per binding.</p>
            <div className="grid grid-cols-2 gap-4">
              {[...SPIRAL_COVER_TYPES, ...COVER_TYPES].map(cover => (
                <div key={cover.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{cover.label}</span>
                  <input 
                    type="number" 
                    value={coverTypePrices[cover.value] || '0'} 
                    onChange={(e) => setCoverTypePrices(p => ({ ...p, [cover.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Binding — coil type (₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Coil Type Extra (₹/binding)</h3>
            <p className="text-xs text-slate-400 mb-3">Spiral binding — added per binding.</p>
            <div className="grid grid-cols-2 gap-4">
              {SPIRAL_COIL_TYPES.map(coil => (
                <div key={coil.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{coil.label}</span>
                  <input 
                    type="number" 
                    value={coilPrices[coil.value] || '0'} 
                    onChange={(e) => setCoilPrices(p => ({ ...p, [coil.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Binding — cover colour (₹/binding) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Cover Colour Extra (₹/binding)</h3>
            <p className="text-xs text-slate-400 mb-3">Binding services only — added per binding.</p>
            <div className="grid grid-cols-2 gap-4">
              {COVER_COLORS.map(color => (
                <div key={color.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{color.label}</span>
                  <input 
                    type="number" 
                    value={coverColorPrices[color.value] || '0'} 
                    onChange={(e) => setCoverColorPrices(p => ({ ...p, [color.value]: e.target.value }))}
                    className="input w-24 py-1 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
