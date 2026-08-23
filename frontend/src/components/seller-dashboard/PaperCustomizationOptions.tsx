'use client';

import { PAPER_SIZES, PAPER_TYPES } from '@/lib/domain/stores';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

interface PaperCustomizationOptionsProps {
  paperTypes: string[];
  paperSizes: string[];
  onPaperTypesChange: (values: string[]) => void;
  onPaperSizesChange: (values: string[]) => void;
  onSave: () => void;
  saving: boolean;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function PaperCustomizationOptions({
  paperTypes,
  paperSizes,
  onPaperTypesChange,
  onPaperSizesChange,
  onSave,
  saving,
}: PaperCustomizationOptionsProps) {
  return (
    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          Paper options for all services
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose the paper types and sizes customers can select for every
          service.
        </p>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Paper types
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAPER_TYPES.map((option) => {
              const enabled = paperTypes.includes(option.value);
              return (
                <div
                  key={option.value}
                  className="flex items-center justify-between gap-3"
                >
                  <span>
                    <span
                      className={`block text-sm ${enabled ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                      {option.label}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {option.hint}
                    </span>
                  </span>
                  <ToggleSwitch
                    checked={enabled}
                    label={`Offer ${option.label}`}
                    hideLabel
                    onChange={() =>
                      onPaperTypesChange(toggle(paperTypes, option.value))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Paper sizes
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAPER_SIZES.map((option) => {
              const enabled = paperSizes.includes(option.value);
              return (
                <div
                  key={option.value}
                  className="flex items-center justify-between gap-3"
                >
                  <span>
                    <span
                      className={`block text-sm ${enabled ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                      {option.label}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {option.hint}
                    </span>
                  </span>
                  <ToggleSwitch
                    checked={enabled}
                    label={`Offer ${option.label}`}
                    hideLabel
                    onChange={() =>
                      onPaperSizesChange(toggle(paperSizes, option.value))
                    }
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
            disabled={
              saving || paperTypes.length === 0 || paperSizes.length === 0
            }
            className="btn-primary py-1.5 text-xs"
          >
            {saving ? 'Saving...' : 'Save paper options'}
          </button>
        </div>
      </div>
    </section>
  );
}
