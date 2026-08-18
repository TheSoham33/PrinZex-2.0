import { PrismaClient } from '@prisma/client';

/**
 * One-shot data migration: merge legacy "B&W Printing" (doc-bw-print) and
 * "Colour Printing" (doc-color-print) services into a single "Printing"
 * (doc-print) service.
 *
 * Run against an existing database with:  npm run db:merge-print
 * It is idempotent — safe to run more than once.
 *
 * For each seller it:
 *   1. finds (or creates) a `doc-print` "Printing" service,
 *      pricing the B&W rate as the base per-page price,
 *   2. re-points any order items from the legacy services to the merged one,
 *   3. deletes the legacy rows.
 */
const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.sellerService.findMany({
    where: { serviceId: { in: ['doc-bw-print', 'doc-color-print'] } },
  });

  if (legacy.length === 0) {
    console.log('Nothing to merge — no legacy B&W/Colour printing services found.');
    return;
  }

  const bySeller = new Map<string, typeof legacy>();
  for (const svc of legacy) {
    const list = bySeller.get(svc.sellerId) ?? [];
    list.push(svc);
    bySeller.set(svc.sellerId, list);
  }

  for (const [sellerId, rows] of bySeller) {
    const bw = rows.find((r) => r.serviceId === 'doc-bw-print');
    const color = rows.find((r) => r.serviceId === 'doc-color-print');

    // B&W is the entry price for the merged service.
    const basePrice = bw ? Number(bw.basePrice) : color ? Number(color.basePrice) : 0;
    const unit = bw?.unit ?? color?.unit ?? 'per page';
    const { categoryId, categoryName } = rows[0];

    let merged = await prisma.sellerService.findUnique({
      where: { sellerId_serviceId: { sellerId, serviceId: 'doc-print' } },
    });

    if (!merged) {
      merged = await prisma.sellerService.create({
        data: {
          sellerId,
          categoryId,
          categoryName,
          serviceId: 'doc-print',
          serviceName: 'Printing',
          basePrice,
          unit,
          isActive: true,
        },
      });
    }

    // Re-point order items before removing the legacy rows (FK safety).
    for (const row of rows) {
      await prisma.orderItem.updateMany({
        where: { sellerServiceId: row.id },
        data: { sellerServiceId: merged.id, serviceName: 'Printing' },
      });
    }

    for (const row of rows) {
      await prisma.sellerService.delete({ where: { id: row.id } });
    }

    console.log(`Merged printing services for seller ${sellerId} (${rows.length} legacy row(s) removed).`);
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Failed to merge printing services:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
