'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  COVER_COLORS,
  COVER_TYPES,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
} from '@/lib/domain/stores';
import ToggleSwitch from './ToggleSwitch';

export interface PriceOption {
  price: string;
  enabled: boolean;
}

type OptionState = Record<string, PriceOption>;

interface ServiceCustomizationPricingProps {
  catalogServiceId: string;
  basePrice: number;
  pageRate: { bw: string; color: string };
  setPageRate: Dispatch<SetStateAction<{ bw: string; color: string }>>;
  coverTypeOptions: OptionState;
  setCoverTypeOptions: Dispatch<SetStateAction<OptionState>>;
  coilOptions: OptionState;
  setCoilOptions: Dispatch<SetStateAction<OptionState>>;
  coverColorOptions: OptionState;
  setCoverColorOptions: Dispatch<SetStateAction<OptionState>>;
  onSave: () => void;
  saving: boolean;
}

function OptionPriceGrid({
  title,
  description,
  options,
  values,
  setValues,
}: {
  title: string;
  description: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  values: OptionState;
  setValues: Dispatch<SetStateAction<OptionState>>;
}) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h4>
      <p className="mb-3 mt-1 text-xs text-slate-400">{description}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const current = values[option.value] ?? { price: '', enabled: false };
          return (
            <div
              key={option.value}
              className="flex items-center justify-between gap-3"
            >
              <span
                className={`text-sm ${current.enabled ? 'text-slate-700' : 'text-slate-400'}`}
              >
                {option.label}
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
                    className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
                    aria-label={`${option.label} extra price`}
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

export default function ServiceCustomizationPricing({
  catalogServiceId,
  basePrice,
  pageRate,
  setPageRate,
  coverTypeOptions,
  setCoverTypeOptions,
  coilOptions,
  setCoilOptions,
  coverColorOptions,
  setCoverColorOptions,
  onSave,
  saving,
}: ServiceCustomizationPricingProps) {
  const isDocumentPrinting = catalogServiceId === 'doc-print';
  const isSpiralBinding = catalogServiceId === 'bind-spiral';
  const isOtherBinding =
    catalogServiceId === 'bind-hard' || catalogServiceId === 'bind-perfect';
  const hasCustomizations =
    isDocumentPrinting || isSpiralBinding || isOtherBinding;

  if (!hasCustomizations) return null;

  return (
    <div className="space-y-5 border-t border-slate-200 bg-slate-50/50 px-4 py-4">
      {isDocumentPrinting && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Printing prices (₹/page)
          </h4>
          <p className="mb-3 mt-1 text-xs text-slate-400">
            The Document Printing base price and B&amp;W price are always kept
            the same.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
              B&amp;W page
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  value={basePrice}
                  readOnly
                  title="This value follows the service base price"
                  className="input w-28 bg-slate-100 py-1 pl-6 text-right text-sm text-slate-500"
                />
              </div>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
              Colour page
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pageRate.color}
                  onChange={(event) =>
                    setPageRate((previous) => ({
                      ...previous,
                      color: event.target.value,
                    }))
                  }
                  className="input w-28 py-1 pl-6 text-right text-sm"
                />
              </div>
            </label>
          </div>
        </div>
      )}

      {isSpiralBinding && (
        <>
          <OptionPriceGrid
            title="Cover types"
            description="Choose the spiral cover types offered and set each extra price."
            options={SPIRAL_COVER_TYPES}
            values={coverTypeOptions}
            setValues={setCoverTypeOptions}
          />
          <OptionPriceGrid
            title="Coil types"
            description="Choose the available spiral coils and set each extra price."
            options={SPIRAL_COIL_TYPES}
            values={coilOptions}
            setValues={setCoilOptions}
          />
        </>
      )}

      {isOtherBinding && (
        <OptionPriceGrid
          title="Cover types"
          description="Choose the binding cover types offered and set each extra price."
          options={COVER_TYPES}
          values={coverTypeOptions}
          setValues={setCoverTypeOptions}
        />
      )}

      {(isSpiralBinding || isOtherBinding) && (
        <OptionPriceGrid
          title="Cover colours"
          description="Choose the available cover colours and set each extra price."
          options={COVER_COLORS}
          values={coverColorOptions}
          setValues={setCoverColorOptions}
        />
      )}

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary text-xs"
        >
          {saving ? 'Saving…' : 'Save customisation prices'}
        </button>
      </div>
    </div>
  );
}
