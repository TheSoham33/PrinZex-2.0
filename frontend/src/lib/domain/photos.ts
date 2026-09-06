/**
 * Photo Print sheet-preview math. Pure (no React/Prisma) so the runnable check
 * imports it directly — same pattern as the backend's photoPricing.ts.
 *
 * The preview tiles the chosen photos-per-sheet count across a two-column
 * grid on the selected paper sheet; "W × H" size hints ('35 × 45 mm',
 * '210 × 297 mm') are parsed into dimensions so the sheet keeps truthful
 * proportions without a catalogue schema change.
 */

/** Parse a "W × H <unit>" hint (×, x, or * between the numbers). */
export function hintDimensions(
  hint: string | undefined,
): { w: number; h: number } | null {
  if (!hint) return null;
  const match = hint.match(/(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  return w > 0 && h > 0 ? { w, h } : null;
}

/**
 * Grid for `count` photos on one sheet: two columns side by side (one for a
 * single photo), rows filling down. Junk input collapses to one photo — the
 * preview must never crash on a malformed count.
 */
export function layoutPhotoSheet(count: number): {
  photos: number;
  cols: number;
  rows: number;
} {
  const photos = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const cols = Math.min(2, photos);
  return { photos, cols, rows: Math.ceil(photos / cols) };
}

/** A4 fallback when the paper size carries no parseable dimensions. */
export const PHOTO_SHEET_FALLBACK = { w: 210, h: 297 } as const;
