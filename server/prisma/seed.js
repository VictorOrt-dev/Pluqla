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

    // Create premium test user
    const premiumUser = await prisma.user.upsert({
      where: { email: 'premium@pluqla.com' },
      update: {},
      create: {
        email: 'premium@pluqla.com',
        password: hashedPassword,
        name: 'Premium User',
        status: 'active',
        savedAmount: 500.0,
        monthlyGoal: 1500.0,
        level: 5,
        gamificationPoints: 1000,
        emailVerified: true,
        isPremium: true,
        subscriptionTier: 'PREMIUM', // NEW: Explicit tier
        subscriptionStartDate: new Date(), // Started today
        subscriptionEndDate: null, // Active subscription (no end date)
        streak: 30,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Created premium test user:', premiumUser.email);

    // Create free tier test user
    const freeUser = await prisma.user.upsert({
      where: { email: 'free@pluqla.com' },
      update: {},
      create: {
        email: 'free@pluqla.com',
        password: hashedPassword,
        name: 'Free User',
        status: 'active',
        savedAmount: 50.0,
        monthlyGoal: 500.0,
        level: 1,
        gamificationPoints: 50,
        emailVerified: true,
        isPremium: false,
        subscriptionTier: 'FREE', // NEW: Explicit tier
        streak: 3,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Created free test user:', freeUser.email);

    // Create admin test user with premium bypass
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@pluqla.com' },
      update: {},
      create: {
        email: 'admin@pluqla.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin', // Admin role bypasses premium checks
        status: 'active',
        savedAmount: 1000.0,
        monthlyGoal: 2000.0,
        level: 10,
        gamificationPoints: 5000,
        emailVerified: true,
        isPremium: false, // Admin doesn't need premium
        subscriptionTier: 'FREE', // But can access all features
        streak: 100,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Created admin test user:', adminUser.email);

    // Initialize AI usage quotas (empty for fresh start)
    // Quotas will be created on first AI request
    console.log('✅ AI quotas will be initialized on first usage');

    // Note: Categories model not yet available in schema
    console.log('ℹ️  Categories not seeded (model not in schema)');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test credentials:');
    console.log('   🆓 Free User:');
    console.log('     Email: test@pluqla.com / free@pluqla.com');
    console.log('     Password: password123');
    console.log('     Tier: FREE');
    console.log('     AI Quota: 50 tokens/day');
    console.log('     Premium Features: ❌ Blocked (403)');
    console.log('   💎 Premium User:');
    console.log('     Email: premium@pluqla.com');
    console.log('     Password: password123');
    console.log('     Tier: PREMIUM');
    console.log('     AI Quota: 500 tokens/day');
    console.log('     Premium Features: ✅ Allowed (200)');
    console.log('   👑 Admin User:');
    console.log('     Email: admin@pluqla.com');
    console.log('     Password: password123');
    console.log('     Role: admin');
    console.log('     Premium Features: ✅ Bypass (200)');
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