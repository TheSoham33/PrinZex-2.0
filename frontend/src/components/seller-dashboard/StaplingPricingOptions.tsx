'use client';

import type { Dispatch, SetStateAction } from 'react';
import { STAPLING_OPTIONS as STAPLING_OPTIONS_FALLBACK } from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import {
  OptionGrid,
  type PriceOptions,
} from '@/components/seller-dashboard/SpiralBindingCustomizationPricing';

interface StaplingPricingOptionsProps {
  values: PriceOptions;
  setValues: Dispatch<SetStateAction<PriceOptions>>;
  onSave: () => void;
  saving: boolean;
}

/**
 * Document Printing stapling is a mandatory customer choice (Loose Sheet is
 * the always-available free default). Sellers price each remaining style per
 * document set; styles they don't toggle stay hidden from that store.
 */
export default function StaplingPricingOptions({
  values,
  setValues,
  onSave,
  saving,
}: StaplingPricingOptionsProps) {
  const staplingOptions = useCatalogOptions('stapling-options', STAPLING_OPTIONS_FALLBACK);
  // 'loose' is the mandatory free default — only add-on styles are priced.
  const pricedOptions = staplingOptions.filter((option) => option.value !== 'loose');

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Stapling / binding prices
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Every Document Printing order picks a stapling option. Loose Sheet
          is always free; set a per-set price for each style you offer.
        </p>
      </div>

      <OptionGrid
        title="Stapling styles"
        description="Set the extra charge per document set for each stapling style."
        options={pricedOptions}
        values={values}
        setValues={setValues}
      />

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : 'Save stapling prices'}
        </button>
      </div>
    </div>
  );
}
