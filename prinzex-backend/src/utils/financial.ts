/**
 * Financial helpers — the ONLY arithmetic allowed on money values outside
 * quote computation. Every helper is pure; call-sites never do raw float math
 * on monetary values (rounding/paise conversions must come from here).
 */

/** Round a monetary value to 2 decimals — kills floating-point drift. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Razorpay speaks integer paise; our DB speaks rupee Decimals. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
