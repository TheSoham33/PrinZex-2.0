'use client';

import { COVER_COLORS, COVER_TEXT_COLORS } from '@/lib/domain/stores';

interface HardBindingCustomizationOptionsProps {
  coverColors: string[];
  foilColors: string[];
  onCoverColorsChange: (values: string[]) => void;
  onFoilColorsChange: (values: string[]) => void;
  onSave: () => void;
  saving: boolean;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function HardBindingCustomizationOptions({
  coverColors,
  foilColors,
  onCoverColorsChange,
  onFoilColorsChange,
  onSave,
  saving,
}: HardBindingCustomizationOptionsProps) {
  const foilOptions = COVER_TEXT_COLORS.filter(
    (color) => color.value !== 'white',
  );

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Hard Binding customization options
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Select the cover fabrics and foil font colours customers can choose.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Cover fabrics
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COVER_COLORS.map((color) => (
            <label
              key={color.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <input
                type="checkbox"
                checked={coverColors.includes(color.value)}
                onChange={() =>
                  onCoverColorsChange(toggle(coverColors, color.value))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`h-4 w-4 rounded-full border ${color.class}`} />
              <span className="text-sm font-medium text-slate-700">
                {color.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Font foil colours
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {foilOptions.map((color) => (
            <label
              key={color.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <input
                type="checkbox"
                checked={foilColors.includes(color.value)}
                onChange={() =>
                  onFoilColorsChange(toggle(foilColors, color.value))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`h-4 w-4 rounded-full border ${color.class}`} />
              <span className="text-sm font-medium text-slate-700">
                {color.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={
            saving || coverColors.length === 0 || foilColors.length === 0
          }
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : 'Save Hard Binding options'}
        </button>
      </div>
    </div>
  );
}
