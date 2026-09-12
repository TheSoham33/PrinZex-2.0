import { PrismaClient } from '@prisma/client';

/**
 * One-shot data migration: rename the "Printing" service to "Document Printing"
 * for databases seeded before the rename.
 *
 * Run with:  npm run db:rename-print-service
 * Idempotent — rows already named "Document Printing" are left untouched.
 */
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.sellerService.updateMany({
    where: { serviceId: 'doc-print', serviceName: { not: 'Document Printing' } },
    data: { serviceName: 'Document Printing' },
  });

  // Historical order items that snapshotted the old name.
  const items = await prisma.orderItem.updateMany({
    where: { serviceName: 'Printing' },
    data: { serviceName: 'Document Printing' },
  });

  console.log(
    `Renamed ${services.count} service row(s) and ${items.count} order item(s) to "Document Printing".`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to rename printing service:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
