/**
 * Quantity slab pricing (Business Cards): slabs are "from qty, per-piece
 * rate" tiers. The applicable rate is the tier with the highest threshold
 * not exceeding the ordered quantity; below the smallest tier the smallest
 * tier's rate applies (its qty should equal the service's minQuantity).
 * Returns undefined when the seller hasn't configured slabs for the service.
 *
 * Kept dependency-free so scripts/check-card-pricing.ts can execute it
 * without the Prisma client.
 */
export function pickSlabRate(
  slabs: { qty: number; rate: number }[] | undefined,
  quantity: number,
): number | undefined {
  if (!slabs?.length) return undefined;
  const sorted = [...slabs].sort((a, b) => a.qty - b.qty);
  const tier = [...sorted].reverse().find((s) => quantity >= s.qty) ?? sorted[0];
  return tier.rate;
}
