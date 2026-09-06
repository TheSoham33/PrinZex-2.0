/**
 * Photo Print pricing — pure math, no Prisma/DB imports, so both
 * computeQuote (orders.helpers.ts) and the offline check script
 * (scripts/check-photo-print.ts) can use it.
 *
 * Model (per product decision):
 *   The seller prices each (photo type × photos-per-sheet) combo directly:
 *   sheet price  = combo price (₹ per sheet) + paper extras
 *   subtotal     = sheet price × quantity (quantity = sheets)
 *
 * Platform default for a combo = the type's per-photo rate × photos per
 * sheet, so unconfigured sellers keep per-type economics with zero extra
 * tables. The customer uploads one photo; every sheet repeats it
 * `photosPerSheet` times at the chosen photo type's size (passport 35×45mm …).
 */

/**
 * Default per-photo rates per photo type. With no seller combo price the
 * sheet price defaults to rate × photos-per-sheet.
 */
export const PHOTO_TYPE_PRICES: Record<string, number> = {
  'passport-photo': 12,
  'postcard-size': 20,
  'photo-4x6': 25,
  'photo-5x7': 35,
};

/**
 * Shipped photos-per-sheet choices — mirrors the 'photo-layouts' catalogue
 * defaults (admin may add/delete rows there; membership is validated against
 * the catalogue at quote/placement, falling back to these).
 */
export const PHOTO_SHEET_COUNTS: readonly number[] = [8, 12];

/** Preselected layout when the payload omits one and the seller offers it. */
export const DEFAULT_PHOTOS_PER_SHEET = 8;

/** Seller's combo prices: photo type → photos-per-sheet → ₹ per sheet. */
export type PhotoComboPrices = Record<string, Record<string, number>>;

/** Prefer the default count when offered, else the first offered count. */
export function preferredPhotoCount(offered: readonly number[]): number {
  return offered.includes(DEFAULT_PHOTOS_PER_SHEET)
    ? DEFAULT_PHOTOS_PER_SHEET
    : (offered[0] ?? DEFAULT_PHOTOS_PER_SHEET);
}

/**
 * Read the seller's combo price for (type, count), tolerating legacy
 * flat ₹-per-photo number values saved before combo pricing — those simply
 * stop overriding (fall through to the platform default) so old seller
 * documents never throw.
 */
function comboPrice(
  sellerCombos: PhotoComboPrices | Record<string, number> | undefined,
  photoType: string,
  photosPerSheet: number,
): number | undefined {
  const perType = sellerCombos?.[photoType];
  if (typeof perType !== 'object' || perType === null) return undefined;
  const price = (perType as Record<string, number>)[String(photosPerSheet)];
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

/**
 * ₹ per printed sheet for (type, count): the seller's combo price wins,
 * else the platform default — per-photo rate × count (₹0 for unknown
 * types; payload validation blocks them at placement, never crash here).
 */
export function photoSheetPrice(
  photoType: string,
  photosPerSheet: number,
  sellerCombos?: PhotoComboPrices | Record<string, number>,
): number {
  const fromSeller = comboPrice(sellerCombos, photoType, photosPerSheet);
  if (fromSeller !== undefined) return fromSeller;
  return (PHOTO_TYPE_PRICES[photoType] ?? 0) * photosPerSheet;
}

/**
 * Photo Print order subtotal (unrounded — the caller applies its own
 * round2, matching the other computeQuote branches).
 */
export function photoPrintSubtotal(input: {
  photoType?: string;
  photosPerSheet?: number;
  quantity: number;
  /** Seller's paper-type + paper-size extras, per sheet. */
  paperOptionExtra: number;
  /** Seller's photoTypeOptions combo prices; platform defaults otherwise. */
  sellerCombos?: PhotoComboPrices | Record<string, number>;
}): number {
  const photoType = input.photoType ?? 'passport-photo';
  const photosPerSheet = input.photosPerSheet ?? DEFAULT_PHOTOS_PER_SHEET;
  const sheetPrice = photoSheetPrice(photoType, photosPerSheet, input.sellerCombos);
  return (sheetPrice + input.paperOptionExtra) * input.quantity;
}
