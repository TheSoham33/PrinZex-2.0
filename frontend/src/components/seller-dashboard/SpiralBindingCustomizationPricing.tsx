'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  COVER_COLORS as COVER_COLORS_FALLBACK,
  SPIRAL_COIL_TYPES as SPIRAL_COIL_TYPES_FALLBACK,
  SPIRAL_COVER_TYPES as SPIRAL_COVER_TYPES_FALLBACK,
} from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

type PriceOption = { price: string; enabled: boolean };
type PriceOptions = Record<string, PriceOption>;

interface SpiralBindingCustomizationPricingProps {
  coverTypeOptions: PriceOptions;
  setCoverTypeOptions: Dispatch<SetStateAction<PriceOptions>>;
  coilOptions: PriceOptions;
  setCoilOptions: Dispatch<SetStateAction<PriceOptions>>;
  coverColorOptions: PriceOptions;
  setCoverColorOptions: Dispatch<SetStateAction<PriceOptions>>;
  onSave: () => void;
  saving: boolean;
}

interface OptionGridProps {
  title: string;
  description: string;
  options: ReadonlyArray<{ value: string; label: string; class?: string }>;
  values: PriceOptions;
  setValues: Dispatch<SetStateAction<PriceOptions>>;
  showColorSwatch?: boolean;
}

function OptionGrid({
  title,
  description,
  options,
  values,
  setValues,
  showColorSwatch = false,
}: OptionGridProps) {
  return (
    <div className="border-t border-slate-100 pt-5 first:border-0 first:pt-0">
      <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h4>
      <p className="mb-3 text-xs text-slate-400">{description}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const current = values[option.value] ?? { price: '', enabled: false };
          return (
            <div
              key={option.value}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                {showColorSwatch && (
                  <span
                    className={`h-4 w-4 rounded-full border ${option.class ?? ''}`}
                  />
                )}
                <span
                  className={`text-sm ${current.enabled ? 'text-slate-600' : 'text-slate-400'}`}
                >
                  {option.label}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={current.price}
                    disabled={!current.enabled}
                    onChange={(event) =>
                      setValues((previous) => ({
                        ...previous,
                        [option.value]: {
                          ...current,
                          price: event.target.value,
                        },
                      }))
                    }
                    aria-label={`${option.label} extra price`}
                    className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
                  />
                </div>
                <ToggleSwitch
                  checked={current.enabled}
                  label={`Offer ${option.label}`}
                  hideLabel
                  onChange={(enabled) =>
                    setValues((previous) => ({
                      ...previous,
                      [option.value]: { ...current, enabled },
                    }))
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SpiralBindingCustomizationPricing({
  coverTypeOptions,
  setCoverTypeOptions,
  coilOptions,
  setCoilOptions,
  coverColorOptions,
  setCoverColorOptions,
  onSave,
  saving,
}: SpiralBindingCustomizationPricingProps) {
  const coverColors = useCatalogOptions('cover-colors', COVER_COLORS_FALLBACK);
  const spiralCoilTypes = useCatalogOptions('spiral-coil-types', SPIRAL_COIL_TYPES_FALLBACK);
  const spiralCoverTypes = useCatalogOptions('spiral-cover-types', SPIRAL_COVER_TYPES_FALLBACK);
  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Spiral Binding customization prices
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose the Spiral Binding options you offer and set each extra price.
        </p>
      </div>

      <OptionGrid
        title="Cover types"
        description="Set the extra charge for each Spiral Binding cover type."
        options={spiralCoverTypes}
        values={coverTypeOptions}
        setValues={setCoverTypeOptions}
      />
      <OptionGrid
        title="Coil types"
        description="Set the extra charge for each available spiral coil."
        options={spiralCoilTypes}
        values={coilOptions}
        setValues={setCoilOptions}
      />
      <OptionGrid
        title="Cover colours"
        description="Set the extra charge for each available cover colour."
        options={coverColors}
        values={coverColorOptions}
        setValues={setCoverColorOptions}
        showColorSwatch
      />

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : 'Save Spiral Binding prices'}
        </button>
      </div>
    </div>
  );
}
