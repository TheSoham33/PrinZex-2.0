/**
 * Rasterise a card-studio doc into a print-ready PNG (trim + 3 mm bleed at
 * 300 DPI) using the DOM canvas — no export dependency. Runs only in the
 * browser; the modal is still mounted at save time so icon elements resolve
 * their SVG straight out of the (possibly hidden) stage.
 */
import {
  BLEED_MM,
  MM_PER_IN,
  PRINT_DPI,
  exportPixels,
  type IconElement,
  type ImageElement,
  type ShapeElement,
  type StudioDoc,
  type StudioSide,
  type TextElement,
} from './model';

export type IconResolver = (el: IconElement) => SVGSVGElement | null;

/**
 * Read any same-origin/blob image URL into a capped data URL so it can live
 * inside a serialized studio doc (blob URLs die with the tab, and the order
 * API caps spec fields). Capping at the export width loses nothing the
 * 300-DPI print would have kept.
 */
export async function toCappedDataUrl(url: string, maxWidthPx: number): Promise<string> {
  const blob = await (await fetch(url)).blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Only image designs can be edited in the studio');
  }
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidthPx / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL(blob.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url.slice(0, 64)}`));
    img.src = url;
  });

/** Serialise the on-stage SVG so stroke=currentColor resolves to el.color. */
async function iconToImage(el: IconElement, resolveIcon: IconResolver) {
  const node = resolveIcon(el);
  if (!node) return null;
  const clone = node.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', '256');
  clone.setAttribute('height', '256');
  clone.style.color = el.color;
  const svg = new XMLSerializer().serializeToString(clone);
  return loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  ).catch(() => null);
}

function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }) {
  // Cover-fit: scale up to fill the box, centre-crop the overflow.
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const sw = box.w / scale;
  const sh = box.h / scale;
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    box.x,
    box.y,
    box.w,
    box.h,
  );
}

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeElement, box: { x: number; y: number; w: number; h: number }) {
  ctx.fillStyle = el.color;
  if (el.shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (el.shape === 'round') {
    const radius = Math.min(box.w, box.h) * 0.15;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, radius);
    ctx.fill();
    return;
  }
  ctx.fillRect(box.x, box.y, box.w, box.h); // 'rect' and 'line' (a thin bar)
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement, box: { x: number; y: number; w: number }) {
  const fontPx = (el.fontSize * PRINT_DPI) / 72;
  ctx.fillStyle = el.color;
  ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? '700 ' : '400 '}${fontPx}px ${el.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = el.align;
  const anchorX =
    el.align === 'center' ? box.x + box.w / 2 : el.align === 'right' ? box.x + box.w : box.x;
  const lineHeight = fontPx * 1.25;
  let y = box.y;
  for (const paragraph of el.text.split('\n')) {
    // Greedy word wrap against the same box width the stage uses.
    const words = paragraph.split(' ');
    let line = '';
    const flush = () => {
      if (line) ctx.fillText(line, anchorX, y, box.w);
      y += lineHeight;
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > box.w) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    flush();
    if (paragraph === '') y += 0; // blank line already advanced by flush()
  }
}

export async function renderSideToFile(
  doc: StudioDoc,
  size: { w: number; h: number },
  side: StudioSide,
  resolveIcon: IconResolver,
): Promise<File> {
  const { w, h } = exportPixels(size, PRINT_DPI);
  const pxPerMm = PRINT_DPI / MM_PER_IN;
  const bleedPx = BLEED_MM * pxPerMm;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser');

  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, w, h);

  for (const el of doc.elements) {
    const box = {
      x: bleedPx + el.x * pxPerMm,
      y: bleedPx + el.y * pxPerMm,
      w: el.w * pxPerMm,
      h: el.h * pxPerMm,
    };
    if (el.kind === 'image') {
      const img = await loadImage((el as ImageElement).url).catch(() => null);
      if (img) drawImage(ctx, img, box);
    } else if (el.kind === 'shape') {
      ctx.save();
      drawShape(ctx, el as ShapeElement, box);
      ctx.restore();
    } else if (el.kind === 'text') {
      ctx.save();
      drawText(ctx, el as TextElement, box);
      ctx.restore();
    } else {
      const img = await iconToImage(el as IconElement, resolveIcon);
      if (img) ctx.drawImage(img, box.x, box.y, box.w, box.h);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('PNG export failed'))),
      'image/png',
    ),
  );
  return new File([blob], side === 'front' ? 'card-front.png' : 'card-back.png', {
    type: 'image/png',
  });
}
