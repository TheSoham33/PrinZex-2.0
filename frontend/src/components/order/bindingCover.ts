import { PDFDocument } from 'pdf-lib';

/**
 * Shared pure helpers for wrap-cover binding services (Tape Binding, Glue
 * Binding): single-page cover-artwork validation (PDF or 300-DPI raster)
 * and spine-width estimation. Everything here is deterministic and unit
 * checked by scripts/check-binding-cover.ts.
 */

export const COVER_MAX_BYTES = 25 * 1024 * 1024;

export const COVER_ACCEPT =
  'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';

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

/** Sheets hold two pages at the standard 75/80 GSM caliper (0.1 mm each) —
 * Tape and Glue binding offer no paper-thickness option (owner rule). Each
 * style needs its own minimum grip width (tape 4 mm, glue 3 mm). */
export function estimateWrapSpineMm(totalPages: number, minWidthMm: number): number {
  if (!totalPages || totalPages <= 0) return 0;
  const sheets = Math.ceil(totalPages / 2);
  return Math.max(minWidthMm, Math.round(sheets * 0.1 * 10) / 10);
}

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

/** Returns an error message, or null when the cover file is usable. `size`
 *  is the chosen paper size — it sets the 300-DPI pixel gate for rasters. */
export async function validateCoverArtwork(
  file: File,
  size: string | undefined,
): Promise<string | null> {
  if (file.size > COVER_MAX_BYTES) {
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
      const min = requiredPixelsForSize(size);
      if (!meetsResolution(width, height, size)) {
        return `Cover artwork must be 300 DPI minimum — at least ${min.width}×${min.height} px for ${
          size ?? 'A4'
        } (yours is ${width}×${height} px).`;
      }
      return null;
    } catch {
      return 'Could not read that image — upload a PNG or JPG file.';
    }
  }
  return 'Unsupported file type — upload a PDF, PNG or JPG design.';
}
