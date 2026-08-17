'use client';

import {
  BINDING_CORNER_SIZES,
  COVER_COLORS,
  COVER_TEXT_COLORS,
  COVER_TYPES,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
  FINISHING_OPTIONS,
  PAPER_SIZES,
  PAPER_TYPES,
} from '@/lib/mock-data/stores';
import type { OrderSpecifications, ServiceOffering, UploadedFile } from '@/lib/types';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import { IconAlertCircle, IconUpload, IconCheckCircle, IconFileText, IconTrash, IconEye } from '@/components/icons';
import { useRef, useState, type DragEvent } from 'react';
import { PDFDocument } from 'pdf-lib';

const ACCEPTED = '.pdf';
const MAX_BYTES = 25 * 1024 * 1024;

interface SpecificationsStepProps {
  specs: OrderSpecifications;
  services: ServiceOffering[];
  file: UploadedFile | null;
  instructions: string;
  dispatch: React.Dispatch<OrderAction>;
  error: string | null;
}

export default function SpecificationsStep({
  specs,
  services,
  file,
  instructions,
  dispatch,
  error,
}: SpecificationsStepProps) {
  const isHardBinding = specs.serviceId === 'bind-hard';
  const isSpiralBinding = specs.serviceId === 'bind-spiral';
  const isCustomizableBinding = isHardBinding || isSpiralBinding;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const acceptFile = async (selected: File | undefined) => {
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      setLocalError('Currently only PDF file accept. Please convert the file into PDF then send it.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (selected.size > MAX_BYTES) {
      setLocalError('That file is larger than 25 MB. Please compress it and try again.');
      return;
    }

    setLocalError(null);
    setProcessing(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      const previewUrl = URL.createObjectURL(selected);

      dispatch({
        type: 'SET_FILE',
        payload: { name: selected.name, size: selected.size, type: selected.type, previewUrl },
      });
      dispatch({ type: 'SET_SPEC', payload: { totalPages } });
    } catch (e) {
      console.error('Error processing PDF:', e);
      setLocalError('Failed to process PDF. Please ensure it is not password protected.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const toggleFinishing = (value: string) => {
    const finishing = specs.finishing.includes(value)
      ? specs.finishing.filter((item) => item !== value)
      : [...specs.finishing, value];
    dispatch({ type: 'SET_SPEC', payload: { finishing } });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>, side?: 'front' | 'back' | 'single', index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (side === 'front') {
        dispatch({ type: 'SET_SPEC', payload: { frontCoverFileUrl: previewUrl, frontCoverFileName: file.name } });
      } else if (side === 'back') {
        dispatch({ type: 'SET_SPEC', payload: { backCoverFileUrl: previewUrl, backCoverFileName: file.name } });
      } else if (index !== undefined) {
        const currentUrls = [...(specs.coverFileUrls || [])];
        while (currentUrls.length < specs.quantity) currentUrls.push('');
        currentUrls[index] = previewUrl;
        dispatch({ type: 'SET_SPEC', payload: { coverFileUrls: currentUrls } });
      } else {
        dispatch({ type: 'SET_SPEC', payload: { coverFileUrl: previewUrl, coverFileName: file.name } });
      }
    }
  };

  const applyCoverToAll = specs.applyCoverToAll !== false;
  const shownError = localError ?? error;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Print specifications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload your file and choose how you want it printed.
        </p>
      </header>

      {shownError && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {shownError}
        </p>
      )}

      <section className="space-y-4">
        <label className="label">Upload your file <span className="text-red-500">*</span></label>
        
        {processing ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 py-12 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 font-semibold text-slate-900">Analyzing document…</p>
            <p className="mt-1 text-xs text-slate-500">Calculating final page count for pricing</p>
          </div>
        ) : file ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <IconFileText className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(file.size)} · Ready to print
                </p>
              </div>
              <div className="flex gap-1">
                <a
                  href={file.previewUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-lg p-2 transition-colors ${
                    file.previewUrl 
                      ? 'text-slate-400 hover:bg-blue-50 hover:text-blue-600' 
                      : 'pointer-events-none text-slate-200'
                  }`}
                  aria-label="View uploaded file"
                  title={file.previewUrl ? "View file" : "Preview not available"}
                >
                  <IconEye className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_FILE', payload: null });
                    dispatch({ type: 'SET_SPEC', payload: { totalPages: 0 } });
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove file"
                  title="Remove file"
                >
                  <IconTrash className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Total pages</p>
                  <p className="text-xs text-slate-500">
                    Automatically calculated from PDF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-900">
                    {specs.totalPages || 1}
                  </div>
                  <span className="text-sm font-medium text-slate-600">pages</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <IconUpload className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              Drop PDF here, or <span className="text-blue-600">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Only PDF files are currently accepted · up to 25 MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={(event) => acceptFile(event.target.files?.[0])}
          className="hidden"
        />
      </section>

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

      {isCustomizableBinding && (
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

      {isCustomizableBinding && (
        <section className="animate-fade-in rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Cover Customization</h3>
          
          <div className="space-y-6">
            {isSpiralBinding && (
              <div>
                <p className="label">Spiral Type <span className="text-red-500">*</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SPIRAL_COIL_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SPEC', payload: { spiralType: type.value } })}
                      className={`rounded-xl border p-3 bg-white text-left transition-all ${
                        specs.spiralType === type.value
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
            )}

            <div>
              <p className="label">Cover type <span className="text-red-500">*</span></p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(isSpiralBinding ? SPIRAL_COVER_TYPES : COVER_TYPES).map((type) => (
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

            {isSpiralBinding && (
              <div>
                <p className="label">Cover Design <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { value: 'default', label: 'Simple Cover', hint: 'Plain or standard' },
                    { value: 'custom', label: 'Custom Designed', hint: 'Both sides personalized' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SPEC', payload: { coverDesignType: opt.value as any } })}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        (specs.coverDesignType || 'default') === opt.value
                          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-blue-200 bg-white'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isHardBinding || (isSpiralBinding && specs.coverDesignType === 'custom') ? (
              <div className="space-y-4">
                <p className="label">
                  {isSpiralBinding ? 'Both side cover design' : 'What will be written on cover (Upload)'}{' '}
                  <span className="text-red-500">*</span>
                </p>
                
                {isSpiralBinding ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Front Cover */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Front Cover</p>
                      <input type="file" id="front-cover" onChange={(e) => handleCoverUpload(e, 'front')} className="hidden" />
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="front-cover"
                          className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all ${
                            specs.frontCoverFileUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
                          }`}
                        >
                          {specs.frontCoverFileUrl ? <><IconCheckCircle className="h-4 w-4" /><span className="truncate text-xs font-semibold">{specs.frontCoverFileName || 'Front Cover'}</span></> : <><IconUpload className="h-4 w-4" /><span className="text-xs">Upload Front</span></>}
                        </label>
                        {specs.frontCoverFileUrl && (
                          <a href={specs.frontCoverFileUrl} target="_blank" rel="noreferrer" className="btn-secondary p-3" title="View Front Cover">
                            <IconEye className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Back Cover */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Back Cover</p>
                      <input type="file" id="back-cover" onChange={(e) => handleCoverUpload(e, 'back')} className="hidden" />
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="back-cover"
                          className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all ${
                            specs.backCoverFileUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
                          }`}
                        >
                          {specs.backCoverFileUrl ? <><IconCheckCircle className="h-4 w-4" /><span className="truncate text-xs font-semibold">{specs.backCoverFileName || 'Back Cover'}</span></> : <><IconUpload className="h-4 w-4" /><span className="text-xs">Upload Back</span></>}
                        </label>
                        {specs.backCoverFileUrl && (
                          <a href={specs.backCoverFileUrl} target="_blank" rel="noreferrer" className="btn-secondary p-3" title="View Back Cover">
                            <IconEye className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="cover-upload-all"
                      onChange={(e) => handleCoverUpload(e)}
                      className="hidden"
                    />
                    <label
                      htmlFor="cover-upload-all"
                      className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all ${
                        specs.coverFileUrl 
                          ? 'border-green-200 bg-green-50 text-green-700' 
                          : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {specs.coverFileUrl ? (
                        <>
                          <IconCheckCircle className="h-6 w-6" />
                          <span className="font-semibold truncate max-w-xs">{specs.coverFileName || 'Cover Design'}</span>
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
                    {specs.coverFileUrl && (
                      <a href={specs.coverFileUrl} target="_blank" rel="noreferrer" className="btn-secondary p-5" title="View Cover">
                        <IconEye className="h-6 w-6" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {specs.quantity > 1 && (
              <div className="pt-2">
                <label className="flex cursor-not-allowed items-center gap-3 opacity-60">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Use same cover style for all {specs.quantity} pieces
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Coming Soon
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

      <section>
        <label htmlFor="instructions" className="label">
          Special instructions (optional)
        </label>
        <textarea
          id="instructions"
          rows={3}
          maxLength={500}
          value={instructions}
          onChange={(event) => dispatch({ type: 'SET_INSTRUCTIONS', payload: event.target.value })}
          placeholder="e.g. print double-sided, bind pages 1–40 separately…"
          className="input resize-none"
        />
        <p className="mt-1.5 text-right text-xs text-slate-400">{instructions.length}/500</p>
      </section>
    </div>
  );
}
