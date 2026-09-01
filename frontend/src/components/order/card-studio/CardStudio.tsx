'use client';

/**
 * Business-card design studio — a modal editor in the spirit of Vistaprint's
 * Studio: text / uploads / graphics / background rails, live trim + bleed +
 * safety guides, zoom, undo/redo, front-back switching, and a 300-DPI PNG
 * export that drops straight into the existing card order specs.
 *
 * Zero new dependencies: geometry comes from pointer events, print output
 * from the DOM canvas (see export.ts), all nontrivial logic from model.ts.
 *
 * ponytail ceilings (known, deliberate):
 *  - No rotation, snapping or multi-select. Upgrade path: add `rotation` to
 *    ElementBase and rotate via CSS transform + ctx.rotate in export.ts.
 *  - Oversized elements pan under a cover-clamp (must keep covering the
 *    bleed box) — free off-edge overhang is intentionally not offered for
 *    images/shapes/icons, so a design can never print with an accidental
 *    blank sliver. Text MAY overhang by design; the stage clips it at the
 *    bleed edge, exactly what the cutter trims.
 *  - Undo tracks structure (add/move/resize/delete), not keystrokes — text
 *    and style tweaks mutate live. Upgrade: debounced snapshots per edit.
 *  - Pinch zoom not handled (buttons only).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  SVGProps,
} from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconEye,
  IconHeart,
  IconIdCard,
  IconImageIcon,
  IconMapPin,
  IconMailCheck,
  IconMinus,
  IconPhone,
  IconPlus,
  IconRedo,
  IconShapes,
  IconShieldCheck,
  IconSquare,
  IconStar,
  IconStore,
  IconTag,
  IconTrash,
  IconType,
  IconUndo,
  IconUpload,
  IconUser,
  IconX,
  IconZap,
  IconZoomIn,
  IconZoomOut,
} from '@/components/icons';
import {
  BLEED_MM,
  FONT_STACKS,
  MAX_TEXT_PT,
  MIN_TEXT_PT,
  SAFETY_MM,
  SWATCHES,
  addElement,
  clampElement,
  createDoc,
  duplicateElement,
  moveElementBy,
  moveLayer,
  parseDoc,
  ptToMm,
  removeElement,
  resizeElement,
  serializeDoc,
  shapeStyle,
  sizeMm,
  uid,
  updateElement,
  type IconElement,
  type ResizeCorner,
  type StudioDoc,
  type StudioElement,
  type StudioSide,
  type TextElement,
} from './model';
import { renderSideToFile } from './export';

/* ------------------------------ Icon registry -------------------------- */

const ICON_REGISTRY: Record<string, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  phone: IconPhone,
  mail: IconMailCheck,
  pin: IconMapPin,
  clock: IconClock,
  user: IconUser,
  'id-card': IconIdCard,
  store: IconStore,
  tag: IconTag,
  star: IconStar,
  heart: IconHeart,
  zap: IconZap,
  shield: IconShieldCheck,
};
const ICON_CHOICES = Object.keys(ICON_REGISTRY);

/* --------------------------------- Props -------------------------------- */

export interface StudioResult {
  frontFile: File;
  backFile?: File;
  /** Serialized docs (model.ts JSON) so the design can be re-opened later. */
  frontDoc: string;
  backDoc: string;
  /** False when the back was never seeded nor touched — panel must keep the
   *  previously uploaded back file (e.g. a PDF the studio can't rasterize). */
  backChanged: boolean;
}

interface Props {
  cardSize?: string;
  cardShape?: string;
  rounded?: boolean;
  doubleSided: boolean;
  /** Quantity × rate for the header price chip (₹), when the panel knows it. */
  price?: number;
  initialFront?: string | null;
  initialBack?: string | null;
  onSave: (result: StudioResult) => void;
  onClose: () => void;
}

type Tab = 'text' | 'uploads' | 'graphics' | 'background';

interface Docs {
  front: StudioDoc;
  back: StudioDoc;
}

interface Gesture {
  kind: 'drag' | 'resize';
  side: StudioSide;
  id: string;
  corner?: ResizeCorner;
  startX: number;
  startY: number;
  orig: StudioElement;
  before: Docs;
  moved: boolean;
}

interface Asset {
  url: string;
  name: string;
  /** natural height / width, for aspect-correct placement */
  ratio: number;
}

// ponytail: 2 MB keeps the serialized doc (data URLs) under the order API's
// per-field spec cap so designs can be re-opened after checkout; a 2 MB JPEG
// is already ≈15 MP — far beyond the ~1122 px a card needs at 300 DPI.
const MAX_UPLOAD_MB = 2;

/* ----------------------------- Small pieces ------------------------------ */

function RailTab({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-16 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function ToolButton({
  title,
  disabled,
  onClick,
  active,
  children,
}: {
  title: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border p-2 transition-colors ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            title={swatch}
            onClick={() => onChange(swatch)}
            className={`h-6 w-6 rounded-md border ${
              value === swatch ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-slate-200'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#0f172a'}
          onChange={(event) => onChange(event.target.value)}
          title="Custom colour"
          className="h-6 w-9 cursor-pointer rounded border border-slate-200"
        />
      </div>
    </div>
  );
}

const AlignLines = ({ align }: { align: 'left' | 'center' | 'right' }) => (
  <svg viewBox="0 0 16 12" className="h-3.5 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    {[2, 6, 10].map((y, i) => {
      const len = i === 1 ? 10 : 16;
      const x = align === 'center' ? (16 - len) / 2 : align === 'right' ? 16 - len : 0;
      return <line key={y} x1={x} x2={x + len} y1={y} y2={y} strokeLinecap="round" />;
    })}
  </svg>
);

/* ------------------------------- Stage view ------------------------------ */

interface StageViewProps {
  doc: StudioDoc;
  size: { w: number; h: number };
  /** px per mm */
  scale: number;
  side: StudioSide;
  shape?: string;
  rounded?: boolean;
  guides?: { safety: boolean; bleed: boolean };
  interactive?: boolean;
  selectedId?: string | null;
  onElementDown?: (event: ReactPointerEvent, id: string) => void;
  onHandleDown?: (event: ReactPointerEvent, id: string, corner: ResizeCorner) => void;
  onBackgroundDown?: () => void;
  /** data attribute used to scope export's SVG lookups (stage vs preview). */
  marker?: 'data-stage-side' | 'data-preview-side';
}

const HANDLE_CURSORS: { corner: ResizeCorner; cursor: string }[] = [
  { corner: 'nw', cursor: 'nwse-resize' },
  { corner: 'ne', cursor: 'nesw-resize' },
  { corner: 'sw', cursor: 'nesw-resize' },
  { corner: 'se', cursor: 'nwse-resize' },
];

function StageView({
  doc,
  size,
  scale: S,
  side,
  shape,
  rounded,
  guides,
  interactive,
  selectedId,
  onElementDown,
  onHandleDown,
  onBackgroundDown,
  marker = 'data-stage-side',
}: StageViewProps) {
  const bleedOff = BLEED_MM * S;
  const radius = shapeStyle(shape, rounded).borderRadius;
  const bleedPx = BLEED_MM * S;
  /**
   * Rendered heights of text blocks (their model `h` only tracks the first
   * line) so the selection chrome hugs multi-line text correctly. Written by
   * ref callbacks after layout; one frame of lag, never user-visible.
   */
  const measuredHeights = useRef<Record<string, number>>({});
  return (
    <div
      {...{ [marker]: side }}
      className="relative select-none"
      style={{ width: (size.w + 2 * BLEED_MM) * S, height: (size.h + 2 * BLEED_MM) * S }}
      onPointerDown={
        interactive
          ? () => {
              onBackgroundDown?.();
            }
          : undefined
      }
    >
      {/* artwork incl. background, spanning trim + bleed */}
      <div
        className="absolute overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
        style={{
          inset: 0,
          borderRadius: `calc(${radius} + ${bleedPx}px)`,
          backgroundColor: doc.background,
        }}
      >
        {doc.elements.map((el) => {
          const box: CSSProperties = {
            position: 'absolute',
            left: (BLEED_MM + el.x) * S,
            top: (BLEED_MM + el.y) * S,
            width: el.w * S,
            height: el.kind === 'text' ? undefined : el.h * S,
            cursor: interactive ? 'move' : 'default',
            touchAction: 'none',
          };
          return (
            <div
              key={el.id}
              data-el-id={el.id}
              style={box}
              ref={
                el.kind === 'text'
                  ? (node) => {
                      if (node) measuredHeights.current[el.id] = node.offsetHeight;
                    }
                  : undefined
              }
              onPointerDown={
                interactive
                  ? (event) => {
                      event.stopPropagation();
                      onElementDown?.(event, el.id);
                    }
                  : undefined
              }
            >
              {el.kind === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.url}
                  alt={el.name}
                  draggable={false}
                  className="pointer-events-none h-full w-full object-cover"
                />
              )}
              {el.kind === 'shape' && (
                <div
                  className="h-full w-full"
                  style={{
                    backgroundColor: el.color,
                    borderRadius:
                      el.shape === 'ellipse'
                        ? '50%'
                        : el.shape === 'round'
                          ? '15%'
                          : 0,
                  }}
                />
              )}
              {el.kind === 'text' && (
                <div
                  className="pointer-events-none w-full"
                  style={{
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontSize: ptToMm(el.fontSize) * S,
                    lineHeight: 1.25,
                    fontWeight: el.bold ? 700 : 400,
                    fontStyle: el.italic ? 'italic' : 'normal',
                    textAlign: el.align,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {el.text}
                </div>
              )}
              {el.kind === 'icon' &&
                (() => {
                  const IconCmp = ICON_REGISTRY[el.icon] ?? IconStar;
                  return (
                    <IconCmp
                      style={{ color: el.color, width: '100%', height: '100%' }}
                      strokeWidth={2}
                    />
                  );
                })()}
            </div>
          );
        })}
      </div>

      {/* guides (screen only — none of these export) */}
      {guides?.bleed && (
        <div className="pointer-events-none absolute inset-0 rounded-[4px] border border-dashed border-sky-400" />
      )}
      <div
        className="pointer-events-none absolute border border-blue-500/70"
        style={{ left: bleedOff, top: bleedOff, width: size.w * S, height: size.h * S }}
      />
      {guides?.safety && (
        <div
          className="pointer-events-none absolute border border-dashed border-green-500"
          style={{
            left: bleedOff + SAFETY_MM * S,
            top: bleedOff + SAFETY_MM * S,
            width: (size.w - 2 * SAFETY_MM) * S,
            height: (size.h - 2 * SAFETY_MM) * S,
          }}
        />
      )}
      {/* die-cut silhouette: shade everything the cutter removes */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: bleedOff,
          top: bleedOff,
          width: size.w * S,
          height: size.h * S,
          borderRadius: radius,
          boxShadow: '0 0 0 999px rgba(148, 163, 184, 0.28)',
          backgroundClip: 'padding-box',
        }}
      />

      {/* Selection chrome lives OUTSIDE the clipped artwork layer so handles
          stay grabbable even when an element spans the whole bleed box (e.g.
          a seeded full-bleed template/upload), whose corners would otherwise
          be cut off by overflow-hidden. Text height uses the measured rendered
          height (model `h` tracks only the first line). */}
      {interactive &&
        selectedId &&
        (() => {
          const el = doc.elements.find((item) => item.id === selectedId);
          if (!el) return null;
          const x = bleedOff + el.x * S;
          const y = bleedOff + el.y * S;
          const w = el.w * S;
          const h =
            el.kind === 'text' ? (measuredHeights.current[el.id] ?? el.h * S) : el.h * S;
          return (
            <>
              <div
                className="pointer-events-none absolute border border-blue-500"
                style={{ left: x, top: y, width: w, height: h }}
              />
              {HANDLE_CURSORS.map(({ corner, cursor }) => (
                <span
                  key={corner}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onHandleDown?.(event, el.id, corner);
                  }}
                  className="absolute z-10 h-3 w-3 rounded-[3px] border border-blue-500 bg-white shadow-sm"
                  style={{
                    left: corner === 'nw' || corner === 'sw' ? x - 6 : x + w - 6,
                    top: corner === 'nw' || corner === 'ne' ? y - 6 : y + h - 6,
                    cursor,
                    touchAction: 'none',
                  }}
                />
              ))}
            </>
          );
        })()}
    </div>
  );
}

/* -------------------------------- Studio --------------------------------- */

export default function CardStudio({
  cardSize,
  cardShape,
  rounded,
  doubleSided,
  price,
  initialFront,
  initialBack,
  onSave,
  onClose,
}: Props) {
  const size = useMemo(() => sizeMm(cardSize), [cardSize]);

  const [docs, setDocs] = useState<Docs>(() => ({
    front: parseDoc(initialFront) ?? createDoc(),
    back: parseDoc(initialBack) ?? createDoc(),
  }));
  const [side, setSide] = useState<StudioSide>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('text');
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState({ safety: true, bleed: true });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [past, setPast] = useState<Docs[]>([]);
  const [future, setFuture] = useState<Docs[]>([]);

  const baseScale = useMemo(
    () => Math.min(560 / (size.w + 2 * BLEED_MM), 360 / (size.h + 2 * BLEED_MM)),
    [size],
  );
  const S = baseScale * zoom;

  /* Refs so the window-level gesture/keyboard listeners never go stale. */
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const scaleRef = useRef(S);
  scaleRef.current = S;
  const sideRef = useRef(side);
  sideRef.current = side;
  const gestureRef = useRef<Gesture | null>(null);
  const openedSnapshot = useRef(
    `${serializeDoc(docsRef.current.front)}|${serializeDoc(docsRef.current.back)}`,
  );
  // First-render snapshot of the back doc — compared at save time to decide
  // whether the back export should replace the customer's existing back file.
  const backSeededAs = useRef<string | null>(null);
  if (backSeededAs.current === null) backSeededAs.current = serializeDoc(docsRef.current.back);
  const dirty = `${serializeDoc(docs.front)}|${serializeDoc(docs.back)}` !== openedSnapshot.current;

  const doc = docs[side];
  const selected = doc.elements.find((el) => el.id === selectedId) ?? null;

  /** Structural change: snapshot for undo, then apply. */
  const mutate = (fn: (doc: StudioDoc) => StudioDoc, targetSide: StudioSide = side) => {
    setPast((prev) => [...prev.slice(-49), docsRef.current]);
    setFuture([]);
    setDocs((prev) => ({ ...prev, [targetSide]: fn(prev[targetSide]) }));
  };

  /** Presentational tweak (typing, colours): no undo snapshot per keystroke. */
  const tweak = (fn: (doc: StudioDoc) => StudioDoc, targetSide: StudioSide = side) => {
    setDocs((prev) => ({ ...prev, [targetSide]: fn(prev[targetSide]) }));
  };

  /* Drag / resize gestures via window listeners (pointer capture-free). */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const dx = (event.clientX - gesture.startX) / scaleRef.current;
      const dy = (event.clientY - gesture.startY) / scaleRef.current;
      if (!gesture.moved) {
        if (Math.hypot(dx, dy) < 0.05) return;
        setPast((prev) => [...prev.slice(-49), gesture.before]);
        setFuture([]);
        gesture.moved = true;
      }
      setDocs((prev) => ({
        ...prev,
        [gesture.side]: {
          ...prev[gesture.side],
          elements: prev[gesture.side].elements.map((el) =>
            el.id === gesture.id
              ? gesture.kind === 'drag'
                ? moveElementBy(gesture.orig, dx, dy, sizeRef.current)
                : resizeElement(
                    gesture.orig,
                    gesture.corner ?? 'se',
                    dx,
                    dy,
                    sizeRef.current,
                  )
              : el,
          ),
        },
      }));
    };
    const onUp = () => {
      gestureRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  /* Keyboard: Delete removes, Ctrl+Z/Y walk history. Inputs opt out. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if (event.key === 'Escape' && preview) {
        setPreview(false);
        return;
      }
      const id = selectedId;
      if ((event.key === 'Delete' || event.key === 'Backspace') && id) {
        mutate((d) => removeElement(d, id));
        setSelectedId(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Reads state directly (not nested updaters) so StrictMode double-invoke
  // can't double-push the opposite stack.
  const undo = () => {
    const snapshot = past[past.length - 1];
    if (!snapshot) return;
    setPast(past.slice(0, -1));
    setFuture([...future, docsRef.current]);
    setDocs(snapshot);
  };
  const redo = () => {
    const snapshot = future[future.length - 1];
    if (!snapshot) return;
    setFuture(future.slice(0, -1));
    setPast([...past, docsRef.current]);
    setDocs(snapshot);
  };

  const beginGesture = (
    event: ReactPointerEvent,
    kind: Gesture['kind'],
    id: string,
    corner?: ResizeCorner,
  ) => {
    const el = docsRef.current[sideRef.current].elements.find((item) => item.id === id);
    if (!el) return;
    event.preventDefault();
    setSelectedId(id);
    gestureRef.current = {
      kind,
      side: sideRef.current,
      id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      orig: el,
      before: docsRef.current,
      moved: false,
    };
  };

  /* ------------------------------- Adders -------------------------------- */

  const addText = () => {
    const h = ptToMm(12) * 1.3;
    const el: TextElement = clampElement(
      {
        id: uid(),
        kind: 'text',
        x: (size.w - 40) / 2,
        y: (size.h - h) / 2 - 6,
        w: 40,
        h,
        text: 'Your name',
        color: '#0f172a',
        fontFamily: FONT_STACKS[0].value,
        fontSize: 12,
        bold: false,
        italic: false,
        align: 'left',
      },
      size,
    );
    mutate((d) => addElement(d, el));
    setSelectedId(el.id);
  };

  const addShape = (shape: 'rect' | 'round' | 'ellipse' | 'line') => {
    const dims =
      shape === 'line' ? { w: 40, h: 2 } : shape === 'ellipse' ? { w: 24, h: 16 } : { w: 25, h: 18 };
    mutate((d) =>
      addElement(
        d,
        clampElement(
          {
            id: uid(),
            kind: 'shape',
            shape,
            color: shape === 'line' ? '#0f172a' : '#1d4ed8',
            x: (size.w - dims.w) / 2,
            y: (size.h - dims.h) / 2,
            ...dims,
          },
          size,
        ),
      ),
    );
  };

  const addIcon = (icon: string) => {
    const dim = 16;
    mutate((d) =>
      addElement(
        d,
        clampElement(
          {
            id: uid(),
            kind: 'icon',
            icon,
            color: '#0f172a',
            x: (size.w - dim) / 2,
            y: (size.h - dim) / 2,
            w: dim,
            h: dim,
          },
          size,
        ),
      ),
    );
  };

  const placeAsset = (asset: Asset) => {
    let w = 35;
    let h = w * asset.ratio;
    if (h > size.h) {
      h = size.h;
      w = h / asset.ratio;
    }
    mutate((d) =>
      addElement(
        d,
        clampElement(
          {
            id: uid(),
            kind: 'image',
            url: asset.url,
            name: asset.name,
            x: (size.w - w) / 2,
            y: (size.h - h) / 2,
            w,
            h,
          },
          size,
        ),
      ),
    );
  };

  const onUpload = (file: File) => {
    setUploadError(null);
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`Keep images under ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setAssets((prev) => [
          ...prev,
          { url, name: file.name, ratio: img.naturalHeight / img.naturalWidth || 1 },
        ]);
      };
      img.onerror = () => setUploadError('That file does not look like an image.');
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  /* --------------------------------- Save --------------------------------- */

  const resolveIcon =
    (targetSide: StudioSide) =>
    (el: IconElement): SVGSVGElement | null =>
      document.querySelector<SVGSVGElement>(
        `[data-stage-side="${targetSide}"] [data-el-id="${el.id}"] svg`,
      );

  const handleSave = async () => {
    setSaving(true);
    try {
      const frontFile = await renderSideToFile(docs.front, size, 'front', resolveIcon('front'));
      const backFile = doubleSided
        ? await renderSideToFile(docs.back, size, 'back', resolveIcon('back'))
        : undefined;
      openedSnapshot.current = `${serializeDoc(docs.front)}|${serializeDoc(docs.back)}`;
      onSave({
        frontFile,
        backFile,
        frontDoc: serializeDoc(docs.front),
        backDoc: serializeDoc(docs.back),
        backChanged: serializeDoc(docs.back) !== backSeededAs.current,
      });
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (dirty && !window.confirm('Discard unsaved design changes?')) return;
    onClose();
  };

  /* --------------------------------- Tabs ---------------------------------- */

  const renderTextTab = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addText}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
      >
        <IconPlus className="h-4 w-4" /> Add text
      </button>
      {selected?.kind === 'text' ? (
        <div className="space-y-3">
          <textarea
            rows={3}
            value={selected.text}
            onChange={(event) =>
              tweak((d) => updateElement(d, selected.id, { text: event.target.value }))
            }
            className="input text-sm"
            placeholder="Type your text"
          />
          <div className="grid grid-cols-[1fr_74px] gap-2">
            <select
              value={selected.fontFamily}
              onChange={(event) =>
                tweak((d) => updateElement(d, selected.id, { fontFamily: event.target.value }))
              }
              className="input text-sm"
              aria-label="Font"
            >
              {FONT_STACKS.map((font) => (
                <option key={font.label} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={MIN_TEXT_PT}
              max={MAX_TEXT_PT}
              step={0.5}
              value={selected.fontSize}
              onChange={(event) => {
                const fontSize = Math.min(
                  MAX_TEXT_PT,
                  Math.max(MIN_TEXT_PT, Number(event.target.value) || MIN_TEXT_PT),
                );
                tweak((d) =>
                  updateElement(d, selected.id, { fontSize, h: ptToMm(fontSize) * 1.3 }),
                );
              }}
              className="input text-sm"
              aria-label="Font size (pt)"
            />
          </div>
          <div className="flex gap-1.5">
            <ToolButton
              title="Bold"
              active={selected.bold}
              onClick={() => tweak((d) => updateElement(d, selected.id, { bold: !selected.bold }))}
            >
              <span className="block w-4 text-center text-sm font-extrabold">B</span>
            </ToolButton>
            <ToolButton
              title="Italic"
              active={selected.italic}
              onClick={() =>
                tweak((d) => updateElement(d, selected.id, { italic: !selected.italic }))
              }
            >
              <span className="block w-4 text-center text-sm italic">I</span>
            </ToolButton>
            {(['left', 'center', 'right'] as const).map((align) => (
              <ToolButton
                key={align}
                title={`Align ${align}`}
                active={selected.align === align}
                onClick={() => tweak((d) => updateElement(d, selected.id, { align }))}
              >
                <AlignLines align={align} />
              </ToolButton>
            ))}
          </div>
          <ColorPicker
            label="Text colour"
            value={selected.color}
            onChange={(color) => tweak((d) => updateElement(d, selected.id, { color }))}
          />
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-slate-400">
          Select a text block on the card to edit its content, font, size and colour.
        </p>
      )}
    </div>
  );

  const renderUploadsTab = () => (
    <div className="space-y-3">
      <label
        htmlFor="studio-upload"
        className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600"
      >
        <IconUpload className="h-5 w-5" />
        Upload a logo or image
        <span className="font-normal text-slate-400">PNG / JPG / WebP, up to {MAX_UPLOAD_MB} MB</span>
      </label>
      <input
        id="studio-upload"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />
      {uploadError && <p className="text-xs font-semibold text-red-600">{uploadError}</p>}
      {/* ponytail: PDF artwork can't be drawn to canvas without pdf.js — the
          order panel’s “Upload your own design” path already covers PDFs. */}
      <p className="text-[11px] leading-relaxed text-slate-400">
        For print-ready PDF artwork, close the studio and use “Upload your own design” instead.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset, index) => (
          <button
            key={index}
            type="button"
            onClick={() => placeAsset(asset)}
            className="group relative overflow-hidden rounded-lg border border-slate-200 hover:border-blue-400"
            title={`Place ${asset.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.name} className="h-16 w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
              <IconPlus className="h-5 w-5 text-white" />
            </span>
          </button>
        ))}
      </div>
      {assets.length === 0 && (
        <p className="text-xs text-slate-400">
          Uploaded images stay on this order — click one to place it on the card.
        </p>
      )}
    </div>
  );

  const renderGraphicsTab = () => (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Shapes</p>
        <div className="grid grid-cols-4 gap-1.5">
          <ToolButton title="Rectangle" onClick={() => addShape('rect')}>
            <IconSquare className="h-4 w-4" />
          </ToolButton>
          <ToolButton title="Rounded rectangle" onClick={() => addShape('round')}>
            <IconSquare className="h-4 w-4" strokeWidth={2.5} style={{ borderRadius: 2 }} />
          </ToolButton>
          <ToolButton title="Ellipse" onClick={() => addShape('ellipse')}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="12" rx="9" ry="6.5" />
            </svg>
          </ToolButton>
          <ToolButton title="Divider line" onClick={() => addShape('line')}>
            <IconMinus className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Icons</p>
        <div className="grid grid-cols-4 gap-1.5">
          {ICON_CHOICES.map((icon) => {
            const IconCmp = ICON_REGISTRY[icon];
            return (
              <ToolButton key={icon} title={`Add ${icon} icon`} onClick={() => addIcon(icon)}>
                <IconCmp className="h-4 w-4" />
              </ToolButton>
            );
          })}
        </div>
      </div>
      {(selected?.kind === 'shape' || selected?.kind === 'icon') && (
        <ColorPicker
          label={`${selected.kind === 'shape' ? 'Shape' : 'Icon'} colour`}
          value={selected.color}
          onChange={(color) => tweak((d) => updateElement(d, selected.id, { color }))}
        />
      )}
      {selected?.kind === 'image' && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          Drag the image to move it; drag a corner to resize. It fills its frame (cover-fit), so
          enlarge the frame to reveal more of it.
        </p>
      )}
    </div>
  );

  const renderBackgroundTab = () => (
    <ColorPicker
      label="Card background"
      value={doc.background}
      onChange={(color) => tweak((d) => ({ ...d, background: color }))}
    />
  );

  /* -------------------------------- Render --------------------------------- */

  const thumbScale = 92 / (size.w + 2 * BLEED_MM);
  const previewScale = Math.min(
    640 / (size.w + 2 * BLEED_MM),
    420 / (size.h + 2 * BLEED_MM),
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100" role="dialog" aria-modal="true" aria-label="Business card design studio">
      {/* header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button
          type="button"
          onClick={requestClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          title="Close studio"
          aria-label="Close studio"
        >
          <IconX className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">Business Card Studio</p>
          <p className="text-[11px] text-slate-400">
            {size.w} × {size.h} mm trim + {BLEED_MM} mm bleed
          </p>
        </div>
        <div className="mx-auto flex items-center gap-1.5">
          <ToolButton title="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={undo}>
            <IconUndo className="h-4 w-4" />
          </ToolButton>
          <ToolButton title="Redo (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={redo}>
            <IconRedo className="h-4 w-4" />
          </ToolButton>
        </div>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
        >
          <IconEye className="h-4 w-4" /> Preview
        </button>
        {typeof price === 'number' && price > 0 && (
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 sm:flex">
            <IconTag className="h-3.5 w-3.5 text-slate-400" />
            {formatCurrency(price)}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <IconCheckCircle className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save design'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left rail */}
        <nav className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white" aria-label="Studio tools">
          <RailTab active={tab === 'text'} label="Text" onClick={() => setTab('text')}>
            <IconType className="h-5 w-5" />
          </RailTab>
          <RailTab active={tab === 'uploads'} label="Uploads" onClick={() => setTab('uploads')}>
            <IconImageIcon className="h-5 w-5" />
          </RailTab>
          <RailTab active={tab === 'graphics'} label="Graphics" onClick={() => setTab('graphics')}>
            <IconShapes className="h-5 w-5" />
          </RailTab>
          <RailTab active={tab === 'background'} label="Backdrop" onClick={() => setTab('background')}>
            <IconSquare className="h-5 w-5" fill="currentColor" stroke="none" />
          </RailTab>
        </nav>
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center justify-between text-sm font-bold capitalize text-slate-900">
            {tab === 'background' ? 'Background' : tab}
          </h2>
          {tab === 'text' && renderTextTab()}
          {tab === 'uploads' && renderUploadsTab()}
          {tab === 'graphics' && renderGraphicsTab()}
          {tab === 'background' && renderBackgroundTab()}

          {selected && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-600">Selected element</p>
              <div className="grid grid-cols-4 gap-1.5">
                <ToolButton
                  title="Duplicate"
                  onClick={() => mutate((d) => duplicateElement(d, selected.id))}
                >
                  <IconCopy className="h-4 w-4" />
                </ToolButton>
                <ToolButton
                  title="Bring forward"
                  onClick={() => mutate((d) => moveLayer(d, selected.id, 'up'))}
                >
                  <IconArrowUp className="h-4 w-4" />
                </ToolButton>
                <ToolButton
                  title="Send backward"
                  onClick={() => mutate((d) => moveLayer(d, selected.id, 'down'))}
                >
                  <IconArrowDown className="h-4 w-4" />
                </ToolButton>
                <ToolButton
                  title="Delete (Del)"
                  onClick={() => {
                    mutate((d) => removeElement(d, selected.id));
                    setSelectedId(null);
                  }}
                >
                  <IconTrash className="h-4 w-4 text-red-500" />
                </ToolButton>
              </div>
            </div>
          )}
        </aside>

        {/* canvas */}
        <main className="relative flex-1 overflow-auto">
          <div className="absolute right-4 top-3 z-10 flex gap-1.5">
            {(
              [
                ['safety', 'Safety area', 'border-green-500 text-green-700'],
                ['bleed', 'Bleed', 'border-sky-400 text-sky-700'],
              ] as const
            ).map(([key, label, tone]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGuides((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`rounded-md border bg-white px-2.5 py-1 text-[11px] font-semibold transition-colors ${tone} ${
                  guides[key] ? '' : 'opacity-40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid min-h-full place-items-center p-10">
            <StageView
              doc={doc}
              size={size}
              scale={S}
              side={side}
              shape={cardShape}
              rounded={rounded}
              guides={guides}
              interactive
              selectedId={selectedId}
              onElementDown={(event, id) => beginGesture(event, 'drag', id)}
              onHandleDown={(event, id, corner) => beginGesture(event, 'resize', id, corner)}
              onBackgroundDown={() => setSelectedId(null)}
            />
          </div>
          {/* zoom bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              <ToolButton title="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}>
                <IconZoomOut className="h-4 w-4" />
              </ToolButton>
              <span className="w-12 text-center text-xs font-bold text-slate-600">
                {Math.round(zoom * 100)}%
              </span>
              <ToolButton title="Zoom in" onClick={() => setZoom((z) => Math.min(3, z * 1.25))}>
                <IconZoomIn className="h-4 w-4" />
              </ToolButton>
            </div>
          </div>
        </main>

        {/* front / back rail */}
        <aside className="hidden w-28 shrink-0 flex-col items-center gap-4 overflow-y-auto border-l border-slate-200 bg-white py-4 md:flex" aria-label="Card sides">
          {(['front', 'back'] as const)
            .filter((s) => s === 'front' || doubleSided)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSide(s);
                  setSelectedId(null);
                }}
                className={`rounded-lg border-2 p-1 transition-colors ${
                  side === s ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <StageView
                  doc={docs[s]}
                  size={size}
                  scale={thumbScale}
                  side={s}
                  shape={cardShape}
                  rounded={rounded}
                />
                <span className="mt-1 block text-center text-[10px] font-bold capitalize text-slate-500">
                  {s}
                </span>
              </button>
            ))}
        </aside>
      </div>

      {/* hidden twin: keeps the inactive side’s icon SVGs in the DOM so the
          exporter can serialize them at save time */}
      <div className="hidden" aria-hidden>
        <StageView doc={docs[side === 'front' ? 'back' : 'front']} size={size} scale={1} side={side === 'front' ? 'back' : 'front'} />
      </div>

      {/* preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/70 backdrop-blur-sm" role="dialog" aria-label="Design preview">
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-sm font-bold text-white">Print preview — no guides, what exports is what prints</p>
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close preview"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-10 overflow-auto p-6">
            {(['front', 'back'] as const)
              .filter((s) => s === 'front' || doubleSided)
              .map((s) => (
                <div key={s} className="text-center">
                  <StageView
                    doc={docs[s]}
                    size={size}
                    scale={previewScale}
                    side={s}
                    shape={cardShape}
                    rounded={rounded}
                    marker="data-preview-side"
                  />
                  <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-300">{s}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
