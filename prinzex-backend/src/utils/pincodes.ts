/**
 * Pincode registry helpers — the structured-geography layer (Option A).
 * Every "does X cover this order" decision is an EXACT 6-digit pincode
 * equality against the Pincode table; free-text zone names no longer exist.
 * zoneLabel ("Salt Lake") is display-only UX and never part of matching.
 */

export const PINCODE_REGEX = /^\d{6}$/;

/** Trim + validate an arbitrary input into a canonical 6-digit PIN, else null. */
export function normalizePincode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return PINCODE_REGEX.test(value) ? value : null;
}

export function isValidPincode(input: unknown): boolean {
  return normalizePincode(input) !== null;
}

/**
 * Coverage match: a rider/store with NO registry rows is unrestricted (the
 * ops default — coverage not configured yet); once rows exist, the order's
 * pincode must be an exact member. Unknown/absent order pincode falls back
 * to "not covered" when coverage rows exist, "covered" when they don't.
 */
export function coversPincode(coveragePincodes: string[], orderPincode: string | null): boolean {
  if (coveragePincodes.length === 0) return true;
  if (!orderPincode) return false;
  return coveragePincodes.includes(orderPincode);
}

/** Extract the pincode from an order's deliveryAddress JSON snapshot. */
export function pincodeOfAddress(address: unknown): string | null {
  if (!address || typeof address !== 'object') return null;
  return normalizePincode((address as { pincode?: unknown }).pincode);
}
