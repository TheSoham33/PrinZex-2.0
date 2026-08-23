'use client';

import { useEffect, useMemo } from 'react';
import {
  TWIN_LOOP_BACK_COVERS,
  TWIN_LOOP_FRONT_COVERS,
  TWIN_LOOP_WIRE_COLORS,
} from '@/lib/domain/stores';
import type { OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import type { OrderAction } from './orderReducer';

interface Props {
  specs: OrderSpecifications;
  service: ServiceOffering | undefined;
  dispatch: React.Dispatch<OrderAction>;
}

function offered<T extends { value: string }>(
  options: readonly T[],
  prices?: Record<string, number>,
): T[] {
  return prices
    ? options.filter((option) => option.value in prices)
    : [...options];
}

function ChoiceGrid({
  title,
  options,
  selected,
  prices,
  onSelect,
}: {
  title: string;
  options: ReadonlyArray<{
    value: string;
    label: string;
    hint?: string;
    class?: string;
    premium?: boolean;
  }>;
  selected?: string;
  prices?: Record<string, number>;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="label">
        {title} <span className="text-red-500">*</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-xl border bg-white p-3.5 text-left transition-all ${
              selected === option.value
                ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-blue-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {option.class && (
                <span
                  className={`h-4 w-4 rounded-full border ${option.class}`}
                />
              )}
              <span className="text-sm font-semibold text-slate-900">
                {option.label}
              </span>
              {option.premium && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                  Premium
                </span>
              )}
            </span>
            {option.hint && (
              <span className="mt-1 block text-xs text-slate-500">
                {option.hint}
              </span>
            )}
            {(prices?.[option.value] ?? 0) > 0 && (
              <span className="mt-1 block text-xs font-semibold text-blue-600">
                +{formatCurrency(prices![option.value])}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TwinLoopCustomizationPanel({
  specs,
  service,
  dispatch,
}: Props) {
  const config = service?.twinLoopOptions;
  const wireColors = useMemo(
    () => offered(TWIN_LOOP_WIRE_COLORS, config?.wireColors),
    [config?.wireColors],
  );
  const frontCovers = useMemo(
    () => offered(TWIN_LOOP_FRONT_COVERS, config?.frontCovers),
    [config?.frontCovers],
  );
  const backCovers = useMemo(
    () => offered(TWIN_LOOP_BACK_COVERS, config?.backCovers),
    [config?.backCovers],
  );

  useEffect(() => {
    const fixes: Partial<OrderSpecifications> = {};
    if (
      wireColors.length &&
      !wireColors.some((option) => option.value === specs.twinLoopWireColor)
    ) {
      fixes.twinLoopWireColor = wireColors[0].value;
    }
    if (
      frontCovers.length &&
      !frontCovers.some((option) => option.value === specs.twinLoopFrontCover)
    ) {
      fixes.twinLoopFrontCover = frontCovers[0].value;
    }
    if (
      backCovers.length &&
      !backCovers.some((option) => option.value === specs.twinLoopBackCover)
    ) {
      fixes.twinLoopBackCover = backCovers[0].value;
    }
    if (Object.keys(fixes).length)
      dispatch({ type: 'SET_SPEC', payload: fixes });
  }, [
    specs.twinLoopWireColor,
    specs.twinLoopFrontCover,
    specs.twinLoopBackCover,
    wireColors,
    frontCovers,
    backCovers,
    dispatch,
  ]);

  const totalPages = specs.totalPages ?? 0;
  const totalSheets = totalPages
    ? (specs.twinLoopPrintSides === 'single'
        ? totalPages
        : Math.ceil(totalPages / 2)) + 2
    : 0;
  const pitch = totalPages <= 120 ? '3:1' : '2:1';
  const stackMm =
    totalSheets * ((specs.paperGsm ?? 75) === 100 ? 0.13 : 0.1) + 0.6;
  const wireSize =
    stackMm <= 4.5
      ? '1/4"'
      : stackMm <= 6
        ? '5/16"'
        : stackMm <= 8
          ? '3/8"'
          : stackMm <= 10.5
            ? '1/2"'
            : stackMm <= 13
              ? '5/8"'
              : stackMm <= 16
                ? '3/4"'
                : '1"';

  return (
    <section className="animate-fade-in rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
      <h3 className="text-lg font-bold text-slate-900">
        Twin Loop Binding Customization
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Configure the coated steel wire, independent covers, and binding
        orientation.
      </p>

      <div className="mt-6 space-y-6">
        <ChoiceGrid
          title="Wire material & colour"
          options={wireColors}
          selected={specs.twinLoopWireColor}
          prices={config?.wireColors}
          onSelect={(twinLoopWireColor) =>
            dispatch({ type: 'SET_SPEC', payload: { twinLoopWireColor } })
          }
        />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
          <label className="block">
            <span className="label">Inner paper weight</span>
            <select
              value={specs.paperGsm ?? 75}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { paperGsm: Number(event.target.value) as 75 | 100 },
                })
              }
              className="input"
            >
              <option value={75}>75 GSM — Standard</option>
              <option value={100}>100 GSM — Heavy</option>
            </select>
          </label>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
            Paper weight and single/double-sided printing automatically change
            the physical sheet count and recommended wire diameter.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase text-blue-500">
              Recommended pitch
            </p>
            <p className="mt-1 text-xl font-bold text-blue-900">{pitch}</p>
            <p className="text-xs text-blue-700">
              {pitch === '3:1'
                ? '3 holes/inch · 30–120 pages'
                : '2 holes/inch · 120–250+ pages'}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase text-blue-500">
              Total sheets
            </p>
            <p className="mt-1 text-xl font-bold text-blue-900">
              {totalSheets || '—'}
            </p>
            <p className="text-xs text-blue-700">Includes two cover sheets.</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase text-blue-500">
              Wire size
            </p>
            <p className="mt-1 text-xl font-bold text-blue-900">
              {totalSheets ? wireSize : '—'}
            </p>
            <p className="text-xs text-blue-700">
              Estimated from paper weight and sheets.
            </p>
          </div>
        </div>

        <ChoiceGrid
          title="Front cover type"
          options={frontCovers}
          selected={specs.twinLoopFrontCover}
          prices={config?.frontCovers}
          onSelect={(twinLoopFrontCover) =>
            dispatch({ type: 'SET_SPEC', payload: { twinLoopFrontCover } })
          }
        />
        <ChoiceGrid
          title="Back cover type"
          options={backCovers}
          selected={specs.twinLoopBackCover}
          prices={config?.backCovers}
          onSelect={(twinLoopBackCover) =>
            dispatch({ type: 'SET_SPEC', payload: { twinLoopBackCover } })
          }
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">
              Binding edge <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'left',
                  label: 'Left Edge',
                  hint: 'Book / notebook format',
                },
                {
                  value: 'top',
                  label: 'Top Edge',
                  hint: 'Calendar / flip chart',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_SPEC',
                      payload: {
                        twinLoopBindingEdge: option.value as 'left' | 'top',
                        ...(option.value === 'left'
                          ? { twinLoopCalendarHanger: false }
                          : {}),
                      },
                    })
                  }
                  className={`rounded-xl border p-3 text-left ${specs.twinLoopBindingEdge === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}
                >
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">
              Print inner pages <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'single', label: 'Single-Sided' },
                { value: 'double', label: 'Double-Sided / Duplex' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_SPEC',
                      payload: {
                        twinLoopPrintSides: option.value as 'single' | 'double',
                      },
                    })
                  }
                  className={`rounded-xl border p-3 text-left text-sm font-semibold ${specs.twinLoopPrintSides === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {specs.twinLoopBindingEdge === 'top' &&
          config?.hangerPrice !== undefined && (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Add a calendar wall hanger?
                </span>
                <span className="text-xs text-slate-500">
                  Split wire with a crescent punch and metal hook{' '}
                  {config.hangerPrice > 0
                    ? `· +${formatCurrency(config.hangerPrice)}`
                    : ''}
                </span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(specs.twinLoopCalendarHanger)}
                onChange={(event) =>
                  dispatch({
                    type: 'SET_SPEC',
                    payload: { twinLoopCalendarHanger: event.target.checked },
                  })
                }
                className="h-5 w-5 rounded border-slate-300 text-blue-600"
              />
            </label>
          )}

        {config?.concealedPrice !== undefined && (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Concealed Twin Loop / Hardcover Wire-O
              </span>
              <span className="text-xs text-slate-500">
                Premium rigid cover wrap that hides the wire spine{' '}
                {config.concealedPrice > 0
                  ? `· +${formatCurrency(config.concealedPrice)}`
                  : ''}
              </span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(specs.twinLoopConcealed)}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { twinLoopConcealed: event.target.checked },
                })
              }
              className="h-5 w-5 rounded border-slate-300 text-blue-600"
            />
          </label>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">10 mm punch-margin safe zone</p>
          <p className="mt-1 text-xs leading-relaxed">
            Keep text, page numbers, charts, and artwork at least 0.4 inches (10
            mm) away from the{' '}
            {specs.twinLoopBindingEdge === 'top' ? 'top' : 'left'} binding edge.
            Wire punches can cut through content inside this zone.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={Boolean(specs.twinLoopSafeZoneAcknowledged)}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: {
                    twinLoopSafeZoneAcknowledged: event.target.checked,
                  },
                })
              }
              className="mt-0.5 h-5 w-5 rounded border-amber-300 text-blue-600"
            />
            <span className="text-xs font-semibold">
              I confirm my PDF keeps all important content outside the 10 mm
              punch margin.
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
