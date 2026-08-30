'use client';

import { useMemo, useState } from 'react';
import {
  CARD_PAPERS as CARD_PAPERS_FALLBACK,
  CARD_PRINT_SIDES as CARD_PRINT_SIDES_FALLBACK,
  CARD_SHAPES as CARD_SHAPES_FALLBACK,
  CARD_SIZES as CARD_SIZES_FALLBACK,
  CARD_CORNERS as CARD_CORNERS_FALLBACK,
} from '@/lib/domain/stores';
import { useCatalogOptions } from '@/lib/api/catalog';
import type { OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  IconCheckCircle,
  IconFileText,
  IconPencil,
  IconTrash,
  IconType,
  IconUpload,
} from '@/components/icons';
import CardStudio, { type StudioResult } from './card-studio/CardStudio';
import { SIZE_ASPECT, shapeStyle } from './card-studio/model';
import type { OrderAction } from './orderReducer';

interface Props {
  specs: OrderSpecifications;
  service: ServiceOffering | undefined;
  dispatch: React.Dispatch<OrderAction>;
}

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
const TEMPLATES = ['t1', 't2', 't3', 't4'];

/** Subtle material tint layered over the design so previews read texture. */
const PAPER_OVERLAY: Record<string, string | undefined> = {
  glossy: 'bg-gradient-to-br from-white/35 via-transparent to-black/10',
  'premium-plus-glossy': 'bg-gradient-to-br from-white/45 via-transparent to-black/15',
  velvet: 'bg-slate-900/10',
  'non-tearable': 'bg-white/10',
  'spot-uv': 'bg-gradient-to-tr from-amber-100/30 via-transparent to-white/25',
  pearl: 'bg-gradient-to-br from-white/30 via-transparent to-sky-100/30',
  kraft: 'bg-[#8a6a3f]/35',
  diamond: 'bg-gradient-to-br from-fuchsia-100/25 via-transparent to-cyan-100/25',
  'raised-foil': 'bg-gradient-to-br from-yellow-100/40 via-transparent to-amber-300/20',
  magnetic: 'bg-slate-700/25',
  transparent: 'bg-white/50 backdrop-blur-[1px]',
};

function ChoiceGrid({
  title,
  required,
  options,
  selected,
  disabledValue,
  onSelect,
}: {
  title: string;
  required?: boolean;
  options: ReadonlyArray<{ value: string; label: string; hint?: string }>;
  selected?: string;
  disabledValue?: (value: string) => boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="label">
        {title} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const disabled = disabledValue?.(option.value) ?? false;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.value)}
              className={`rounded-xl border p-3 text-left transition-all ${
                selected === option.value
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 opacity-40'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {option.label}
              </span>
              {option.hint && (
                <span className="mt-0.5 block text-xs text-slate-500">
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesignUpload({
  side,
  fileUrl,
  fileName,
  required,
  onFile,
  onRemove,
}: {
  side: 'front' | 'back';
  fileUrl?: string;
  fileName?: string;
  required?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = `card-design-${side}`;
  return (
    <div>
      <p className="label capitalize">
        {side} design file {required && <span className="text-red-500">*</span>}
      </p>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm ${
          fileUrl
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
        }`}
      >
        {fileUrl ? (
          <>
            <IconCheckCircle className="h-4 w-4 shrink-0" />
            <span className="truncate font-semibold">{fileName}</span>
          </>
        ) : (
          <>
            <IconUpload className="h-4 w-4 shrink-0" /> Upload single-page
            design (PDF / PNG / JPG, 300 DPI)
          </>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {fileUrl && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          <IconTrash className="h-3.5 w-3.5" /> Remove {side} design
        </button>
      )}
    </div>
  );
}

export default function BusinessCardCustomizationPanel({
  specs,
  service,
  dispatch,
}: Props) {
  const shapes = useCatalogOptions('card-shapes', CARD_SHAPES_FALLBACK);
  const papers = useCatalogOptions('card-papers', CARD_PAPERS_FALLBACK);
  const sizes = useCatalogOptions('card-sizes', CARD_SIZES_FALLBACK);
  const corners = useCatalogOptions('card-corners', CARD_CORNERS_FALLBACK);
  const printSides = useCatalogOptions('card-print-sides', CARD_PRINT_SIDES_FALLBACK);

  const setSpec = (payload: Partial<OrderSpecifications>) =>
    dispatch({ type: 'SET_SPEC', payload });

  const slabs = useMemo(
    () => [...(service?.quantitySlabs ?? [])].sort((a, b) => a.qty - b.qty),
    [service?.quantitySlabs],
  );
  const activeRate = slabs.length
    ? ([...slabs].reverse().find((s) => specs.quantity >= s.qty) ?? slabs[0]).rate
    : undefined;
  const isCustomQty = !slabs.some((s) => s.qty === specs.quantity);

  const setDesignFile = (side: 'front' | 'back', file: File) => {
    const url = URL.createObjectURL(file);
    setSpec(
      side === 'front'
        ? { cardFrontFileUrl: url, cardFrontFileName: file.name, cardProofApproved: false }
        : { cardBackFileUrl: url, cardBackFileName: file.name, cardProofApproved: false },
    );
  };

  const removeDesignFile = (side: 'front' | 'back') => {
    const url = side === 'front' ? specs.cardFrontFileUrl : specs.cardBackFileUrl;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    setSpec(
      side === 'front'
        ? { cardFrontFileUrl: undefined, cardFrontFileName: undefined, cardProofApproved: false }
        : { cardBackFileUrl: undefined, cardBackFileName: undefined, cardProofApproved: false },
    );
  };

  const rounded = specs.cardCorners === 'rounded';
  const circleLike = ['circle', 'oval', 'leaf'].includes(specs.cardShape ?? '');
  const aspect = SIZE_ASPECT[specs.cardSize ?? 'standard'] ?? '89 / 51';
  const previewShape = { ...shapeStyle(specs.cardShape, rounded, aspect) };
  const overlay = PAPER_OVERLAY[specs.cardPaper ?? ''];

  const [studioOpen, setStudioOpen] = useState(false);

  /** Studio exported a fresh 300-DPI PNG per side — adopt them like uploads. */
  const handleStudioSave = (result: StudioResult) => {
    for (const url of [specs.cardFrontFileUrl, specs.cardBackFileUrl]) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    }
    setSpec({
      cardDesignSource: 'editor',
      cardFrontFileUrl: URL.createObjectURL(result.frontFile),
      cardFrontFileName: result.frontFile.name,
      cardStudioFront: result.frontDoc,
      cardStudioBack: result.backDoc,
      cardProofApproved: false,
      ...(result.backFile
        ? {
            cardBackFileUrl: URL.createObjectURL(result.backFile),
            cardBackFileName: result.backFile.name,
          }
        : { cardBackFileUrl: undefined, cardBackFileName: undefined }),
    });
    setStudioOpen(false);
  };

  const previewFor = (side: 'front' | 'back') => {
    const url =
      side === 'front'
        ? specs.cardDesignSource === 'template'
          ? `/images/templates/business-cards/${specs.cardTemplate}.jpg`
          : specs.cardFrontFileUrl
        : specs.cardBackFileUrl;
    const isPdf = url?.toLowerCase().endsWith('.pdf') || url?.startsWith('blob:') && (side === 'front' ? specs.cardFrontFileName : specs.cardBackFileName)?.toLowerCase().endsWith('.pdf');
    return { url: isPdf ? undefined : url, isPdf };
  };

  const PreviewCard = ({ side }: { side: 'front' | 'back' }) => {
    const { url, isPdf } = previewFor(side);
    return (
      <div className="flex-1">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {side}
        </p>
        <div
          className="relative mx-auto w-full max-w-xs overflow-hidden border border-slate-200 bg-white shadow-lg"
          style={previewShape}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${side} design preview`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center">
              {isPdf ? (
                <span className="flex flex-col items-center gap-1 text-slate-500">
                  <IconFileText className="h-6 w-6" />
                  {/* ponytail: PDF designs show as a name tile — rendering a
                      PDF into the live preview needs pdf.js; open the file
                      from the upload row to inspect it. */}
                  <span className="line-clamp-2 text-[10px] font-semibold">
                    {side === 'front' ? specs.cardFrontFileName : specs.cardBackFileName}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-300">
                  {side === 'front' ? 'Front design preview' : 'Blank reverse'}
                </span>
              )}
            </div>
          )}
          {overlay && <div className={`pointer-events-none absolute inset-0 ${overlay}`} />}
        </div>
      </div>
    );
  };

  return (
    <section className="animate-fade-in space-y-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
      <h3 className="text-lg font-bold text-slate-900">Business Card Customization</h3>

      <ChoiceGrid
        title="Shape"
        required
        options={shapes}
        selected={specs.cardShape}
        onSelect={(value) =>
          setSpec({
            cardShape: value,
            // Rounded corners can't be die-cut on curved shapes — fold back.
            ...(rounded && ['circle', 'oval', 'leaf'].includes(value)
              ? { cardCorners: 'standard' }
              : {}),
          })
        }
      />

      <ChoiceGrid
        title="Paper / Texture"
        required
        options={papers}
        selected={specs.cardPaper}
        onSelect={(value) => setSpec({ cardPaper: value })}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChoiceGrid
          title="Card size"
          required
          options={sizes}
          selected={specs.cardSize}
          onSelect={(value) => setSpec({ cardSize: value })}
        />
        <div>
          <ChoiceGrid
            title="Corners"
            required
            options={corners}
            selected={specs.cardCorners}
            disabledValue={(value) =>
              circleLike &&
              Boolean(
                corners.find((c) => c.value === value)?.incompatibleWith?.includes(
                  specs.cardShape ?? '',
                ),
              )
            }
            onSelect={(value) => setSpec({ cardCorners: value })}
          />
          {circleLike && (
            <p className="mt-1.5 text-xs text-amber-600">
              Rounded corners aren’t available for circle, oval and leaf shapes.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="label">
          Quantity <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {slabs.map((slab) => (
            <button
              key={slab.qty}
              type="button"
              onClick={() => setSpec({ quantity: slab.qty })}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                specs.quantity === slab.qty
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              {slab.qty}
            </button>
          ))}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${
              isCustomQty ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200'
            }`}
          >
            <span className="text-sm font-semibold text-slate-600">Custom</span>
            <input
              type="number"
              min={slabs[0]?.qty ?? service?.minQuantity ?? 1}
              value={isCustomQty ? specs.quantity : ''}
              placeholder="e.g. 750"
              onChange={(event) =>
                setSpec({
                  quantity: Math.max(
                    service?.minQuantity ?? 1,
                    Number(event.target.value) || (service?.minQuantity ?? 1),
                  ),
                })
              }
              className="w-20 bg-transparent text-sm font-semibold outline-none"
            />
          </div>
        </div>
        {slabs.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pricing guide — price per piece drops as quantity grows
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {slabs.map((slab) => (
                <span key={slab.qty} className="text-xs text-slate-600">
                  <strong className="text-slate-900">{slab.qty}+</strong> →{' '}
                  {formatCurrency(slab.rate)}/card
                </span>
              ))}
            </div>
            {activeRate !== undefined && (
              <p className="mt-2 text-sm font-semibold text-blue-700">
                You pay {formatCurrency(activeRate)} × {specs.quantity} cards ={' '}
                {formatCurrency(activeRate * specs.quantity)}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="label">
          Design source <span className="text-red-500">*</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { value: 'template', label: 'Browse ready templates', hint: 'Pick from common layouts and add your details' },
              { value: 'upload', label: 'Upload your own design', hint: 'Print-ready artwork at 300 DPI' },
              { value: 'editor', label: 'Design online', hint: 'Make your card in our free studio — no artwork needed' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSpec({ cardDesignSource: option.value })}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                specs.cardDesignSource === option.value
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
            </button>
          ))}
        </div>

        {specs.cardDesignSource === 'template' && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TEMPLATES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSpec({ cardTemplate: id, cardProofApproved: false })}
                className={`overflow-hidden rounded-xl border-2 transition-all ${
                  specs.cardTemplate === id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/templates/business-cards/${id}.jpg`}
                  alt={`Template ${id}`}
                  className="aspect-[89/51] w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {specs.cardDesignSource === 'upload' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DesignUpload
              side="front"
              required
              fileUrl={specs.cardFrontFileUrl}
              fileName={specs.cardFrontFileName}
              onFile={(file) => setDesignFile('front', file)}
              onRemove={() => removeDesignFile('front')}
            />
            {specs.cardPrintSides === 'double' && (
              <DesignUpload
                side="back"
                fileUrl={specs.cardBackFileUrl}
                fileName={specs.cardBackFileName}
                onFile={(file) => setDesignFile('back', file)}
                onRemove={() => removeDesignFile('back')}
              />
            )}
          </div>
        )}

        {specs.cardDesignSource === 'editor' && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            {specs.cardFrontFileUrl ? (
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={specs.cardFrontFileUrl}
                  alt="Saved card design"
                  className="h-16 rounded-lg border border-slate-200 bg-slate-50 object-contain"
                />
                <div className="min-w-48 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <IconCheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                    Design saved in the studio
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A 300-DPI print file was generated per side. Changed the size or
                    shape afterwards? Re-open the studio and save again to regenerate
                    it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudioOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <IconPencil className="h-4 w-4" /> Edit design
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStudioOpen(true)}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 hover:border-blue-300 hover:text-blue-700"
              >
                <IconType className="h-6 w-6" />
                <span className="font-semibold">Open the design studio</span>
                <span className="text-xs font-normal text-slate-400">
                  Add text, logos, shapes and colours — we export a print-ready 300-DPI
                  file for you.
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <ChoiceGrid
        title="Print sides"
        required
        options={printSides}
        selected={specs.cardPrintSides}
        onSelect={(value) => setSpec({ cardPrintSides: value as 'single' | 'double' })}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <strong>Foil / finish artwork rules:</strong> use bold, high-contrast
        fonts at 8pt or larger. Avoid fine hairlines or fonts below 6pt — they
        may not reproduce clearly. Keep all text at least 3 mm from trim/cut
        edges, especially for non-rectangular shapes.
      </div>

      <div>
        <p className="label">Live design preview</p>
        <div className="flex flex-wrap gap-6 rounded-xl border border-slate-200 bg-white p-5">
          <PreviewCard side="front" />
          {specs.cardPrintSides === 'double' && <PreviewCard side="back" />}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="checkbox"
          checked={specs.cardProofApproved ?? false}
          onChange={(event) => setSpec({ cardProofApproved: event.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        <span className="text-sm text-slate-700">
          <strong className="text-slate-900">Business Card Proof:</strong> I
          approve that the text placement, colors, and layout on this preview
          are correct and match my brand guidelines.
        </span>
      </label>

      {studioOpen && (
        <CardStudio
          cardSize={specs.cardSize}
          cardShape={specs.cardShape}
          rounded={rounded}
          doubleSided={specs.cardPrintSides === 'double'}
          price={
            activeRate !== undefined
              ? Math.round(activeRate * specs.quantity * 100) / 100
              : undefined
          }
          initialFront={specs.cardStudioFront}
          initialBack={specs.cardStudioBack}
          onSave={handleStudioSave}
          onClose={() => setStudioOpen(false)}
        />
      )}
    </section>
  );
}
