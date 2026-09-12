'use client';

import { useState } from 'react';
import {
  COVER_ACCEPT,
  estimateWrapSpineMm,
  validateCoverArtwork,
} from './bindingCover';
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
}

/**
 * Glue Binding (thermal-glued paperback spine) customization: cover source,
 * optional back cover, the auto spine-width estimate and a binding preview.
 * No colour/thickness options — mirrors Tape Binding minus its colour grid.
 */
export default function GlueBindingCustomizationPanel({ specs, dispatch }: Props) {
  const [localError, setLocalError] = useState<string | null>(null);

  const totalPages = specs.totalPages || 0;
  // Glued paperbacks need ≥3 mm of spine for the glue to grip (tape: 4).
  const spineWidthMm = estimateWrapSpineMm(totalPages, 3);
  const coverSource = specs.glueCoverSource ?? 'first-page';

  const handleCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back',
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const error = await validateCoverArtwork(selected, specs.size);
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
              glueFrontCoverFileUrl: previewUrl,
              glueFrontCoverFileName: selected.name,
            }
          : {
              glueBackCoverFileUrl: previewUrl,
              glueBackCoverFileName: selected.name,
            },
    });
  };

  const removeCover = (side: 'front' | 'back') => {
    const url =
      side === 'front' ? specs.glueFrontCoverFileUrl : specs.glueBackCoverFileUrl;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? { glueFrontCoverFileUrl: undefined, glueFrontCoverFileName: undefined }
          : { glueBackCoverFileUrl: undefined, glueBackCoverFileName: undefined },
    });
  };

  const isImage = (name?: string) => /\.(png|jpe?g)$/i.test(name ?? '');

  const renderUpload = (
    side: 'front' | 'back',
    label: string,
    required: boolean,
  ) => {
    const url = side === 'front' ? specs.glueFrontCoverFileUrl : specs.glueBackCoverFileUrl;
    const name = side === 'front' ? specs.glueFrontCoverFileName : specs.glueBackCoverFileName;
    return (
      <div>
        <p className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <input
          type="file"
          id={`glue-${side}-cover`}
          accept={COVER_ACCEPT}
          onChange={(event) => void handleCoverUpload(event, side)}
          className="hidden"
        />
        <div className="flex items-stretch gap-2">
          <label
            htmlFor={`glue-${side}-cover`}
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
    if (isImage(specs.glueFrontCoverFileName)) {
      return (
        // The artwork proof previews exactly what the customer uploaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={specs.glueFrontCoverFileUrl}
          alt="Front cover design preview"
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 p-4 text-center">
        <IconEye className="h-6 w-6 text-slate-300" />
        <span className="max-w-full truncate text-[10px] text-slate-400">
          {specs.glueFrontCoverFileName ?? 'Front cover PDF'}
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
                  payload: { glueCoverSource: option.value },
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
              {/* The glued spine is just the milled edge of the stack — shown
                  as a neutral band since there's no tape/colour choice. */}
              <div
                className="absolute inset-y-0 left-0 border-r border-black/10 bg-slate-300"
                style={{ width: spinePx }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              Front · glued spine
              {spineWidthMm ? ` · ${spineWidthMm} mm` : ''}
            </span>
          </div>

          {specs.glueBackCoverFileUrl && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-64 w-44 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-md">
                {isImage(specs.glueBackCoverFileName) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={specs.glueBackCoverFileUrl}
                    alt="Back cover design preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <IconEye className="h-6 w-6 text-slate-300" />
                    <span className="max-w-full truncate text-[10px] text-slate-400">
                      {specs.glueBackCoverFileName ?? 'Back cover PDF'}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-slate-500">Back cover</span>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Preview shows the glued spine edge along the left. Prices follow the
          store&apos;s per-document rate.
        </p>
      </div>
    </section>
  );
}
