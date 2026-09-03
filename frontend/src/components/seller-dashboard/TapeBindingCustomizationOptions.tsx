'use client';

import { TAPE_COLORS as TAPE_COLORS_FALLBACK } from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

interface TapeBindingCustomizationOptionsProps {
  values: string[];
  onChange: (values: string[]) => void;
  onSave: () => void;
  saving: boolean;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

/**
 * Tape Binding tape colours are availability-only (no surcharge, like Hard
 * Binding fabrics): the seller toggles which catalogue colours the store
 * offers. At least one must stay on — the customer always picks a colour.
 */
export default function TapeBindingCustomizationOptions({
  values,
  onChange,
  onSave,
  saving,
}: TapeBindingCustomizationOptionsProps) {
  const tapeColorOptions = useCatalogOptions('tape-colors', TAPE_COLORS_FALLBACK);

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Tape Binding customization options
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Select the tape colours customers can choose for Tape Binding.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Tape colours
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tapeColorOptions.map((color) => {
            const enabled = values.includes(color.value);
            return (
              <div
                key={color.value}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-slate-200"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span
                    className={`text-sm ${enabled ? 'text-slate-600' : 'text-slate-400'}`}
                  >
                    {color.label}
                  </span>
                </span>
                <ToggleSwitch
                  checked={enabled}
                  label={`Offer ${color.label} tape`}
                  hideLabel
                  onChange={() => onChange(toggle(values, color.value))}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || values.length === 0}
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : 'Save Tape Binding options'}
        </button>
      </div>
    </div>
  );
}
