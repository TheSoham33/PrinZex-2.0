'use client';

import {
  BINDING_CORNER_SIZES,
  COVER_COLORS,
  COVER_TEXT_COLORS,
  COVER_TYPES,
  FINISHING_OPTIONS,
  PAPER_SIZES,
  PAPER_TYPES,
} from '@/lib/mock-data/stores';
import type { OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import { IconAlertCircle, IconUpload, IconCheckCircle } from '@/components/icons';

interface SpecificationsStepProps {
  specs: OrderSpecifications;
  services: ServiceOffering[];
  dispatch: React.Dispatch<OrderAction>;
  error: string | null;
}

export default function SpecificationsStep({
  specs,
  services,
  dispatch,
  error,
}: SpecificationsStepProps) {
  const isHardBinding = specs.serviceId === 'bind-hard';

  const toggleFinishing = (value: string) => {
    const finishing = specs.finishing.includes(value)
      ? specs.finishing.filter((item) => item !== value)
      : [...specs.finishing, value];
    dispatch({ type: 'SET_SPEC', payload: { finishing } });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (index !== undefined) {
        const currentUrls = [...(specs.coverFileUrls || [])];
        // Ensure array is long enough
        while (currentUrls.length < specs.quantity) currentUrls.push('');
        currentUrls[index] = file.name;
        dispatch({ type: 'SET_SPEC', payload: { coverFileUrls: currentUrls } });
      } else {
        // Simulate upload and set a fake URL (using filename for display)
        dispatch({ type: 'SET_SPEC', payload: { coverFileUrl: file.name } });
      }
    }
  };

  const applyCoverToAll = specs.applyCoverToAll !== false;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Print specifications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tell us exactly how you want it printed. Pricing updates as you choose.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <section>
        <label htmlFor="service" className="label">
          Service <span className="text-red-500">*</span>
        </label>
        <select
          id="service"
          value={specs.serviceId}
          onChange={(event) =>
            dispatch({ type: 'SET_SPEC', payload: { serviceId: event.target.value } })
          }
          className="input"
        >
          <option value="">Choose a service…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — {formatCurrency(service.startingPrice)} {service.unit}
            </option>
          ))}
        </select>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <p className="label">
            Paper type <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PAPER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => dispatch({ type: 'SET_SPEC', payload: { paperType: type.value } })}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.paperType === type.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{type.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{type.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label">
            Size <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PAPER_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => dispatch({ type: 'SET_SPEC', payload: { size: size.value } })}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.size === size.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{size.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{size.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isHardBinding && (
        <section className="animate-fade-in">
          <p className="label">Page corner size <span className="text-red-500">*</span></p>
          <div className="grid gap-3 sm:grid-cols-3">
            {BINDING_CORNER_SIZES.map((corner) => (
              <button
                key={corner.value}
                type="button"
                onClick={() => dispatch({ type: 'SET_SPEC', payload: { pageCornerSize: corner.value } })}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.pageCornerSize === corner.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{corner.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{corner.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <label htmlFor="quantity" className="label">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { quantity: Math.max(1, specs.quantity - 1) },
                })
              }
              className="btn-secondary h-11 w-11 shrink-0 p-0 text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="quantity"
              type="number"
              min={1}
              max={10000}
              value={specs.quantity}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { quantity: Math.max(1, Number(event.target.value) || 1) },
                })
              }
              className="input text-center font-bold"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_SPEC', payload: { quantity: specs.quantity + 1 } })}
              className="btn-secondary h-11 w-11 shrink-0 p-0 text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </section>

        <section>
          <p className="label">Colour <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'bw', label: 'Black & White', hint: 'Most economical' },
                { value: 'color', label: 'Colour', hint: 'Full colour print' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  dispatch({ type: 'SET_SPEC', payload: { colorOption: option.value } })
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.colorOption === option.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section>
        <label htmlFor="colorPages" className="label">
          Particular pages colour (optional)
        </label>
        <textarea
          id="colorPages"
          rows={2}
          value={specs.colorPages || ''}
          onChange={(e) => dispatch({ type: 'SET_SPEC', payload: { colorPages: e.target.value } })}
          placeholder="e.g. 1, 5, 10-15 (These pages will be printed in colour)"
          className="input resize-none"
        />
      </section>

      {isHardBinding && (
        <section className="animate-fade-in rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Cover Customization</h3>
          
          <div className="space-y-6">
            <div>
              <p className="label">Cover type <span className="text-red-500">*</span></p>
              <div className="grid gap-3 sm:grid-cols-3">
                {COVER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_SPEC', payload: { coverType: type.value } })}
                    className={`rounded-xl border p-3 bg-white text-left transition-all ${
                      specs.coverType === type.value
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-900">{type.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{type.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="label">Colour for cover <span className="text-red-500">*</span></p>
                <div className="flex flex-wrap gap-3">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SPEC', payload: { coverColor: color.value } })}
                      title={color.label}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        specs.coverColor === color.value ? 'border-blue-600 ring-2 ring-blue-100' : 'border-white shadow-sm'
                      } ${color.class}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Colour for cover text <span className="text-red-500">*</span></p>
                <div className="flex flex-wrap gap-3">
                  {COVER_TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SPEC', payload: { coverTextColor: color.value } })}
                      title={color.label}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        specs.coverTextColor === color.value ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 shadow-sm'
                      } ${color.class}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="label">What will be written on cover (Upload) <span className="text-red-500">*</span></p>
              
              {applyCoverToAll ? (
                <div className="relative">
                  <input
                    type="file"
                    id="cover-upload-all"
                    onChange={(e) => handleCoverUpload(e)}
                    className="hidden"
                  />
                  <label
                    htmlFor="cover-upload-all"
                    className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all ${
                      specs.coverFileUrl 
                        ? 'border-green-200 bg-green-50 text-green-700' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    {specs.coverFileUrl ? (
                      <>
                        <IconCheckCircle className="h-6 w-6" />
                        <span className="font-semibold truncate max-w-xs">{specs.coverFileUrl}</span>
                      </>
                    ) : (
                      <>
                        <IconUpload className="h-6 w-6" />
                        <div className="text-center">
                          <p className="font-semibold">Click to upload cover design</p>
                          <p className="text-xs text-slate-400">Apply to all {specs.quantity} copies</p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: specs.quantity }).map((_, idx) => (
                    <div key={idx} className="relative">
                      <input
                        type="file"
                        id={`cover-upload-${idx}`}
                        onChange={(e) => handleCoverUpload(e, idx)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`cover-upload-${idx}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-all ${
                          specs.coverFileUrls?.[idx]
                            ? 'border-green-200 bg-green-50 text-green-700' 
                            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        {specs.coverFileUrls?.[idx] ? (
                          <span className="truncate text-xs font-semibold">{specs.coverFileUrls[idx]}</span>
                        ) : (
                          <span className="text-xs">Upload design for copy {idx + 1}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {specs.quantity > 1 && (
              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={applyCoverToAll}
                    onChange={(e) => dispatch({ type: 'SET_SPEC', payload: { applyCoverToAll: e.target.checked } })}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Use same cover style for all {specs.quantity} pieces
                  </span>
                </label>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <p className="label">Finishing (optional)</p>
        <div className="flex flex-wrap gap-2.5">
          {FINISHING_OPTIONS.map((option) => {
            const active = specs.finishing.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleFinishing(option.value)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                {option.label}
                <span className="ml-1.5 text-xs text-slate-400">
                  +{formatCurrency(option.price)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
