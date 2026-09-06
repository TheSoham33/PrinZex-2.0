/**
 * Photo Print pricing — pure math, no Prisma/DB imports, so both
 * computeQuote (orders.helpers.ts) and the offline check script
 * (scripts/check-photo-print.ts) can use it.
 *
 * Model (per product decision):
 *   sheet price   = rate-per-photo × photos-per-sheet + paper extras
 *   order subtotal = sheet price × quantity (quantity = sheets)
 *
 * The customer uploads one photo; every sheet repeats it `photosPerSheet`
 * times at the chosen photo type's size (passport 35×45mm …).
 */

/**
 * Default per-photo rates for Photo Print, used when the seller hasn't
 * saved their own photoTypeOptions prices. Catalogue rows ('photo-types')
 * decide labels, hints and availability; a price here (or a seller
 * override) makes a key chargeable.
 */
export const PHOTO_TYPE_PRICES: Record<string, number> = {
  'passport-photo': 12,
  'postcard-size': 20,
  'photo-4x6': 25,
  'photo-5x7': 35,
};

/**
 * Which photos-per-sheet layouts each photo type offers. A sheet repeats
 * the uploaded photo this many times. Kept in sync with the 'photo-types'
 * catalogue defaults — the backend validates against these even when the
 * catalogue is edited, so a layout can never be silently invented.
 */
export const PHOTO_TYPE_LAYOUTS: Record<string, readonly number[]> = {
  'passport-photo': [4, 8],
  'postcard-size': [2, 4],
  'photo-4x6': [4, 6],
  'photo-5x7': [2, 4],
};

/**
 * Photo Print order subtotal (unrounded — the caller applies its own
 * round2, matching the other computeQuote branches).
 *
 * Unknown types rate ₹0 (never crash); payload validation
 * (assertPhotoSpecValid) is what actually blocks them at placement.
 */
export function photoPrintSubtotal(input: {
  photoType?: string;
  photosPerSheet?: number;
  quantity: number;
  /** Seller's paper-type + paper-size extras, per sheet. */
  paperOptionExtra: number;
  /** Seller's photoTypeOptions (per-photo rates); platform defaults otherwise. */
  sellerPrices?: Record<string, number>;
}): number {
  const photoType = input.photoType ?? 'passport-photo';
  const photosPerSheet =
    input.photosPerSheet ?? PHOTO_TYPE_LAYOUTS[photoType]?.[0] ?? 2;
  const photoRate = input.sellerPrices?.[photoType] ?? PHOTO_TYPE_PRICES[photoType] ?? 0;
  return (photoRate * photosPerSheet + input.paperOptionExtra) * input.quantity;
}
