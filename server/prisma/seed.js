/**
 * 🌱 Pluqla Database Seeder
 *
 * Seeds the database with initial test data for development
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);

    const testUser = await prisma.user.upsert({
      where: { email: 'test@pluqla.com' },
      update: {},
      create: {
        email: 'test@pluqla.com',
        password: hashedPassword,
        name: 'Test User',
        status: 'active',
        savedAmount: 150.0,
        monthlyGoal: 800.0,
        level: 2,
        gamificationPoints: 250,
        emailVerified: true,
        isPremium: false,
        streak: 5,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Created test user:', testUser.email);

    // Create some sample transactions
    await prisma.transaction.createMany({
      data: [
        {
          userId: testUser.id,
          description: 'Économie sur déjeuner',
          amount: 12.50,
          category: 'alimentation',
          type: 'expense',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          userId: testUser.id,
          description: 'Transport en vélo',
          amount: 3.80,
          category: 'transport',
          type: 'expense',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          userId: testUser.id,
          description: 'Achat en promo',
          amount: 8.00,
          category: 'shopping',
          type: 'expense',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
      ],
    });

    console.log('✅ Created sample transactions');

    // Note: Categories model not yet available in schema
    console.log('ℹ️  Categories not seeded (model not in schema)');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test credentials:');
    console.log('   Email: test@pluqla.com');
    console.log('   Password: password123');
    console.log('\n🔗 You can now test the login API at: http://localhost:3004/api/auth/login');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });