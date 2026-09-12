import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@nexus.com';
  const password = 'Admin123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: 'SUPER_ADMIN',
        isOwner: true,
        name: 'Super Admin',
      },
    });
    console.log('✅ Admin créé : admin@nexus.com / Admin123!');
  } else {
    console.log('✅ Admin existe déjà');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
