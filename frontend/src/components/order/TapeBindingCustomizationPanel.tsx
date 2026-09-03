'use client';

import { useEffect, useMemo, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { TAPE_COLORS as TAPE_COLORS_FALLBACK } from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import type { OrderSpecifications } from '@/lib/types';
import {
  IconCheckCircle,
  IconEye,
  IconTrash,
  IconUpload,
} from '@/components/icons';
import type { OrderAction } from './orderReducer';

interface Props {
  specs: OrderSpecifications;
  dispatch: React.Dispatch<OrderAction>;
  /** Store-offered tape colours; undefined = every catalogue colour. */
  availableTapeColors?: string[];
}

// ── Pure helpers (unit-checked by scripts/check-tape-binding.ts) ──────────

/** Sheets hold two pages at the standard 75/80 GSM caliper (0.1 mm each).
 *  Tape Binding offers no paper-thickness option (owner rule). It needs ≥4 mm
 *  of spine for the thermal tape to grip (hard binding: 2). */
export function estimateTapeSpineMm(totalPages: number): number {
  if (!totalPages || totalPages <= 0) return 0;
  const sheets = Math.ceil(totalPages / 2);
  return Math.max(4, Math.round(sheets * 0.1 * 10) / 10);
}

/** Page-box inches (portrait) for the catalogue sizes → pixels at 300 DPI. */
const SIZE_INCHES: Record<string, [number, number]> = {
  A4: [8.27, 11.69],
  A5: [5.83, 8.27],
  A3: [11.69, 16.54],
};

/** Minimum raster pixel size (w, h) so a cover prints at ≥300 DPI. Unknown
 *  sizes fall back to A4 (ponytail ceiling: catalogue sizes are A4/A5/A3). */
export function requiredPixelsForSize(size: string | undefined): {
  width: number;
  height: number;
} {
  const [w, h] = SIZE_INCHES[size ?? ''] ?? SIZE_INCHES.A4;
  return { width: Math.ceil(w * 300), height: Math.ceil(h * 300) };
}

export function isPortrait(width: number, height: number): boolean {
  return height > width;
}

export function meetsResolution(
  width: number,
  height: number,
  size: string | undefined,
): boolean {
  const min = requiredPixelsForSize(size);
  return width >= min.width && height >= min.height;
}

// ── Panel ──────────────────────────────────────────────────────────────────

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';

export default function TapeBindingCustomizationPanel({
  specs,
  dispatch,
  availableTapeColors,
}: Props) {
  const tapeColors = useCatalogOptions('tape-colors', TAPE_COLORS_FALLBACK);
  const [localError, setLocalError] = useState<string | null>(null);

  const offeredTapeColors = useMemo(
    () =>
      availableTapeColors
        ? tapeColors.filter((color) => availableTapeColors.includes(color.value))
        : [...tapeColors],
    [tapeColors, availableTapeColors],
  );

  // Tape colour is mandatory: default to the first offered one and move a
  // selection the seller no longer offers back into the offered set.
  useEffect(() => {
    if (offeredTapeColors.length === 0) return;
    if (
      !specs.tapeColor ||
      !offeredTapeColors.some((color) => color.value === specs.tapeColor)
    ) {
      dispatch({
        type: 'SET_SPEC',
        payload: { tapeColor: offeredTapeColors[0].value },
      });
    }
  }, [offeredTapeColors, specs.tapeColor, dispatch]);

  const totalPages = specs.totalPages || 0;
  const spineWidthMm = estimateTapeSpineMm(totalPages);
  const selectedTape = offeredTapeColors.find(
    (color) => color.value === specs.tapeColor,
  );
  const coverSource = specs.tapeCoverSource ?? 'first-page';

  const readImageSize = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('unreadable image'));
      };
      image.src = url;
    });

  /** Returns an error message, or null when the cover file is usable. */
  const validateCoverFile = async (file: File): Promise<string | null> => {
    if (file.size > MAX_BYTES) {
      return 'The cover design is larger than 25 MB — compress it and try again.';
    }
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      try {
        const pdf = await PDFDocument.load(await file.arrayBuffer(), {
          ignoreEncryption: true,
        });
        if (pdf.getPageCount() !== 1) {
          return 'The cover PDF must contain exactly one page.';
        }
        const { width, height } = pdf.getPage(0).getSize();
        if (!isPortrait(width, height)) {
          return 'The cover PDF must use portrait orientation.';
        }
        // DPI check is raster-only; PDFs are vector (ponytail ceiling — the
        // press preflight catches low-res embedded images).
        return null;
      } catch {
        return 'Could not read that PDF — upload a valid, unprotected file.';
      }
    }
    if (/^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name)) {
      try {
        const { width, height } = await readImageSize(file);
        if (!isPortrait(width, height)) {
          return 'Cover artwork must use portrait orientation.';
        }
        const min = requiredPixelsForSize(specs.size);
        if (!meetsResolution(width, height, specs.size)) {
          return `Cover artwork must be 300 DPI minimum — at least ${min.width}×${min.height} px for ${
            specs.size ?? 'A4'
          } (yours is ${width}×${height} px).`;
        }
        return null;
      } catch {
        return 'Could not read that image — upload a PNG or JPG file.';
      }
    }
    return 'Unsupported file type — upload a PDF, PNG or JPG design.';
  };

  const handleCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back',
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const error = await validateCoverFile(selected);
    if (error) {
      setLocalError(error);
      event.target.value = '';
      return;
    }
    setLocalError(null);
    const previewUrl = URL.createObjectURL(selected);
    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? {
              tapeFrontCoverFileUrl: previewUrl,
              tapeFrontCoverFileName: selected.name,
            }
          : {
              tapeBackCoverFileUrl: previewUrl,
              tapeBackCoverFileName: selected.name,
            },
    });
  };

  const removeCover = (side: 'front' | 'back') => {
    const url =
      side === 'front' ? specs.tapeFrontCoverFileUrl : specs.tapeBackCoverFileUrl;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? { tapeFrontCoverFileUrl: undefined, tapeFrontCoverFileName: undefined }
          : { tapeBackCoverFileUrl: undefined, tapeBackCoverFileName: undefined },
    });
  };

  const isImage = (name?: string) => /\.(png|jpe?g)$/i.test(name ?? '');

  const renderUpload = (
    side: 'front' | 'back',
    label: string,
    required: boolean,
  ) => {
    const url = side === 'front' ? specs.tapeFrontCoverFileUrl : specs.tapeBackCoverFileUrl;
    const name = side === 'front' ? specs.tapeFrontCoverFileName : specs.tapeBackCoverFileName;
    return (
      <div>
        <p className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <input
          type="file"
          id={`tape-${side}-cover`}
          accept={ACCEPT}
          onChange={(event) => void handleCoverUpload(event, side)}
          className="hidden"
        />
        <div className="flex items-stretch gap-2">
          <label
            htmlFor={`tape-${side}-cover`}
            className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 ${
              url
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
            }`}
          >
            {url ? (
              <>
                <IconCheckCircle className="h-5 w-5 shrink-0" />
                <span className="truncate">{name}</span>
              </>
            ) : (
              <>
                <IconUpload className="h-5 w-5" /> Upload single-page design
                (PDF/PNG/JPG, 300 DPI minimum)
              </>
            )}
          </label>
          {url && (
            <div className="flex flex-col gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex-1 p-3"
                title="View design"
              >
                <IconEye className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => removeCover(side)}
                className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white p-3 text-red-600 transition-colors hover:bg-red-50"
                title={`Remove ${side} cover`}
                aria-label={`Remove ${side} cover`}
              >
                <IconTrash className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const frontVisual = () => {
    if (coverSource === 'first-page') {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 p-4 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            First document page
          </span>
          <span className="text-[10px] text-slate-400">
            Page one of your uploaded file becomes the front cover
          </span>
        </div>
      );
    }
    if (isImage(specs.tapeFrontCoverFileName)) {
      return (
        // The artwork proof previews exactly what the customer uploaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={specs.tapeFrontCoverFileUrl}
          alt="Front cover design preview"
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 p-4 text-center">
        <IconEye className="h-6 w-6 text-slate-300" />
        <span className="max-w-full truncate text-[10px] text-slate-400">
          {specs.tapeFrontCoverFileName ?? 'Front cover PDF'}
        </span>
      </div>
    );
  };

  const spinePx = Math.min(60, Math.max(10, Math.round(spineWidthMm * 3)));

  return (
    <section className="animate-fade-in space-y-6 border-t border-slate-200 pt-6">
      {localError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {localError}
        </p>
      )}

      <div>
        <p className="label">
          Tape Colour <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {offeredTapeColors.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-pressed={specs.tapeColor === color.value}
              onClick={() =>
                dispatch({ type: 'SET_SPEC', payload: { tapeColor: color.value } })
              }
              className={`flex items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition-all ${
                specs.tapeColor === color.value
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-slate-200"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-sm font-semibold text-slate-900">
                {color.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
          Estimated Spine Width
        </p>
        <p className="mt-1 text-xl font-bold text-blue-900">
          {spineWidthMm ? `${spineWidthMm} mm` : 'Upload document'}
        </p>
        <p className="mt-1 text-xs text-blue-700">
          Auto-calculated from {totalPages} page{totalPages === 1 ? '' : 's'} at
          standard 75 GSM paper.
        </p>
      </div>

      <div>
        <p className="label">
          Cover Source <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              value: 'first-page' as const,
              label: 'Use first document page',
              hint: 'Page one of your uploaded document becomes the front cover',
            },
            {
              value: 'upload' as const,
              label: 'Upload separate front cover',
              hint: 'Upload single-page design (PDF/PNG/JPG/JPEG, 300 DPI minimum)',
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={coverSource === option.value}
              onClick={() =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { tapeCoverSource: option.value },
                })
              }
              className={`rounded-xl border bg-white p-3.5 text-left transition-all ${
                coverSource === option.value
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

      {coverSource === 'upload' && renderUpload('front', 'Front cover', true)}
      {renderUpload('back', 'Back Cover (optional)', false)}

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <p className="label">Preview</p>
        <div className="flex flex-wrap items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-64 w-44 overflow-hidden rounded-md border border-slate-300 bg-white shadow-md">
              {frontVisual()}
              {/* The tape strip wraps the left edge of the bound stack. */}
              <div
                className="absolute inset-y-0 left-0 border-r border-black/10"
                style={{
                  width: spinePx,
                  backgroundColor: selectedTape?.hex ?? '#111827',
                }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              Front · {selectedTape?.label ?? 'Black'} tape
              {spineWidthMm ? ` · ${spineWidthMm} mm spine` : ''}
            </span>
          </div>

          {specs.tapeBackCoverFileUrl && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-64 w-44 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-md">
                {isImage(specs.tapeBackCoverFileName) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={specs.tapeBackCoverFileUrl}
                    alt="Back cover design preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <IconEye className="h-6 w-6 text-slate-300" />
                    <span className="max-w-full truncate text-[10px] text-slate-400">
                      {specs.tapeBackCoverFileName ?? 'Back cover PDF'}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-slate-500">Back cover</span>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Preview shows the tape strip along the left edge. Prices follow the
          store&apos;s per-document rate — tape colour adds no extra charge.
        </p>
      </div>
    </section>
  );
}
