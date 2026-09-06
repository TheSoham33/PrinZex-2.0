'use client';

import type { Dispatch, SetStateAction } from 'react';
import { PHOTO_TYPES as PHOTO_TYPES_FALLBACK } from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import {
  OptionGrid,
  type PriceOptions,
} from '@/components/seller-dashboard/SpiralBindingCustomizationPricing';

interface PhotoTypePricingOptionsProps {
  values: PriceOptions;
  setValues: Dispatch<SetStateAction<PriceOptions>>;
  onSave: () => void;
  saving: boolean;
}

/**
 * Photo Print photo type is a mandatory customer choice (passport photo,
 * postcard size, …). Sellers tick the photo types they can print and set a
 * per-photo price for each; unticked types stay hidden from their store.
 * Photos-per-sheet layouts (2/4/6/8) come from the admin catalogue — the
 * seller only chooses availability and price, exactly like film thickness.
 */
export default function PhotoTypePricingOptions({
  values,
  setValues,
  onSave,
  saving,
}: PhotoTypePricingOptionsProps) {
  const photoTypes = useCatalogOptions('photo-types', PHOTO_TYPES_FALLBACK);

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Photo type prices</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Every Photo Print order picks a photo type and a photos-per-sheet
          layout; the customer pays rate × photos-per-sheet per sheet. Tick the
          photo types you offer and set your price per printed photo.
        </p>
      </div>

      <OptionGrid
        title="Photo types"
        description="Set your charge per printed photo for each type."
        options={photoTypes.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.hint,
        }))}
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
          {saving ? 'Saving...' : 'Save photo prices'}
        </button>
      </div>
    </div>
  );
}
