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

export function paiseToRupees(paise: number): number {
  return roundMoney(paise / 100);
}

/** GST on a base amount (default 18%). */
export function calculateGST(amount: number, rate = 0.18): number {
  return roundMoney(amount * rate);
}

/**
 * Seller's net take from an order: the platform keeps both the commission
 * AND the delivery fee (rider is paid separately from platform revenue).
 */
export function sellerNetAmount(orderTotal: number, commissionRate: number, deliveryFee: number): number {
  const commissionAmount = roundMoney(orderTotal * commissionRate);
  return roundMoney(orderTotal - commissionAmount - deliveryFee);
}

/** Platform commission on an order subtotal at a given rate. */
export function commissionOf(subtotal: number, commissionRate: number): number {
  return roundMoney(subtotal * commissionRate);
}
