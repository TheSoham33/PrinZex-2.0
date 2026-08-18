import { PrismaClient } from '@prisma/client';

/**
 * One-shot data migration: backfill seller-wide per-page B&W/colour rates
 * (`metadata.pricingOverrides.pageRate`) onto sellers that predate the
 * page-rate pricing model.
 *
 * Run against an existing database with:  npm run db:backfill-page-rates
 * It is idempotent — sellers that already have pageRate are left untouched.
 *
 * Rate derivation (mirrors the computeQuote fallbacks):
 *   - bw    = the seller's page-service base price (first `unit` containing
 *             "page"), or 0 when they offer no page service
 *   - color = legacy colorOption.color when present, else bw × 2
 *
 * Existing binding add-ons (coverType / coilType / coverColor) are preserved.
 */
const prisma = new PrismaClient();

interface PricingOverrides {
  pageRate?: { bw: number; color: number };
  colorOption?: { bw?: number; color?: number };
  coverType?: Record<string, number>;
  coilType?: Record<string, number>;
  coverColor?: Record<string, number>;
}

function readOverrides(metadata: unknown): PricingOverrides {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return ((metadata as any).pricingOverrides ?? {}) as PricingOverrides;
  }
  return {};
}

async function main() {
  const sellers = await prisma.seller.findMany({
    include: { services: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const seller of sellers) {
    const overrides = readOverrides(seller.metadata);

    if (overrides.pageRate) {
      skipped += 1;
      continue;
    }

    // First per-page service provides the B&W baseline rate.
    const pageService = seller.services.find((svc) =>
      svc.unit.toLowerCase().includes('page'),
    );
    const bw = pageService ? Number(pageService.basePrice) : 0;

    if (bw <= 0) {
      // No page service and no rates to derive — nothing meaningful to write.
      skipped += 1;
      continue;
    }

    const color = overrides.colorOption?.color ?? bw * 2;

    const metadata = {
      ...(seller.metadata && typeof seller.metadata === 'object'
        ? (seller.metadata as Record<string, unknown>)
        : {}),
      pricingOverrides: {
        // Preserve the existing binding add-ons, if any.
        ...(overrides.coverType ? { coverType: overrides.coverType } : {}),
        ...(overrides.coilType ? { coilType: overrides.coilType } : {}),
        ...(overrides.coverColor ? { coverColor: overrides.coverColor } : {}),
        pageRate: { bw, color },
      },
    };

    await prisma.seller.update({
      where: { id: seller.id },
      data: { metadata: metadata as any },
    });

    updated += 1;
    console.log(`Backfilled pageRate for seller ${seller.storeName}: bw ₹${bw} / color ₹${color}`);
  }

  console.log(`Done. Updated ${updated} seller(s), skipped ${skipped} seller(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to backfill page rates:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
