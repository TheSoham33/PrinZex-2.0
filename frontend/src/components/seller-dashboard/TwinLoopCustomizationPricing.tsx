'use client';

import {
  TWIN_LOOP_WIRE_COLORS as TWIN_LOOP_WIRE_COLORS_FALLBACK,
  TWIN_LOOP_FRONT_COVERS as TWIN_LOOP_FRONT_COVERS_FALLBACK,
  TWIN_LOOP_BACK_COVERS as TWIN_LOOP_BACK_COVERS_FALLBACK,
} from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';

export interface TwinLoopPricingState {
  wireColors: Record<string, number>;
  frontCovers: Record<string, number>;
  backCovers: Record<string, number>;
  hangerPrice?: number;
  concealedPrice?: number;
}

interface Props {
  value: TwinLoopPricingState;
  onChange: (value: TwinLoopPricingState) => void;
  onSave: () => void;
  saving: boolean;
}

function PriceRow({
  label,
  hint,
  swatch,
  enabled,
  price,
  onEnabledChange,
  onPriceChange,
}: {
  label: string;
  hint?: string;
  swatch?: string;
  enabled: boolean;
  price: number;
  onEnabledChange: (enabled: boolean) => void;
  onPriceChange: (price: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        {swatch && (
          <span className={`h-4 w-4 shrink-0 rounded-full border ${swatch}`} />
        )}
        <span className="min-w-0">
          <span
            className={`block text-sm ${enabled ? 'text-slate-700' : 'text-slate-400'}`}
          >
            {label}
          </span>
          {hint && (
            <span className="block truncate text-xs text-slate-400">
              {hint}
            </span>
          )}
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
            value={enabled ? price : ''}
            onChange={(event) =>
              onPriceChange(Math.max(0, Number(event.target.value) || 0))
            }
            aria-label={`${label} extra price`}
            className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
          />
        </div>
        <ToggleSwitch
          checked={enabled}
          label={`Offer ${label}`}
          hideLabel
          onChange={onEnabledChange}
        />
      </div>
    </div>
  );
}

function updateMap(
  map: Record<string, number>,
  key: string,
  enabled: boolean,
): Record<string, number> {
  if (enabled) return { ...map, [key]: 0 };
  const next = { ...map };
  delete next[key];
  return next;
}

export default function TwinLoopCustomizationPricing({
  value,
  onChange,
  onSave,
  saving,
}: Props) {
  const wireColorsOptions = useCatalogOptions('twin-loop-wire-colors', TWIN_LOOP_WIRE_COLORS_FALLBACK);
  const frontCoverOptions = useCatalogOptions('twin-loop-front-covers', TWIN_LOOP_FRONT_COVERS_FALLBACK);
  const backCoverOptions = useCatalogOptions('twin-loop-back-covers', TWIN_LOOP_BACK_COVERS_FALLBACK);
  return (
    <div className="space-y-5 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Twin Loop Binding customization prices
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose the wire and cover options offered to customers and set each
          extra price.
        </p>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Wire colours
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {wireColorsOptions.map((option) => {
            const enabled = option.value in value.wireColors;
            return (
              <PriceRow
                key={option.value}
                label={option.label}
                hint={option.premium ? 'Premium colour' : 'Standard colour'}
                swatch={option.class}
                enabled={enabled}
                price={value.wireColors[option.value] ?? 0}
                onEnabledChange={(next) =>
                  onChange({
                    ...value,
                    wireColors: updateMap(value.wireColors, option.value, next),
                  })
                }
                onPriceChange={(price) =>
                  onChange({
                    ...value,
                    wireColors: { ...value.wireColors, [option.value]: price },
                  })
                }
              />
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Front covers
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {frontCoverOptions.map((option) => {
            const enabled = option.value in value.frontCovers;
            return (
              <PriceRow
                key={option.value}
                label={option.label}
                hint={option.hint}
                enabled={enabled}
                price={value.frontCovers[option.value] ?? 0}
                onEnabledChange={(next) =>
                  onChange({
                    ...value,
                    frontCovers: updateMap(
                      value.frontCovers,
                      option.value,
                      next,
                    ),
                  })
                }
                onPriceChange={(price) =>
                  onChange({
                    ...value,
                    frontCovers: {
                      ...value.frontCovers,
                      [option.value]: price,
                    },
                  })
                }
              />
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Back covers
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {backCoverOptions.map((option) => {
            const enabled = option.value in value.backCovers;
            return (
              <PriceRow
                key={option.value}
                label={option.label}
                hint={option.hint}
                enabled={enabled}
                price={value.backCovers[option.value] ?? 0}
                onEnabledChange={(next) =>
                  onChange({
                    ...value,
                    backCovers: updateMap(value.backCovers, option.value, next),
                  })
                }
                onPriceChange={(price) =>
                  onChange({
                    ...value,
                    backCovers: { ...value.backCovers, [option.value]: price },
                  })
                }
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
        <PriceRow
          label="Calendar wall hanger"
          hint="Available when the customer selects top-edge binding"
          enabled={value.hangerPrice !== undefined}
          price={value.hangerPrice ?? 0}
          onEnabledChange={(enabled) =>
            onChange({ ...value, hangerPrice: enabled ? 0 : undefined })
          }
          onPriceChange={(hangerPrice) => onChange({ ...value, hangerPrice })}
        />
        <PriceRow
          label="Concealed Twin Loop / Hardcover Wire-O"
          hint="Premium rigid wrap that conceals the wire spine"
          enabled={value.concealedPrice !== undefined}
          price={value.concealedPrice ?? 0}
          onEnabledChange={(enabled) =>
            onChange({ ...value, concealedPrice: enabled ? 0 : undefined })
          }
          onPriceChange={(concealedPrice) =>
            onChange({ ...value, concealedPrice })
          }
        />
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={
            saving ||
            Object.keys(value.wireColors).length === 0 ||
            Object.keys(value.frontCovers).length === 0 ||
            Object.keys(value.backCovers).length === 0 ||
            !('heavy-cardstock' in value.frontCovers) ||
            !('matching-front' in value.backCovers)
          }
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? 'Saving...' : 'Save Twin Loop prices'}
        </button>
      </div>
    </div>
  );
}
