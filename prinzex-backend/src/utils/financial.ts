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

/**
 * Split a refund (or any money-back amount) between wallet and gateway:
 * what came from the wallet (capped at the order's walletAmount) returns to
 * the wallet, the rest returns to the bank/gateway. walletPart + gatewayPart
 * always equals the rounded input — no paise dust ever appears or vanishes.
 */
export function splitWalletGateway(
  amount: number,
  walletAmount: number,
): { walletPart: number; gatewayPart: number } {
  const total = roundMoney(amount);
  const walletPart = Math.max(0, Math.min(total, roundMoney(walletAmount)));
  return { walletPart, gatewayPart: roundMoney(total - walletPart) };
}
