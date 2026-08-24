'use client';

import { useEffect, useMemo, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { TWIN_LOOP_WIRE_COLORS } from '@/lib/domain/stores';
import type { OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  IconCheckCircle,
  IconEye,
  IconTrash,
  IconUpload,
} from '@/components/icons';
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

function CoverUpload({
  side,
  printSides,
  fileUrl,
  fileName,
  dispatch,
  onError,
}: {
  side: 'front' | 'back';
  printSides: 'outside' | 'both';
  fileUrl?: string;
  fileName?: string;
  dispatch: React.Dispatch<OrderAction>;
  onError: (message: string | null) => void;
}) {
  const id = `twin-loop-${side}-cover`;

  const upload = async (file?: File) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    const isImage = ['image/jpeg', 'image/png'].includes(file.type);
    if (!isPdf && !isImage) {
      onError('Twin Loop cover artwork must be a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      onError('Twin Loop cover artwork must be 25 MB or smaller.');
      return;
    }
    if (printSides === 'both' && !isPdf) {
      onError(`A both-sides ${side} cover must be supplied as a two-page PDF.`);
      return;
    }
    if (isPdf) {
      try {
        const pdf = await PDFDocument.load(await file.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const requiredPages = printSides === 'both' ? 2 : 1;
        if (pdf.getPageCount() !== requiredPages) {
          onError(
            `${side === 'front' ? 'Front' : 'Back'} cover PDF must contain exactly ${requiredPages} page${requiredPages === 1 ? '' : 's'}.`,
          );
          return;
        }
      } catch {
        onError(
          'Could not read that cover PDF. Upload a valid, unprotected file.',
        );
        return;
      }
    }

    onError(null);
    const url = URL.createObjectURL(file);
    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? { twinLoopFrontFileUrl: url, twinLoopFrontFileName: file.name }
          : { twinLoopBackFileUrl: url, twinLoopBackFileName: file.name },
    });
  };

  const remove = () => {
    if (fileUrl?.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.value = '';
    dispatch({
      type: 'SET_SPEC',
      payload:
        side === 'front'
          ? {
              twinLoopFrontFileUrl: undefined,
              twinLoopFrontFileName: undefined,
            }
          : { twinLoopBackFileUrl: undefined, twinLoopBackFileName: undefined },
    });
  };

  return (
    <div>
      <p className="label">
        {side === 'front' ? 'Front' : 'Back'} Cover Design{' '}
        <span className="text-red-500">*</span>
      </p>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        onChange={(event) => void upload(event.target.files?.[0])}
        className="hidden"
      />
      <div className="flex items-stretch gap-2">
        <label
          htmlFor={id}
          className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 ${fileUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}
        >
          {fileUrl ? (
            <>
              <IconCheckCircle className="h-5 w-5 shrink-0" />
              <span className="truncate">{fileName}</span>
            </>
          ) : (
            <>
              <IconUpload className="h-5 w-5" />
              Upload{' '}
              {printSides === 'both' ? 'two-page PDF' : 'PDF, JPG, or PNG'}
            </>
          )}
        </label>
        {fileUrl && (
          <div className="flex flex-col gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex-1 p-3"
              title={`View ${side} cover`}
            >
              <IconEye className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={remove}
              className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white p-3 text-red-600 hover:bg-red-50"
              title={`Remove ${side} cover`}
            >
              <IconTrash className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TwinLoopCustomizationPanel({
  specs,
  service,
  dispatch,
}: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const config = service?.twinLoopOptions;
  const wireColors = useMemo(
    () => offered(TWIN_LOOP_WIRE_COLORS, config?.wireColors),
    [config?.wireColors],
  );

  useEffect(() => {
    if (
      wireColors.length &&
      !wireColors.some((option) => option.value === specs.twinLoopWireColor)
    ) {
      dispatch({
        type: 'SET_SPEC',
        payload: { twinLoopWireColor: wireColors[0].value },
      });
    }
  }, [specs.twinLoopWireColor, wireColors, dispatch]);

  const totalPages = specs.totalPages ?? 0;
  const innerPages =
    specs.twinLoopCoverSubmission === 'embedded'
      ? Math.max(0, totalPages - 2)
      : totalPages;
  const totalSheets = innerPages
    ? (specs.twinLoopPrintSides === 'single'
        ? innerPages
        : Math.ceil(innerPages / 2)) + 2
    : 0;
  const pitch = innerPages <= 120 ? '3:1' : '2:1';
  const stackMm =
    totalSheets * ((specs.paperGsm ?? 75) === 100 ? 0.13 : 0.1) + 0.6;
  const selectedWire = TWIN_LOOP_WIRE_COLORS.find(
    (option) => option.value === specs.twinLoopWireColor,
  );
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
        <div>
          <p className="label">
            Cover artwork submission <span className="text-red-500">*</span>
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                value: 'embedded',
                label: 'Single Master PDF',
                hint: 'Page 1 front cover · middle inner pages · last page back cover',
              },
              {
                value: 'split',
                label: 'Split File Uploads',
                hint: 'Separate front cover, inner PDF, and back cover files',
              },
              {
                value: 'mirror',
                label: 'Quick Mirror Back',
                hint: 'Use the first master-PDF page for front; solid or blank back',
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'SET_SPEC',
                    payload: {
                      twinLoopCoverSubmission: option.value as
                        'embedded' | 'split' | 'mirror',
                      twinLoopFrontCover: 'heavy-cardstock',
                      twinLoopBackCover: 'matching-front',
                    },
                  })
                }
                className={`rounded-xl border p-3.5 text-left ${
                  specs.twinLoopCoverSubmission === option.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {specs.twinLoopCoverSubmission === 'embedded' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">Master PDF page mapping</p>
            <p className="mt-1 text-xs">
              Page 1 is the front cover, pages 2 through{' '}
              {Math.max(2, totalPages - 1)} are inner content, and page{' '}
              {totalPages || 'N'} is the back cover. Upload at least three
              pages.
            </p>
          </div>
        )}

        {specs.twinLoopCoverSubmission === 'split' && (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4">
            {uploadError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {uploadError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label">Front cover printing</p>
                <select
                  value={specs.twinLoopFrontPrintSides ?? 'outside'}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_SPEC',
                      payload: {
                        twinLoopFrontPrintSides: event.target.value as
                          'outside' | 'both',
                        twinLoopFrontFileUrl: undefined,
                        twinLoopFrontFileName: undefined,
                      },
                    })
                  }
                  className="input"
                >
                  <option value="outside">Print outside only</option>
                  <option value="both">Print both sides (2-page PDF)</option>
                </select>
              </div>
              <div>
                <p className="label">Back cover printing</p>
                <select
                  value={specs.twinLoopBackPrintSides ?? 'outside'}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_SPEC',
                      payload: {
                        twinLoopBackPrintSides: event.target.value as
                          'outside' | 'both',
                        twinLoopBackFileUrl: undefined,
                        twinLoopBackFileName: undefined,
                      },
                    })
                  }
                  className="input"
                >
                  <option value="outside">Print outside only</option>
                  <option value="both">Print both sides (2-page PDF)</option>
                </select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <CoverUpload
                side="front"
                printSides={specs.twinLoopFrontPrintSides ?? 'outside'}
                fileUrl={specs.twinLoopFrontFileUrl}
                fileName={specs.twinLoopFrontFileName}
                dispatch={dispatch}
                onError={setUploadError}
              />
              <CoverUpload
                side="back"
                printSides={specs.twinLoopBackPrintSides ?? 'outside'}
                fileUrl={specs.twinLoopBackFileUrl}
                fileName={specs.twinLoopBackFileName}
                dispatch={dispatch}
                onError={setUploadError}
              />
            </div>
            <p className="text-xs text-slate-500">
              The main document upload above is used only for the inner content
              pages in split mode.
            </p>
          </div>
        )}

        {specs.twinLoopCoverSubmission === 'mirror' && (
          <div>
            <p className="label">Quick back cover</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: 'wire-color',
                  label: 'Solid colour matching wire / theme',
                },
                { value: 'blank-white', label: 'Blank white back cover' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_SPEC',
                      payload: {
                        twinLoopMirrorBack: option.value as
                          'wire-color' | 'blank-white',
                      },
                    })
                  }
                  className={`rounded-xl border p-3 text-left text-sm font-semibold ${specs.twinLoopMirrorBack === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="twin-cover-material" className="label">
            Printable cover material <span className="text-red-500">*</span>
          </label>
          <select
            id="twin-cover-material"
            value={specs.twinLoopCoverMaterial ?? 'gloss-300'}
            onChange={(event) =>
              dispatch({
                type: 'SET_SPEC',
                payload: {
                  twinLoopCoverMaterial: event.target.value as
                    'gloss-300' | 'matte-350',
                },
              })
            }
            className="input"
          >
            <option value="gloss-300">
              300 GSM Gloss Art Card — vibrant colour
            </option>
            <option value="matte-350">
              350 GSM Matte Card with Lamination — premium scratch resistance
            </option>
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Clear acetate is intentionally unavailable for custom printed
            artwork.
          </p>
        </div>

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

        <div>
          <p className="label">Binding preview</p>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 p-6">
            <div className="relative flex h-52 w-72 items-center justify-center">
              <div className="absolute left-4 top-3 h-48 w-56 rotate-[-4deg] rounded-r-lg border border-slate-300 bg-white shadow-lg" />
              <div
                className={`absolute ${specs.twinLoopBindingEdge === 'top' ? 'left-8 top-1 flex-row' : 'left-1 top-5 flex-col'} flex gap-1.5`}
              >
                {Array.from({ length: 10 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-4 w-4 rounded-full border-4 border-slate-500 ${selectedWire?.class ?? 'bg-black'}`}
                  />
                ))}
              </div>
              <div className="relative flex h-48 w-56 flex-col items-center justify-center rounded-r-lg border border-slate-300 bg-gradient-to-br from-white to-slate-100 p-6 text-center shadow-xl">
                <p className="text-sm font-bold text-slate-800">CUSTOM COVER</p>
                <p className="mt-2 text-xs text-slate-500">
                  {specs.twinLoopCoverMaterial === 'matte-350'
                    ? '350 GSM Matte Laminated'
                    : '300 GSM Gloss Art Card'}
                </p>
                <p className="mt-6 text-[10px] uppercase text-slate-400">
                  {specs.twinLoopBindingEdge} edge ·{' '}
                  {selectedWire?.label ?? 'Wire'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <p className="font-bold">360-degree back-cover flip rule</p>
          <p className="mt-1 text-xs leading-relaxed">
            Upload the back cover exactly like a normal upright page—never
            upside down or mirrored. When the book opens flat, the back rotates
            naturally into position.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={Boolean(specs.twinLoopFlipAcknowledged)}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { twinLoopFlipAcknowledged: event.target.checked },
                })
              }
              className="mt-0.5 h-5 w-5 rounded border-violet-300 text-blue-600"
            />
            <span className="text-xs font-semibold">
              I confirm the back cover artwork is upright and not mirrored.
            </span>
          </label>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
          <p className="font-bold">3 mm edge bleed</p>
          <p className="mt-1 text-xs leading-relaxed">
            Extend cover backgrounds 0.125 inches (3 mm) beyond every trim edge
            to prevent white borders after cutting.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={Boolean(specs.twinLoopBleedAcknowledged)}
              onChange={(event) =>
                dispatch({
                  type: 'SET_SPEC',
                  payload: { twinLoopBleedAcknowledged: event.target.checked },
                })
              }
              className="mt-0.5 h-5 w-5 rounded border-cyan-300 text-blue-600"
            />
            <span className="text-xs font-semibold">
              I confirm my cover artwork includes a 3 mm bleed on all sides.
            </span>
          </label>
        </div>

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
