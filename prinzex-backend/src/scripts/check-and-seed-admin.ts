import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { email: 'admin@prinzex.com' }
  });
  console.log('Admin found:', admin ? 'Yes' : 'No');
  if (admin) {
    console.log('Admin details:', { id: admin.id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive });
  } else {
    console.log('Seeding default admin...');
    const bcrypt = require('bcryptjs');
    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@prinzex.com',
        passwordHash: await bcrypt.hash('Admin@123', 10),
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log('Default admin created: admin@prinzex.com / Admin@123');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
