'use client';

import { PAPER_SIZES, PAPER_TYPES } from '@/lib/domain/stores';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

interface PaperCustomizationOptionsProps {
  serviceName: string;
  paperTypePrices: Record<string, number>;
  paperSizePrices: Record<string, number>;
  onPaperTypePricesChange: (values: Record<string, number>) => void;
  onPaperSizePricesChange: (values: Record<string, number>) => void;
  onSave: () => void;
  saving: boolean;
}

interface OptionEditorProps {
  title: string;
  options: ReadonlyArray<{ value: string; label: string; hint: string }>;
  prices: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
}

function OptionEditor({ title, options, prices, onChange }: OptionEditorProps) {
  return (
    <div className="border-t border-slate-100 pt-5 first:border-0 first:pt-0">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const enabled = Object.prototype.hasOwnProperty.call(
            prices,
            option.value,
          );
          return (
            <div
              key={option.value}
              className="flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span
                  className={`block text-sm ${enabled ? 'text-slate-700' : 'text-slate-400'}`}
                >
                  {option.label}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {option.hint}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!enabled}
                    value={enabled ? prices[option.value] : ''}
                    onChange={(event) =>
                      onChange({
                        ...prices,
                        [option.value]: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    aria-label={`${option.label} extra price`}
                    className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
                  />
                </div>
                <ToggleSwitch
                  checked={enabled}
                  label={`Offer ${option.label}`}
                  hideLabel
                  onChange={(nextEnabled) => {
                    if (nextEnabled) onChange({ ...prices, [option.value]: 0 });
                    else {
                      const next = { ...prices };
                      delete next[option.value];
                      onChange(next);
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PaperCustomizationOptions({
  serviceName,
  paperTypePrices,
  paperSizePrices,
  onPaperTypePricesChange,
  onPaperSizePricesChange,
  onSave,
  saving,
}: PaperCustomizationOptionsProps) {
  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {serviceName} paper options
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose the paper options offered for this service and set each
          additional price.
        </p>
      </div>

      <OptionEditor
        title="Paper types"
        options={PAPER_TYPES}
        prices={paperTypePrices}
        onChange={onPaperTypePricesChange}
      />
      <OptionEditor
        title="Paper sizes"
        options={PAPER_SIZES}
        prices={paperSizePrices}
        onChange={onPaperSizePricesChange}
      />

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={
            saving ||
            Object.keys(paperTypePrices).length === 0 ||
            Object.keys(paperSizePrices).length === 0
          }
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : `Save ${serviceName} paper options`}
        </button>
      </div>
    </div>
  );
}
