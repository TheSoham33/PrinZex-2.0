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
  IconUpload,
} from '@/components/icons';
import CardStudio, { type StudioResult } from './card-studio/CardStudio';
import {
  SIZE_ASPECT,
  docFromImage,
  exportPixels,
  serializeDoc,
  shapeStyle,
  sizeMm,
} from './card-studio/model';
import { toCappedDataUrl } from './card-studio/export';
import type { OrderAction } from './orderReducer';

interface Props {
  specs: OrderSpecifications;
  service: ServiceOffering | undefined;
  dispatch: React.Dispatch<OrderAction>;
}

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
const TEMPLATES = ['t1', 't2', 't3', 't4'];

const isPdfFile = (url?: string, name?: string): boolean =>
  Boolean(name?.toLowerCase().endsWith('.pdf') || url?.toLowerCase().endsWith('.pdf'));

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
  // Custom quantities floor at the smallest slab (falling back to the
  // service minimum when the seller set no slabs). The backend enforces the
  // same floor, so a crafted request can't undercut it either.
  const minQty = slabs[0]?.qty ?? service?.minQuantity ?? 1;
  const QTY_MAX = 1_000_000;
  const activeRate = slabs.length
    ? ([...slabs].reverse().find((s) => specs.quantity >= s.qty) ?? slabs[0]).rate
    : undefined;
  const isCustomQty = !slabs.some((s) => s.qty === specs.quantity);
  /**
   * String draft for the custom-quantity box. Committing on every keystroke
   * floors mid-typing — and when the floor is a slab value the input wipes
   * itself — so below-min drafts wait for blur, then floor to minQty.
   */
  const [qtyDraft, setQtyDraft] = useState<string | null>(null);
  const commitQtyDraft = () => {
    if (qtyDraft === null) return;
    setQtyDraft(null);
    const n = Math.floor(Number(qtyDraft));
    setSpec({
      quantity: !Number.isFinite(n) || n < minQty ? minQty : Math.min(QTY_MAX, n),
    });
  };

  const setDesignFile = (side: 'front' | 'back', file: File) => {
    const url = URL.createObjectURL(file);
    // A fresh upload invalidates that side's studio doc (it was seeded from,
    // or last saved against, the previous file).
    setSpec(
      side === 'front'
        ? { cardFrontFileUrl: url, cardFrontFileName: file.name, cardStudioFront: undefined, cardProofApproved: false }
        : { cardBackFileUrl: url, cardBackFileName: file.name, cardStudioBack: undefined, cardProofApproved: false },
    );
  };

  const removeDesignFile = (side: 'front' | 'back') => {
    const url = side === 'front' ? specs.cardFrontFileUrl : specs.cardBackFileUrl;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    setSpec(
      side === 'front'
        ? { cardFrontFileUrl: undefined, cardFrontFileName: undefined, cardStudioFront: undefined, cardProofApproved: false }
        : { cardBackFileUrl: undefined, cardBackFileName: undefined, cardStudioBack: undefined, cardProofApproved: false },
    );
  };

  const rounded = specs.cardCorners === 'rounded';
  const circleLike = ['circle', 'oval', 'leaf'].includes(specs.cardShape ?? '');
  const aspect = SIZE_ASPECT[specs.cardSize ?? 'standard'] ?? '89 / 51';
  const previewShape = { ...shapeStyle(specs.cardShape, rounded, aspect) };
  const overlay = PAPER_OVERLAY[specs.cardPaper ?? ''];

  const [studioOpen, setStudioOpen] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [studioSeed, setStudioSeed] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });

  /**
   * Open the design studio on top of the chosen source: the picked template or
   * the uploaded artwork becomes the doc's full-bleed base image (capped to
   * export resolution and stored as a data URL so the doc survives reloads).
   * Previously saved studio docs take precedence over the raw design.
   */
  const openStudio = async () => {
    setStudioBusy(true);
    try {
      const size = sizeMm(specs.cardSize);
      const capWidth = exportPixels(size).w;
      const seed: { front: string | null; back: string | null } = {
        front: specs.cardStudioFront ?? null,
        back: specs.cardStudioBack ?? null,
      };
      if (!seed.front) {
        const url =
          specs.cardDesignSource === 'template'
            ? `/images/templates/business-cards/${specs.cardTemplate}.jpg`
            : specs.cardFrontFileUrl;
        if (url && !isPdfFile(url, specs.cardFrontFileName)) {
          seed.front = serializeDoc(
            docFromImage(
              await toCappedDataUrl(url, capWidth),
              specs.cardFrontFileName ?? 'card design',
              size,
            ),
          );
        }
      }
      if (
        !seed.back &&
        !specs.cardBackSameAsFront &&
        specs.cardBackFileUrl &&
        !isPdfFile(specs.cardBackFileUrl, specs.cardBackFileName)
      ) {
        seed.back = serializeDoc(
          docFromImage(
            await toCappedDataUrl(specs.cardBackFileUrl, capWidth),
            specs.cardBackFileName ?? 'card back',
            size,
          ),
        );
      }
      setStudioSeed(seed);
      setStudioOpen(true);
    } catch {
      window.alert(
        'Could not open this design in the studio. PDF artwork cannot be edited — upload it as PNG/JPG, or keep it as-is.',
      );
    } finally {
      setStudioBusy(false);
    }
  };

  /**
   * Adopt the studio's 300-DPI exports. The back file is replaced only when
   * the customer actually seeded or edited it there — an untouched raw back
   * (e.g. an uploaded PDF) must survive a front-only edit.
   */
  const handleStudioSave = (result: StudioResult) => {
    if (specs.cardFrontFileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(specs.cardFrontFileUrl);
    }
    const patch: Partial<OrderSpecifications> = {
      cardFrontFileUrl: URL.createObjectURL(result.frontFile),
      cardFrontFileName: result.frontFile.name,
      cardStudioFront: result.frontDoc,
      cardStudioBack: result.backDoc,
      cardProofApproved: false,
    };
    if (result.backChanged && result.backFile) {
      if (specs.cardBackFileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(specs.cardBackFileUrl);
      }
      patch.cardBackFileUrl = URL.createObjectURL(result.backFile);
      patch.cardBackFileName = result.backFile.name;
    }
    setSpec(patch);
    setStudioOpen(false);
  };

  /** Template flow only: drop studio edits so the raw template shows again. */
  const revertToRawTemplate = () => {
    for (const url of [specs.cardFrontFileUrl, specs.cardBackFileUrl]) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    }
    setSpec({
      cardFrontFileUrl: undefined,
      cardFrontFileName: undefined,
      cardBackFileUrl: undefined,
      cardBackFileName: undefined,
      cardStudioFront: undefined,
      cardStudioBack: undefined,
      cardProofApproved: false,
    });
  };

  const previewFor = (side: 'front' | 'back') => {
    // Mirrored back previews exactly what prints: the front design.
    const effectiveSide = side === 'back' && specs.cardBackSameAsFront ? 'front' : side;
    // A saved studio doc means the exported PNG is the design of record —
    // show it instead of the raw template/upload it was seeded from.
    const url =
      effectiveSide === 'front'
        ? specs.cardStudioFront && specs.cardFrontFileUrl
          ? specs.cardFrontFileUrl
          : specs.cardDesignSource === 'template'
            ? `/images/templates/business-cards/${specs.cardTemplate}.jpg`
            : specs.cardFrontFileUrl
        : specs.cardBackFileUrl;
    const isPdf = isPdfFile(
      url,
      effectiveSide === 'front' ? specs.cardFrontFileName : specs.cardBackFileName,
    );
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
              onClick={() => {
                setQtyDraft(null);
                setSpec({ quantity: slab.qty });
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                specs.quantity === slab.qty && qtyDraft === null
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              {slab.qty}
            </button>
          ))}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${
              qtyDraft !== null || isCustomQty
                ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                : 'border-slate-200'
            }`}
          >
            <span className="text-sm font-semibold text-slate-600">Custom</span>
            <input
              type="number"
              min={minQty}
              max={QTY_MAX}
              step={1}
              value={qtyDraft ?? (isCustomQty ? String(specs.quantity) : '')}
              placeholder={`min ${minQty}`}
              onChange={(event) => {
                const raw = event.target.value;
                setQtyDraft(raw);
                const n = Math.floor(Number(raw));
                // Live-apply valid values so chips/price track while typing.
                if (Number.isFinite(n) && n >= minQty && n <= QTY_MAX) {
                  setSpec({ quantity: n });
                }
              }}
              onBlur={commitQtyDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="w-24 bg-transparent text-sm font-semibold outline-none"
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
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: 'template', label: 'Browse ready templates', hint: 'Pick a layout, then add your details in the design studio' },
              { value: 'upload', label: 'Upload your own design', hint: 'Print-ready artwork at 300 DPI — editable in the studio' },
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
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TEMPLATES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (id === specs.cardTemplate) return;
                    // Switching templates discards studio edits seeded from
                    // the previous one.
                    for (const url of [specs.cardFrontFileUrl, specs.cardBackFileUrl]) {
                      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
                    }
                    setSpec({
                      cardTemplate: id,
                      cardProofApproved: false,
                      cardFrontFileUrl: undefined,
                      cardFrontFileName: undefined,
                      cardStudioFront: undefined,
                      cardStudioBack: undefined,
                    });
                  }}
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
            {specs.cardTemplate && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={studioBusy}
                  onClick={openStudio}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <IconPencil className="h-4 w-4" />
                  {studioBusy
                    ? 'Preparing…'
                    : specs.cardStudioFront
                      ? 'Edit design in the studio'
                      : 'Customize this template in the studio'}
                </button>
                {specs.cardStudioFront && (
                  <button
                    type="button"
                    onClick={revertToRawTemplate}
                    className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Revert to the original template
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {specs.cardDesignSource === 'upload' && (
          <div className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DesignUpload
                side="front"
                required
                fileUrl={specs.cardFrontFileUrl}
                fileName={specs.cardFrontFileName}
                onFile={(file) => setDesignFile('front', file)}
                onRemove={() => removeDesignFile('front')}
              />
              {specs.cardPrintSides === 'double' && !specs.cardBackSameAsFront && (
                <DesignUpload
                  side="back"
                  fileUrl={specs.cardBackFileUrl}
                  fileName={specs.cardBackFileName}
                  onFile={(file) => setDesignFile('back', file)}
                  onRemove={() => removeDesignFile('back')}
                />
              )}
            </div>
            {((specs.cardFrontFileUrl && !isPdfFile(specs.cardFrontFileUrl, specs.cardFrontFileName)) ||
              (specs.cardPrintSides === 'double' &&
                !specs.cardBackSameAsFront &&
                specs.cardBackFileUrl &&
                !isPdfFile(specs.cardBackFileUrl, specs.cardBackFileName))) && (
              <button
                type="button"
                disabled={studioBusy}
                onClick={openStudio}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <IconPencil className="h-4 w-4" />
                {studioBusy
                  ? 'Preparing…'
                  : specs.cardStudioFront
                    ? 'Edit design in the studio'
                    : 'Edit your design in the studio'}
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
      {specs.cardPrintSides === 'double' && (
        <label className="-mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={specs.cardBackSameAsFront ?? false}
            onChange={(event) =>
              setSpec({
                cardBackSameAsFront: event.target.checked,
                cardProofApproved: false,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm text-slate-700">
            <strong className="text-slate-900">Back side same as front.</strong>{' '}
            Print the front design on the back too — no separate back design
            needed.
          </span>
        </label>
      )}

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
          mirroredBack={specs.cardBackSameAsFront ?? false}
          price={
            activeRate !== undefined
              ? Math.round(activeRate * specs.quantity * 100) / 100
              : undefined
          }
          initialFront={studioSeed.front}
          initialBack={studioSeed.back}
          onSave={handleStudioSave}
          onClose={() => setStudioOpen(false)}
        />
      )}
    </section>
  );
}
