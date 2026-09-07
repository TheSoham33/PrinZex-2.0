'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  PHOTO_TYPES as PHOTO_TYPES_FALLBACK,
  PHOTO_LAYOUTS as PHOTO_LAYOUTS_FALLBACK,
} from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

/** Matrix state: photo type → enabled? + per-count ₹/sheet string inputs. */
export type PhotoComboMatrix = Record<
  string,
  { enabled: boolean; prices: Record<string, string> }
>;

interface PhotoTypePricingOptionsProps {
  values: PhotoComboMatrix;
  setValues: Dispatch<SetStateAction<PhotoComboMatrix>>;
  onSave: () => void;
  saving: boolean;
}

/**
 * Photo Print prices a (photo type × photos-per-sheet) COMBO directly — no
 * per-photo billing. Sellers tick the types they can print and set one
 * ₹-per-sheet price for every photos-per-sheet count they offer (counts
 * themselves are added/deleted by the platform admin in the catalogue).
 * Enabling a type pre-fills the platform default (rate × count); clear a
 * cell to stop offering that count for the type.
 */
export default function PhotoTypePricingOptions({
  values,
  setValues,
  onSave,
  saving,
}: PhotoTypePricingOptionsProps) {
  const photoTypes = useCatalogOptions('photo-types', PHOTO_TYPES_FALLBACK);
  const photoLayouts = useCatalogOptions('photo-layouts', PHOTO_LAYOUTS_FALLBACK);
  const noneOffered = !photoTypes.some((type) => values[type.value]?.enabled);

  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Photo print prices</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          A sheet repeats the customer&apos;s photo 8, 12 (or any count the
          platform admin adds) times. Set one price per sheet for each type +
          count you print — unticked types stay hidden from your store, and a
          cleared price stops that count for the type.
        </p>
      </div>

      {noneOffered && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Your shop offers Photo Print — tick at least one photo type and set
          its price, or saving will be rejected and customers can&apos;t order
          photo prints.
        </p>
      )}

      <div className="space-y-4">
        {photoTypes.map((type) => {
          const current = values[type.value] ?? { enabled: false, prices: {} };
          return (
            <div
              key={type.value}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      current.enabled ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {type.label}
                  </p>
                  {type.hint && (
                    <p className="text-xs text-slate-400">{type.hint}</p>
                  )}
                </div>
                <ToggleSwitch
                  checked={current.enabled}
                  label={`Offer ${type.label}`}
                  hideLabel
                  onChange={(enabled) =>
                    setValues((previous) => ({
                      ...previous,
                      [type.value]: {
                        enabled,
                        prices: enabled
                          ? {
                              // Pre-fill the platform default (rate × count)
                              // so a freshly offered combo is never free.
                              ...Object.fromEntries(
                                photoLayouts.map((layout) => [
                                  layout.value,
                                  current.prices[layout.value] ??
                                    String(type.price * Number(layout.value)),
                                ]),
                              ),
                            }
                          : current.prices,
                      },
                    }))
                  }
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photoLayouts.map((layout) => (
                  <label key={layout.value} className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {layout.value}/sheet
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={current.prices[layout.value] ?? ''}
                        disabled={!current.enabled}
                        placeholder="not offered"
                        onChange={(event) =>
                          setValues((previous) => ({
                            ...previous,
                            [type.value]: {
                              ...current,
                              prices: {
                                ...current.prices,
                                [layout.value]: event.target.value,
                              },
                            },
                          }))
                        }
                        aria-label={`${type.label} price per sheet at ${layout.value} photos`}
                        className="input w-full py-1 pl-6 text-right text-sm disabled:opacity-40"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
