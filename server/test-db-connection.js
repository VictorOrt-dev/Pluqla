// Test simple de connexion PostgreSQL avec Prisma
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

console.log('🔍 Testing PostgreSQL connection...');
console.log('📝 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Masque le mot de passe

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing raw query...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Raw query successful:', result);

    console.log('\n2️⃣ Testing User model...');
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);

    console.log('\n3️⃣ Fetching sample user...');
    const sampleUser = await prisma.user.findFirst({
      select: { id: true, email: true, name: true, subscriptionTier: true }
    });
    console.log('✅ Sample user:', sampleUser);

    console.log('\n✅ All connection tests PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test FAILED:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
