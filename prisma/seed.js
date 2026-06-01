const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = 'cuong_resort_static_salt_value';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function main() {
  console.log('Seeding database...');
  const hashedDefaultPassword = hashPassword('admin123');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@resort.com' },
    update: {
      passwordHash: hashedDefaultPassword,
    },
    create: {
      email: 'admin@resort.com',
      name: 'Cuong Admin',
      passwordHash: hashedDefaultPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Admin user seeded: email=admin@resort.com, password=admin123`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
