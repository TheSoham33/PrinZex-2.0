const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.seller.updateMany({
    where: { status: { not: 'APPROVED' } },
    data: { status: 'APPROVED', isVerified: true }
  });
  console.log(`Approved ${result.count} sellers`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
