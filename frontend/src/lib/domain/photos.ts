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

/**
 * The "from ₹X/sheet" anchor for Photo Print, used everywhere the seller's
 * service base price (e.g. a ₹60/page the combos ignore) would otherwise
 * mislead. Anchored on the 8-photos-per-sheet option — the seller's own
 * 8-price when set, else the type's rate × 8 — cheapest across the offered
 * types (combo keys); an unconfigured store anchors on every catalogue type
 * at platform rates. When no offered type prices 8 explicitly, the seller's
 * smallest priced count anchors instead. Legacy flat ₹/photo maps are
 * ignored (rate × count). Returns null for an empty type list.
 */
export function photoFromPrice(
  allTypes: ReadonlyArray<{ value: string; price: number }>,
  combos: Record<string, Record<string, number>> | undefined,
  preferredCount = 8,
): { count: number; price: number } | null {
  if (allTypes.length === 0) return null;
  const offered = allTypes.filter((type) => combos && type.value in combos);
  const types = offered.length ? offered : [...allTypes];

  const sellerCounts = new Set<number>();
  for (const type of types) {
    const perType = combos?.[type.value];
    if (typeof perType === 'object' && perType !== null) {
      for (const key of Object.keys(perType)) {
        const count = Number(key);
        if (Number.isInteger(count) && count >= 2) sellerCounts.add(count);
      }
    }
  }
  const count =
    sellerCounts.size > 0 && !sellerCounts.has(preferredCount)
      ? Math.min(...sellerCounts)
      : preferredCount;

  let price: number | null = null;
  for (const type of types) {
    const perType = combos?.[type.value];
    const sellerPrice =
      typeof perType === 'object' && perType !== null
        ? perType[String(count)]
        : undefined;
    const candidate = sellerPrice ?? type.price * count;
    if (price === null || candidate < price) price = candidate;
  }
  return price === null ? null : { count, price };
}
