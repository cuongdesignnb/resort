import prisma from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function testConnection() {
  console.log('--- TESTING PRISMA DATABASE CONNECTION ---');
  try {
    // 1. Connection check
    console.log('Attempting to connect to the database...');
    await prisma.$connect();
    console.log('Successfully connected to the database!');

    // 2. Perform a test seed of a default admin user
    console.log('Upserting default test user...');
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
    console.log(`Admin user is ready: ID = ${admin.id}, Name = ${admin.name}`);
    console.log('Database test completed successfully!');
  } catch (err: any) {
    console.error('Database connection or seeding failed:', err.message);
    console.error('Please make sure PostgreSQL is running (e.g., via docker compose up -d) and the DATABASE_URL in your .env file is correct.');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
