import { roundMoney } from '../../utils/financial';

/**
 * GST taxable-value math — the single place the "what is GST charged on?"
 * question is answered (gap #9: tax/invoice story).
 *
 * DECISION (pending CA sign-off, reversible without a redeploy via
 * Settings → Platform → "GST on delivery & platform fees"):
 *
 *   Delivery fee, rush fee and the platform fee are charges for the SAME
 *   supply as the printed goods (a composite supply whose principal supply is
 *   the printing service), so under GST they form part of the taxable value.
 *   The default is therefore `gstOnFees = true` — GST applies to
 *   subtotal + delivery fee + rush fee + platform fee.
 *
 *   The admin can flip `gstOnFees` off (GST on the subtotal only, the old
 *   behaviour) if the platform's CA advises otherwise for a specific fee —
 *   every quote and invoice re-derives from this one function, so nothing
 *   else needs to change.
 *
 * This module is deliberately dependency-free (imports only utils/financial)
 * so the offline check scripts and jest can exercise the math without a
 * generated Prisma client.
 */

export interface TaxableBaseInput {
  /** Goods/services subtotal (before fees, after seller pricing). */
  subtotal: number;
  /** Extra charge for express/same-day speeds. */
  rushFee: number;
  /** Customer-facing delivery charge for the chosen speed. */
  deliveryFee: number;
  /** Flat admin-configured platform fee. */
  platformFee: number;
  /** Settings → Platform toggle. true = fees are part of the taxable value. */
  gstOnFees: boolean;
}

/** The rupee amount GST is computed on. Always a clean 2-decimal value. */
export function gstTaxableAmount(input: TaxableBaseInput): number {
  const fees = input.gstOnFees
    ? input.rushFee + input.deliveryFee + input.platformFee
    : 0;
  return roundMoney(input.subtotal + fees);
}

/** GST charged = taxable value × rate (fraction, e.g. 0.18), rounded. */
export function gstAmount(taxableAmount: number, gstRate: number): number {
  return roundMoney(taxableAmount * gstRate);
}
