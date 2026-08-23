'use client';

import {
  COVER_COLORS,
  COVER_TEXT_COLORS,
  COVER_TYPES,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
  FINISHING_OPTIONS,
  PAPER_SIZES,
  PAPER_TYPES,
} from '@/lib/domain/stores';
import type {
  OrderSpecifications,
  ServiceOffering,
  UploadedFile,
} from '@/lib/types';
import { countColorPages, formatCurrency, formatFileSize } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import {
  IconAlertCircle,
  IconUpload,
  IconCheckCircle,
  IconFileText,
  IconTrash,
  IconEye,
} from '@/components/icons';
import { useEffect, useRef, useState, type DragEvent } from 'react';
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
  /** Cover customization options offered by this specific store. */
  availableCoverTypes?: string[];
  availableCoilTypes?: string[];
  availableCoverColors?: string[];
  availableHardCoverColors?: string[];
  availableHardFoilColors?: string[];
}

/** `undefined` availability → show all options; otherwise only the offered ones. */
function filterOffered<T extends { value: string }>(
  options: readonly T[],
  available: string[] | undefined,
): T[] {
  if (!available) return [...options];
  return options.filter((option) => available.includes(option.value));
}

export default function SpecificationsStep({
  specs,
  services,
  file,
  instructions,
  dispatch,
  error,
  availableCoverTypes,
  availableCoilTypes,
  availableCoverColors,
  availableHardCoverColors,
  availableHardFoilColors,
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
      setLocalError(
        'Currently only PDF file accept. Please convert the file into PDF then send it.',
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (selected.size > MAX_BYTES) {
      setLocalError(
        'That file is larger than 25 MB. Please compress it and try again.',
      );
      return;
    }

    setLocalError(null);
    setProcessing(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      const totalPages = pdfDoc.getPageCount();
      const previewUrl = URL.createObjectURL(selected);

      dispatch({
        type: 'SET_FILE',
        payload: {
          name: selected.name,
          size: selected.size,
          type: selected.type,
          previewUrl,
        },
      });
      dispatch({ type: 'SET_SPEC', payload: { totalPages } });
    } catch (e) {
      console.error('Error processing PDF:', e);
      setLocalError(
        'Failed to process PDF. Please ensure it is not password protected.',
      );
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

  const handleCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side?: 'front' | 'back' | 'single',
    index?: number,
  ) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      setLocalError('Cover artwork must be uploaded as a PDF.');
      e.target.value = '';
      return;
    }

    if (selected.size > MAX_BYTES) {
      setLocalError(
        'The cover PDF is larger than 25 MB. Please compress it and try again.',
      );
      e.target.value = '';
      return;
    }

    if (isHardBinding && (side === 'front' || side === 'back')) {
      try {
        const pdf = await PDFDocument.load(await selected.arrayBuffer(), {
          ignoreEncryption: true,
        });
        if (pdf.getPageCount() !== 1) {
          setLocalError(
            `${side === 'front' ? 'Front' : 'Back'} cover PDF must contain exactly one page.`,
          );
          e.target.value = '';
          return;
        }
        const { width, height } = pdf.getPage(0).getSize();
        if (width >= height) {
          setLocalError(
            `${side === 'front' ? 'Front' : 'Back'} cover PDF must use portrait orientation.`,
          );
          e.target.value = '';
          return;
        }
      } catch {
        setLocalError(
          'Could not read that cover PDF. Please upload a valid, unprotected PDF.',
        );
        e.target.value = '';
        return;
      }
    }

    setLocalError(null);
    const previewUrl = URL.createObjectURL(selected);
    if (side === 'front') {
      dispatch({
        type: 'SET_SPEC',
        payload: {
          frontCoverFileUrl: previewUrl,
          frontCoverFileName: selected.name,
          hardBindingProofApproved: false,
        },
      });
    } else if (side === 'back') {
      dispatch({
        type: 'SET_SPEC',
        payload: {
          backCoverFileUrl: previewUrl,
          backCoverFileName: selected.name,
          hardBindingProofApproved: false,
        },
      });
    } else if (index !== undefined) {
      const currentUrls = [...(specs.coverFileUrls || [])];
      while (currentUrls.length < specs.quantity) currentUrls.push('');
      currentUrls[index] = previewUrl;
      dispatch({ type: 'SET_SPEC', payload: { coverFileUrls: currentUrls } });
    } else {
      dispatch({
        type: 'SET_SPEC',
        payload: { coverFileUrl: previewUrl, coverFileName: selected.name },
      });
    }
  };

  const removeHardCoverFile = (side: 'front' | 'back') => {
    const previewUrl =
      side === 'front' ? specs.frontCoverFileUrl : specs.backCoverFileUrl;
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    const input = document.getElementById(
      `hard-${side}-cover`,
    ) as HTMLInputElement | null;
    if (input) input.value = '';

    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? {
              frontCoverFileUrl: undefined,
              frontCoverFileName: undefined,
              hardBindingProofApproved: false,
            }
          : {
              backCoverFileUrl: undefined,
              backCoverFileName: undefined,
              hardBindingProofApproved: false,
            },
    });
  };

  const applyCoverToAll = specs.applyCoverToAll !== false;
  const shownError = localError ?? error;

  const totalPages = specs.totalPages || 0;
  const colorPageCount = countColorPages(specs.colorPages, totalPages);
  const paperGsm = specs.paperGsm ?? 75;
  // Approximation based on sheets (two pages per sheet) and common paper caliper.
  const spineWidthMm =
    totalPages > 0
      ? Math.max(
          2,
          Math.round((totalPages / 2) * (paperGsm === 100 ? 0.13 : 0.1) * 10) /
            10,
        )
      : 0;
  const selectedCoverColor = COVER_COLORS.find(
    (color) => color.value === specs.coverColor,
  );
  const selectedFoilColor = COVER_TEXT_COLORS.find(
    (color) => color.value === specs.coverTextColor,
  );
  const hardBindingFoilColors = filterOffered(
    COVER_TEXT_COLORS.filter((color) => color.value !== 'white'),
    availableHardFoilColors,
  );

  const selectedService = services.find(
    (service) => service.id === specs.serviceId,
  );
  const offeredPaperTypes = filterOffered(
    PAPER_TYPES,
    selectedService?.paperTypePrices
      ? Object.keys(selectedService.paperTypePrices)
      : undefined,
  );
  const offeredPaperSizes = filterOffered(
    PAPER_SIZES,
    selectedService?.paperSizePrices
      ? Object.keys(selectedService.paperSizePrices)
      : undefined,
  );

  // Only show cover-customization options this store actually offers.
  const offeredCoilTypes = filterOffered(SPIRAL_COIL_TYPES, availableCoilTypes);
  const offeredCoverTypes = filterOffered(
    isSpiralBinding ? SPIRAL_COVER_TYPES : COVER_TYPES,
    availableCoverTypes,
  );
  const offeredCoverColors = isHardBinding
    ? filterOffered(COVER_COLORS, availableHardCoverColors)
    : filterOffered(COVER_COLORS, availableCoverColors);

  // Keep the selected paper options aligned with the seller's current menu.
  useEffect(() => {
    const fixes: Partial<OrderSpecifications> = {};
    if (
      offeredPaperTypes.length > 0 &&
      !offeredPaperTypes.some((option) => option.value === specs.paperType)
    ) {
      fixes.paperType = offeredPaperTypes[0].value;
    }
    if (
      offeredPaperSizes.length > 0 &&
      !offeredPaperSizes.some((option) => option.value === specs.size)
    ) {
      fixes.size = offeredPaperSizes[0].value;
    }
    if (Object.keys(fixes).length > 0) {
      dispatch({ type: 'SET_SPEC', payload: fixes });
    }
  }, [
    specs.paperType,
    specs.size,
    offeredPaperTypes,
    offeredPaperSizes,
    dispatch,
  ]);

  // If a previously selected option is no longer offered (e.g. the seller
  // changed availability, or the default isn't offered), fall back to the
  // first offered option so the form never shows a hidden selection.
  useEffect(() => {
    if (!isCustomizableBinding) return;
    const fixes: Partial<OrderSpecifications> = {};

    if (
      offeredCoilTypes.length > 0 &&
      specs.spiralType &&
      !offeredCoilTypes.some((t) => t.value === specs.spiralType)
    ) {
      fixes.spiralType = offeredCoilTypes[0].value;
    }
    if (
      offeredCoverTypes.length > 0 &&
      specs.coverType &&
      !offeredCoverTypes.some((t) => t.value === specs.coverType)
    ) {
      fixes.coverType = offeredCoverTypes[0].value;
    }
    if (
      offeredCoverColors.length > 0 &&
      specs.coverColor &&
      !offeredCoverColors.some((c) => c.value === specs.coverColor)
    ) {
      fixes.coverColor = offeredCoverColors[0].value;
    }
    if (
      isHardBinding &&
      hardBindingFoilColors.length > 0 &&
      specs.coverTextColor &&
      !hardBindingFoilColors.some((c) => c.value === specs.coverTextColor)
    ) {
      fixes.coverTextColor = hardBindingFoilColors[0].value;
    }

    if (Object.keys(fixes).length > 0) {
      dispatch({ type: 'SET_SPEC', payload: fixes });
    }
  }, [
    isCustomizableBinding,
    isHardBinding,
    specs.spiralType,
    specs.coverType,
    specs.coverColor,
    specs.coverTextColor,
    offeredCoilTypes,
    offeredCoverTypes,
    offeredCoverColors,
    hardBindingFoilColors,
    dispatch,
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">
          Print specifications
        </h2>
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
        <label className="label">
          Upload your file <span className="text-red-500">*</span>
        </label>

        {processing ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 py-12 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 font-semibold text-slate-900">
              Analyzing document…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Calculating final page count for pricing
            </p>
          </div>
        ) : file ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <IconFileText className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {file.name}
                </p>
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
                  title={
                    file.previewUrl ? 'View file' : 'Preview not available'
                  }
                >
                  <IconEye className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_FILE', payload: null });
                    dispatch({
                      type: 'SET_SPEC',
                      payload: { totalPages: 0, colorPages: '' },
                    });
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
                  <p className="text-sm font-semibold text-slate-900">
                    Total pages
                  </p>
                  <p className="text-xs text-slate-500">
                    Automatically calculated from PDF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-900">
                    {specs.totalPages || 1}
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    pages
                  </span>
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
              if (event.key === 'Enter' || event.key === ' ')
                inputRef.current?.click();
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
            <p className="mt-1 text-xs text-slate-500">
              Only PDF files are currently accepted · up to 25 MB
            </p>
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
            dispatch({
              type: 'SET_SPEC',
              payload: { serviceId: event.target.value },
            })
          }
          className="input"
        >
          <option value="">Choose a service…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — {formatCurrency(service.startingPrice)}{' '}
              {service.unit}
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
            {offeredPaperTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'SET_SPEC',
                    payload: { paperType: type.value },
                  })
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.paperType === type.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {type.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {type.hint}
                  {(selectedService?.paperTypePrices?.[type.value] ?? 0) >
                    0 && (
                    <strong className="ml-1 text-blue-600">
                      +
                      {formatCurrency(
                        selectedService!.paperTypePrices![type.value],
                      )}
                    </strong>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label">
            Size <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {offeredPaperSizes.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() =>
                  dispatch({ type: 'SET_SPEC', payload: { size: size.value } })
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.size === size.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {size.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {size.hint}
                  {(selectedService?.paperSizePrices?.[size.value] ?? 0) >
                    0 && (
                    <strong className="ml-1 text-blue-600">
                      +
                      {formatCurrency(
                        selectedService!.paperSizePrices![size.value],
                      )}
                    </strong>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

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
                  payload: {
                    quantity: Math.max(1, Number(event.target.value) || 1),
                  },
                })
              }
              className="input text-center font-bold"
            />
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { quantity: specs.quantity + 1 },
                })
              }
              className="btn-secondary h-11 w-11 shrink-0 p-0 text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </section>

        <section>
          <p className="label">
            Colour <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  value: 'bw',
                  label: 'Black & White',
                  hint: 'Most economical',
                },
                { value: 'color', label: 'Colour', hint: 'Full colour print' },
                {
                  value: 'mixed',
                  label: 'Particular pages',
                  hint: 'Choose pages to print in colour',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'SET_SPEC',
                    payload: { colorOption: option.value },
                  })
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  specs.colorOption === option.value
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {specs.colorOption === 'mixed' && (
        <section className="animate-fade-in">
          <label htmlFor="colorPages" className="label">
            Pages to print in colour <span className="text-red-500">*</span>
          </label>
          <textarea
            id="colorPages"
            rows={2}
            value={specs.colorPages || ''}
            onChange={(e) =>
              dispatch({
                type: 'SET_SPEC',
                payload: { colorPages: e.target.value },
              })
            }
            placeholder={`e.g. 1, 5, 10-15${totalPages ? ` (out of ${totalPages} pages)` : ''}`}
            className="input resize-none"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {colorPageCount > 0
              ? `${colorPageCount} of ${totalPages} page${totalPages === 1 ? '' : 's'} will print in colour; the rest stay black & white.`
              : 'List the page numbers (or ranges) you want in colour, e.g. 1, 5, 10-15.'}
          </p>
        </section>
      )}

      {isCustomizableBinding && (
        <section className="animate-fade-in rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Cover Customization
          </h3>

          <div className="space-y-6">
            {isSpiralBinding && (
              <div>
                <p className="label">
                  Spiral Type <span className="text-red-500">*</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {offeredCoilTypes.length > 0 ? (
                    offeredCoilTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_SPEC',
                            payload: { spiralType: type.value },
                          })
                        }
                        className={`rounded-xl border p-3 bg-white text-left transition-all ${
                          specs.spiralType === type.value
                            ? 'border-blue-500 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {type.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {type.hint}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full text-sm text-slate-400">
                      No spiral types offered by this store.
                    </p>
                  )}
                </div>
              </div>
            )}

            {isSpiralBinding && (
              <div>
                <p className="label">
                  Cover type <span className="text-red-500">*</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {offeredCoverTypes.length > 0 ? (
                    offeredCoverTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_SPEC',
                            payload: { coverType: type.value },
                          })
                        }
                        className={`rounded-xl border p-3 bg-white text-left transition-all ${
                          specs.coverType === type.value
                            ? 'border-blue-500 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {type.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {type.hint}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full text-sm text-slate-400">
                      No cover types offered by this store.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="label">
                  Colour for cover <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {offeredCoverColors.length > 0 ? (
                    offeredCoverColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_SPEC',
                            payload: {
                              coverColor: color.value,
                              hardBindingProofApproved: false,
                            },
                          })
                        }
                        title={color.label}
                        className={`h-10 w-10 rounded-full border-2 transition-all ${
                          specs.coverColor === color.value
                            ? 'border-blue-600 ring-2 ring-blue-100'
                            : 'border-white shadow-sm'
                        } ${color.class}`}
                      />
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">
                      No cover colours offered.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="label">
                  Colour for cover text <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {(isHardBinding
                    ? hardBindingFoilColors
                    : COVER_TEXT_COLORS
                  ).map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'SET_SPEC',
                          payload: {
                            coverTextColor: color.value,
                            hardBindingProofApproved: false,
                          },
                        })
                      }
                      title={color.label}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        specs.coverTextColor === color.value
                          ? 'border-blue-600 ring-2 ring-blue-100'
                          : 'border-slate-200 shadow-sm'
                      } ${color.class}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {isHardBinding && (
              <div className="space-y-6 border-t border-slate-200 pt-6">
                <div>
                  <p className="label">
                    Front cover source <span className="text-red-500">*</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        value: 'first-page',
                        label: 'Use first document page',
                        hint: 'Use page one of the uploaded thesis PDF',
                      },
                      {
                        value: 'upload',
                        label: 'Upload separate front cover',
                        hint: 'Single-page portrait PDF only',
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_SPEC',
                            payload: {
                              hardCoverFrontSource: option.value as
                                'first-page' | 'upload',
                              hardBindingProofApproved: false,
                            },
                          })
                        }
                        className={`rounded-xl border bg-white p-3.5 text-left transition-all ${
                          specs.hardCoverFrontSource === option.value
                            ? 'border-blue-500 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {option.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {specs.hardCoverFrontSource === 'first-page' ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                    <p className="font-bold">
                      First-page foil stamping requirements
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>
                        Use pure black or white text only—no gradients, photos,
                        or coloured artwork.
                      </li>
                      <li>
                        Keep at least a 0.8-inch (20 mm) margin around every
                        edge.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="label">
                      Front cover PDF <span className="text-red-500">*</span>
                    </p>
                    <input
                      type="file"
                      id="hard-front-cover"
                      accept="application/pdf,.pdf"
                      onChange={(event) =>
                        void handleCoverUpload(event, 'front')
                      }
                      className="hidden"
                    />
                    <div className="flex items-stretch gap-2">
                      <label
                        htmlFor="hard-front-cover"
                        className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 ${specs.frontCoverFileUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}
                      >
                        {specs.frontCoverFileUrl ? (
                          <>
                            <IconCheckCircle className="h-5 w-5 shrink-0" />
                            <span className="truncate">
                              {specs.frontCoverFileName}
                            </span>
                          </>
                        ) : (
                          <>
                            <IconUpload className="h-5 w-5" /> Upload
                            single-page portrait PDF
                          </>
                        )}
                      </label>
                      {specs.frontCoverFileUrl && (
                        <div className="flex flex-col gap-2">
                          <a
                            href={specs.frontCoverFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary flex-1 p-3"
                            title="View front cover PDF"
                            aria-label="View front cover PDF"
                          >
                            <IconEye className="h-5 w-5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeHardCoverFile('front')}
                            className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white p-3 text-red-600 transition-colors hover:bg-red-50"
                            title="Remove front cover PDF"
                            aria-label="Remove front cover PDF"
                          >
                            <IconTrash className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <p className="label">
                    Back cover PDF{' '}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </p>
                  <input
                    type="file"
                    id="hard-back-cover"
                    accept="application/pdf,.pdf"
                    onChange={(event) => void handleCoverUpload(event, 'back')}
                    className="hidden"
                  />
                  <div className="flex items-stretch gap-2">
                    <label
                      htmlFor="hard-back-cover"
                      className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 ${specs.backCoverFileUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}
                    >
                      {specs.backCoverFileUrl ? (
                        <>
                          <IconCheckCircle className="h-5 w-5 shrink-0" />
                          <span className="truncate">
                            {specs.backCoverFileName}
                          </span>
                        </>
                      ) : (
                        <>
                          <IconUpload className="h-5 w-5" /> Upload single-page
                          portrait PDF
                        </>
                      )}
                    </label>
                    {specs.backCoverFileUrl && (
                      <div className="flex flex-col gap-2">
                        <a
                          href={specs.backCoverFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary flex-1 p-3"
                          title="View back cover PDF"
                          aria-label="View back cover PDF"
                        >
                          <IconEye className="h-5 w-5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeHardCoverFile('back')}
                          className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white p-3 text-red-600 transition-colors hover:bg-red-50"
                          title="Remove back cover PDF"
                          aria-label="Remove back cover PDF"
                        >
                          <IconTrash className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">Paper thickness</span>
                    <select
                      value={paperGsm}
                      onChange={(event) =>
                        dispatch({
                          type: 'SET_SPEC',
                          payload: {
                            paperGsm: Number(event.target.value) as 75 | 100,
                            hardBindingProofApproved: false,
                          },
                        })
                      }
                      className="input"
                    >
                      <option value={75}>75 GSM</option>
                      <option value={100}>100 GSM</option>
                    </select>
                  </label>
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                      Estimated spine width
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-900">
                      {spineWidthMm ? `${spineWidthMm} mm` : 'Upload document'}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      Based on {totalPages} pages at {paperGsm} GSM.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Print text on spine?
                      </span>
                      <span className="text-xs text-slate-500">
                        Recommended for university and library identification.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(specs.printSpineText)}
                      onChange={(event) =>
                        dispatch({
                          type: 'SET_SPEC',
                          payload: {
                            printSpineText: event.target.checked,
                            hardBindingProofApproved: false,
                          },
                        })
                      }
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  {specs.printSpineText && (
                    <div className="mt-4">
                      <label htmlFor="spine-text" className="label">
                        Spine Text (Max 50 characters)
                      </label>
                      <input
                        id="spine-text"
                        maxLength={50}
                        value={specs.spineText ?? ''}
                        onChange={(event) =>
                          dispatch({
                            type: 'SET_SPEC',
                            payload: {
                              spineText: event.target.value,
                              hardBindingProofApproved: false,
                            },
                          })
                        }
                        placeholder="PH.D. THESIS — JOHN DOE — 2026"
                        className="input"
                      />
                      <p className="mt-1 text-right text-xs text-slate-400">
                        {specs.spineText?.length ?? 0}/50
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
                  <p className="font-bold">Foil stamping artwork rules</p>
                  <p className="mt-1">
                    Use bold, clean serif or sans-serif fonts such as Times New
                    Roman or Arial at 12pt or larger. Thin cursive fonts and
                    text below 10pt may blur or bleed.
                  </p>
                </div>

                <div>
                  <p className="label">Digital cover proof</p>
                  <div className="flex min-h-64 items-center justify-center rounded-2xl bg-slate-200 p-6">
                    <div
                      className="flex h-52 w-72 overflow-hidden rounded-md shadow-2xl"
                      style={{
                        backgroundColor: selectedCoverColor?.hex ?? '#000080',
                        color: selectedFoilColor?.hex ?? '#D4AF37',
                      }}
                    >
                      <div className="flex w-12 items-center justify-center border-r border-white/20 p-1">
                        <span className="max-h-44 overflow-hidden text-center text-[9px] font-bold uppercase [writing-mode:vertical-rl]">
                          {specs.printSpineText && specs.spineText
                            ? specs.spineText
                            : 'SPINE'}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-widest">
                          {specs.hardCoverFrontSource === 'first-page'
                            ? 'First document page'
                            : specs.frontCoverFileName || 'Front cover proof'}
                        </p>
                        <p className="mt-4 text-[10px] opacity-80">
                          Hard Bound Thesis
                        </p>
                      </div>
                    </div>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={Boolean(specs.hardBindingProofApproved)}
                      onChange={(event) =>
                        dispatch({
                          type: 'SET_SPEC',
                          payload: {
                            hardBindingProofApproved: event.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      I approve that the text placement on this preview is
                      correct and matches my university guidelines.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {isSpiralBinding && (
              <div>
                <p className="label">
                  Cover Design <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      value: 'default',
                      label: 'Simple Cover',
                      hint: 'Plain or standard',
                    },
                    {
                      value: 'custom',
                      label: 'Custom Designed',
                      hint: 'Both sides personalized',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'SET_SPEC',
                          payload: { coverDesignType: opt.value as any },
                        })
                      }
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        (specs.coverDesignType || 'default') === opt.value
                          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-blue-200 bg-white'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSpiralBinding && specs.coverDesignType === 'custom' ? (
              <div className="space-y-4">
                <p className="label">
                  {isSpiralBinding
                    ? 'Both side cover design'
                    : 'What will be written on cover (Upload)'}{' '}
                  <span className="text-red-500">*</span>
                </p>

                {isSpiralBinding ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Front Cover */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Front Cover
                      </p>
                      <input
                        type="file"
                        id="front-cover"
                        onChange={(e) => handleCoverUpload(e, 'front')}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="front-cover"
                          className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all ${
                            specs.frontCoverFileUrl
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
                          }`}
                        >
                          {specs.frontCoverFileUrl ? (
                            <>
                              <IconCheckCircle className="h-4 w-4" />
                              <span className="truncate text-xs font-semibold">
                                {specs.frontCoverFileName || 'Front Cover'}
                              </span>
                            </>
                          ) : (
                            <>
                              <IconUpload className="h-4 w-4" />
                              <span className="text-xs">Upload Front</span>
                            </>
                          )}
                        </label>
                        {specs.frontCoverFileUrl && (
                          <a
                            href={specs.frontCoverFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary p-3"
                            title="View Front Cover"
                          >
                            <IconEye className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Back Cover */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Back Cover
                      </p>
                      <input
                        type="file"
                        id="back-cover"
                        onChange={(e) => handleCoverUpload(e, 'back')}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="back-cover"
                          className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all ${
                            specs.backCoverFileUrl
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
                          }`}
                        >
                          {specs.backCoverFileUrl ? (
                            <>
                              <IconCheckCircle className="h-4 w-4" />
                              <span className="truncate text-xs font-semibold">
                                {specs.backCoverFileName || 'Back Cover'}
                              </span>
                            </>
                          ) : (
                            <>
                              <IconUpload className="h-4 w-4" />
                              <span className="text-xs">Upload Back</span>
                            </>
                          )}
                        </label>
                        {specs.backCoverFileUrl && (
                          <a
                            href={specs.backCoverFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary p-3"
                            title="View Back Cover"
                          >
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
                          <span className="font-semibold truncate max-w-xs">
                            {specs.coverFileName || 'Cover Design'}
                          </span>
                        </>
                      ) : (
                        <>
                          <IconUpload className="h-6 w-6" />
                          <div className="text-center">
                            <p className="font-semibold">
                              Click to upload cover design
                            </p>
                            <p className="text-xs text-slate-400">
                              Apply to all {specs.quantity} copies
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                    {specs.coverFileUrl && (
                      <a
                        href={specs.coverFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary p-5"
                        title="View Cover"
                      >
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
          onChange={(event) =>
            dispatch({ type: 'SET_INSTRUCTIONS', payload: event.target.value })
          }
          placeholder="e.g. print double-sided, bind pages 1–40 separately…"
          className="input resize-none"
        />
        <p className="mt-1.5 text-right text-xs text-slate-400">
          {instructions.length}/500
        </p>
      </section>
    </div>
  );
}
