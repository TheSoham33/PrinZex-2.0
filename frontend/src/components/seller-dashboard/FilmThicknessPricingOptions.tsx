'use client';

import type { Dispatch, SetStateAction } from 'react';
import { FILM_THICKNESS_OPTIONS as FILM_THICKNESS_OPTIONS_FALLBACK } from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import {
  OptionGrid,
  type PriceOptions,
} from '@/components/seller-dashboard/SpiralBindingCustomizationPricing';

interface FilmThicknessPricingOptionsProps {
  values: PriceOptions;
  setValues: Dispatch<SetStateAction<PriceOptions>>;
  onSave: () => void;
  saving: boolean;
}

/**
 * Lamination film thickness is a mandatory customer choice (80 micron is the
 * always-available free default). Sellers price each thicker film per
 * laminated sheet; films they don't toggle stay hidden from that store.
 */
export default function FilmThicknessPricingOptions({
  values,
  setValues,
  onSave,
  saving,
}: FilmThicknessPricingOptionsProps) {
  const filmThicknessOptions = useCatalogOptions('film-thickness', FILM_THICKNESS_OPTIONS_FALLBACK);
  // 'micron-80' is the mandatory free default — only thicker films are priced.
  const pricedOptions = filmThicknessOptions.filter((option) => option.value !== 'micron-80');

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Film thickness prices
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Every Lamination order picks a film thickness. 80 micron is always
          free; set a per-sheet price for each film you offer.
        </p>
      </div>

      <OptionGrid
        title="Film thicknesses"
        description="Set the extra charge per laminated sheet for each film."
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
          {saving ? 'Saving...' : 'Save film prices'}
        </button>
      </div>
    </div>
  );
}
