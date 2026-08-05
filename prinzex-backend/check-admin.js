const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { email: 'admin@prinzex.com' }
  });
  console.log('Admin found:', admin ? 'Yes' : 'No');
  if (admin) {
    console.log('Admin details:', { id: admin.id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive });
  }
}

main().finally(() => prisma.$disconnect());
