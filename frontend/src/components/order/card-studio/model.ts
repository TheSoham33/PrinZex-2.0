/**
 * Card-studio document model — pure functions, no React, no DOM.
 *
 * Everything measurable lives here so the geometry, z-order and
 * (de)serialization rules are checkable in Node (`scripts/check-card-studio.ts`)
 * without rendering anything. The React stage and the canvas exporter both
 * consume the same units:
 *
 *   - positions/sizes are millimetres relative to the TRIM box top-left;
 *     elements may reach into the 3 mm bleed that surrounds it (negative
 *     coordinates / beyond width are legal up to the bleed edge).
 *   - font sizes are points (1pt = 25.4/72 mm), matching print vocabulary.
 */

export const PRINT_DPI = 300;
export const MM_PER_IN = 25.4;
/** Artwork must extend 3 mm past the trim so die-cutting leaves no white edge. */
export const BLEED_MM = 3;
/** Text must sit 3 mm inside the trim so it survives die-cut drift. */
export const SAFETY_MM = 3;
export const MIN_SIZE_MM = 2;
export const MIN_TEXT_PT = 6;
export const MAX_TEXT_PT = 96;

export const CARD_SIZE_MM: Record<string, { w: number; h: number }> = {
  standard: { w: 89, h: 51 },
  square: { w: 65, h: 65 },
  mini: { w: 85, h: 45 },
};

export const sizeMm = (cardSize?: string): { w: number; h: number } =>
  CARD_SIZE_MM[cardSize ?? ''] ?? CARD_SIZE_MM.standard;

export const ptToMm = (pt: number): number => (pt * MM_PER_IN) / 72;

/** Pixel size of the exported PNG (trim + bleed on every side) at print DPI. */
export function exportPixels(
  size: { w: number; h: number },
  dpi: number = PRINT_DPI,
): { w: number; h: number } {
  const pxPerMm = dpi / MM_PER_IN;
  return {
    w: Math.round((size.w + 2 * BLEED_MM) * pxPerMm),
    h: Math.round((size.h + 2 * BLEED_MM) * pxPerMm),
  };
}

/* ------------------------------ Documents ------------------------------ */

export type StudioSide = 'front' | 'back';

interface ElementBase {
  id: string;
  /** Trim-relative millimetres; may be negative (into the bleed). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  color: string;
  fontFamily: string;
  /** Points. Box height is derived from wrapping inside width `w`. */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  /** Data URL so the saved doc survives reloads (blob URLs die with the tab). */
  url: string;
  name: string;
}

export interface ShapeElement extends ElementBase {
  kind: 'shape';
  shape: 'rect' | 'round' | 'ellipse' | 'line';
  color: string;
}

export interface IconElement extends ElementBase {
  kind: 'icon';
  /** Key into the registry in CardStudio.tsx (kept out of here: it needs JSX). */
  icon: string;
  color: string;
}

export type StudioElement = TextElement | ImageElement | ShapeElement | IconElement;

/** Z-order is array order — later elements paint on top. No separate z field. */
export interface StudioDoc {
  background: string;
  elements: StudioElement[];
}

export const createDoc = (): StudioDoc => ({ background: '#ffffff', elements: [] });

/**
 * Seed a doc with an existing design (picked template / uploaded artwork)
 * stretched full-bleed so it prints to the cut edge.
 */
export const docFromImage = (
  url: string,
  name: string,
  size: { w: number; h: number },
): StudioDoc => ({
  background: '#ffffff',
  elements: [
    {
      id: uid(),
      kind: 'image',
      url,
      name,
      x: -BLEED_MM,
      y: -BLEED_MM,
      w: size.w + 2 * BLEED_MM,
      h: size.h + 2 * BLEED_MM,
    },
  ],
});

let idCounter = 0;
export const uid = (): string =>
  `el-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/* ---------------------------- Element editing --------------------------- */

/** Keep an element fully inside the bleed box so it can print somewhere. */
export function clampElement<T extends StudioElement>(el: T, size: { w: number; h: number }): T {
  const w = Math.max(MIN_SIZE_MM, el.w);
  const h = Math.max(MIN_SIZE_MM, el.h);
  return {
    ...el,
    w,
    h,
    x: Math.min(Math.max(el.x, -BLEED_MM), size.w + BLEED_MM - w),
    y: Math.min(Math.max(el.y, -BLEED_MM), size.h + BLEED_MM - h),
  };
}

export const clampDoc = (doc: StudioDoc, size: { w: number; h: number }): StudioDoc => ({
  ...doc,
  elements: doc.elements.map((el) => clampElement(el, size)),
});

export const moveElementBy = <T extends StudioElement>(
  el: T,
  dx: number,
  dy: number,
  size: { w: number; h: number },
): T => clampElement({ ...el, x: el.x + dx, y: el.y + dy }, size);

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Drag a corner handle by (dx, dy) mm. Images and icons keep their aspect
 * ratio (driven by the horizontal delta); shapes resize freely; text keeps a
 * fixed width and rescales its font so the stage and the 300-DPI export never
 * disagree about wrapping.
 */
export function resizeElement<T extends StudioElement>(
  el: T,
  corner: ResizeCorner,
  dx: number,
  dy: number,
  size: { w: number; h: number },
): T {
  const fromLeft = corner === 'nw' || corner === 'sw';
  const fromTop = corner === 'nw' || corner === 'ne';
  const signX = fromLeft ? -1 : 1;
  const signY = fromTop ? -1 : 1;

  let { w, h } = el;
  if (el.kind === 'text') {
    w = el.w + signX * dx;
    const ratio = w / el.w;
    const fontSize = Math.min(
      MAX_TEXT_PT,
      Math.max(MIN_TEXT_PT, el.fontSize * ratio),
    );
    w = el.w * (fontSize / el.fontSize); // snap width to the applied font size
    const x = fromLeft ? el.x + (el.w - w) : el.x;
    return clampElement({ ...el, x, w, fontSize }, size);
  }
  if (el.kind === 'image' || el.kind === 'icon') {
    w = Math.max(MIN_SIZE_MM, el.w + signX * dx);
    h = (el.h / el.w) * w;
  } else {
    w = Math.max(MIN_SIZE_MM, el.w + signX * dx);
    h = Math.max(MIN_SIZE_MM, el.h + signY * dy);
  }
  const x = fromLeft ? el.x + (el.w - w) : el.x;
  const y = fromTop ? el.y + (el.h - h) : el.y;
  return clampElement({ ...el, x, y, w, h }, size);
}

/* ------------------------------- Doc ops -------------------------------- */

export const addElement = (doc: StudioDoc, el: StudioElement): StudioDoc => ({
  ...doc,
  elements: [...doc.elements, el],
});

export const updateElement = (
  doc: StudioDoc,
  id: string,
  patch: Partial<StudioElement>,
): StudioDoc => ({
  ...doc,
  elements: doc.elements.map((el) =>
    el.id === id ? ({ ...el, ...patch } as StudioElement) : el,
  ),
});

export const removeElement = (doc: StudioDoc, id: string): StudioDoc => ({
  ...doc,
  elements: doc.elements.filter((el) => el.id !== id),
});

export const duplicateElement = (doc: StudioDoc, id: string): StudioDoc => {
  const source = doc.elements.find((el) => el.id === id);
  if (!source) return doc;
  return addElement(doc, { ...source, id: uid(), x: source.x + 3, y: source.y + 3 });
};

/** One step toward the viewer ('up' = paints later/on top) or away ('down'). */
export function moveLayer(doc: StudioDoc, id: string, dir: 'up' | 'down'): StudioDoc {
  const index = doc.elements.findIndex((el) => el.id === id);
  const target = dir === 'up' ? index + 1 : index - 1;
  if (index === -1 || target < 0 || target >= doc.elements.length) return doc;
  const elements = [...doc.elements];
  [elements[index], elements[target]] = [elements[target], elements[index]];
  return { ...doc, elements };
}

/* ---------------------------- (De)serialization -------------------------- */

const KINDS = new Set(['text', 'image', 'shape', 'icon']);
const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

export const serializeDoc = (doc: StudioDoc): string => JSON.stringify(doc);

/**
 * Parse a doc that round-tripped through order specifications (a trust
 * boundary — the JSON lives server-side and comes back). Anything malformed
 * degrades to `null` so the studio starts blank instead of crashing.
 */
export function parseDoc(json?: string | null): StudioDoc | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<StudioDoc>;
    if (!raw || !Array.isArray(raw.elements)) return null;
    const elements: StudioElement[] = [];
    for (const item of raw.elements.slice(0, 100)) {
      const el = item as Partial<StudioElement>;
      if (!el || typeof el !== 'object' || !KINDS.has(el.kind as string)) continue;
      const baseShape: ElementBase = {
        id: str(el.id, uid()),
        x: num(el.x, 0),
        y: num(el.y, 0),
        w: num(el.w, 10),
        h: num(el.h, 10),
      };
      if (el.kind === 'text') {
        const t = el as Partial<TextElement>;
        elements.push({
          ...baseShape,
          kind: 'text',
          text: typeof t.text === 'string' ? t.text.slice(0, 500) : 'Text',
          color: str(t.color, '#0f172a'),
          fontFamily: str(t.fontFamily, FONT_STACKS[0].value),
          fontSize: Math.min(MAX_TEXT_PT, Math.max(MIN_TEXT_PT, num(t.fontSize, 10))),
          bold: t.bold === true,
          italic: t.italic === true,
          align: t.align === 'center' || t.align === 'right' ? t.align : 'left',
        });
      } else if (el.kind === 'image') {
        const i = el as Partial<ImageElement>;
        if (!str(i.url ?? '', '')) continue;
        elements.push({
          ...baseShape,
          kind: 'image',
          url: str(i.url, ''),
          name: str(i.name, 'image'),
        });
      } else if (el.kind === 'shape') {
        const s = el as Partial<ShapeElement>;
        elements.push({
          ...baseShape,
          kind: 'shape',
          shape:
            s.shape === 'round' || s.shape === 'ellipse' || s.shape === 'line'
              ? s.shape
              : 'rect',
          color: str(s.color, '#1d4ed8'),
        });
      } else {
        const i = el as Partial<IconElement>;
        elements.push({
          ...baseShape,
          kind: 'icon',
          icon: str(i.icon, 'star'),
          color: str(i.color, '#0f172a'),
        });
      }
    }
    return { background: str(raw.background, '#ffffff'), elements };
  } catch {
    return null;
  }
}

/* ------------------------------- Palettes -------------------------------- */

export const FONT_STACKS = [
  { label: 'Sans', value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Rounded', value: "'Trebuchet MS', Verdana, sans-serif" },
  { label: 'Mono', value: "'Courier New', Courier, monospace" },
  { label: 'Display', value: "Impact, 'Arial Black', sans-serif" },
] as const;

export const SWATCHES = [
  '#ffffff',
  '#0f172a',
  '#475569',
  '#1d4ed8',
  '#0ea5e9',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#f472b6',
  '#78350f',
  '#fef3c7',
] as const;

/* --------------------- Shape preview helpers (shared) -------------------- */

/**
 * CSS approximation of each die-cut shape (rounded corners fold in here).
 * Shared with the customization panel's live preview so both agree on what a
 * "leaf" looks like.
 */
export function shapeStyle(shape?: string, rounded?: boolean, aspect?: string) {
  const radius = rounded ? '18%' : '8%';
  switch (shape) {
    case 'square':
      return { borderRadius: radius, aspectRatio: '1 / 1' };
    case 'circle':
      return { borderRadius: '50%', aspectRatio: '1 / 1' };
    case 'oval':
      return { borderRadius: '50%', aspectRatio: aspect ?? '89 / 51' };
    case 'leaf':
      return { borderRadius: '50% 8% 50% 8%', aspectRatio: aspect ?? '89 / 51' };
    case 'classic':
      return { borderRadius: '14%', aspectRatio: aspect ?? '89 / 51' };
    default: // rectangle
      return { borderRadius: radius, aspectRatio: aspect ?? '89 / 51' };
  }
}

export const SIZE_ASPECT: Record<string, string> = {
  standard: '89 / 51',
  square: '1 / 1',
  mini: '85 / 45',
};
