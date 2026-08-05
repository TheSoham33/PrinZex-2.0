const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  console.log('--- USERS ---');
  console.table(users);

  const sellers = await prisma.seller.findMany({
    select: { id: true, storeName: true, ownerName: true, status: true, createdAt: true }
  });
  console.log('--- SELLERS ---');
  console.table(sellers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
