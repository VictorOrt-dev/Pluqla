/**
 * Global Test Teardown
 *
 * Runs once after all test suites
 * Cleans up test database and resources
 */

const { PrismaClient } = require('@prisma/client');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    await prisma.$connect();

    // Comprehensive cleanup of all test data
    console.log('🗑️ Removing all test data...');

    // Clean up in correct order due to foreign key constraints
    await prisma.betterAuthSession.deleteMany({
      where: {
        OR: [
          { user: { email: { contains: 'test' } } },
          { sessionToken: { contains: 'test' } }
        ]
      }
    });

    await prisma.transaction.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });

    await prisma.analyticsEvent.deleteMany({
      where: {
        OR: [
          { user: { email: { contains: 'test' } } },
          { sessionId: { contains: 'test' } }
        ]
      }
    });

    await prisma.cacheEntry.deleteMany({
      where: {
        OR: [
          { user: { email: { contains: 'test' } } },
          { cacheKey: { contains: 'test' } }
        ]
      }
    });

    // Clean up any Better Auth accounts for test users
    await prisma.betterAuthAccount.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });

    // Remove test users last
    const deletedUsers = await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });

    console.log(`✅ Cleaned up ${deletedUsers.count} test users and related data`);

    // Clean up expired sessions (good practice)
    const expiredSessions = await prisma.betterAuthSession.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });

    if (expiredSessions.count > 0) {
      console.log(`🕒 Cleaned up ${expiredSessions.count} expired sessions`);
    }

    // Final verification
    const remainingTestUsers = await prisma.user.count({
      where: { email: { contains: 'test' } }
    });

    if (remainingTestUsers > 0) {
      console.warn(`⚠️ Warning: ${remainingTestUsers} test users still remain`);
    } else {
      console.log('✅ All test data successfully removed');
    }

    await prisma.$disconnect();

    console.log('🏁 Test environment cleanup completed');

  } catch (error) {
    console.error('❌ Test cleanup failed:', error);

    // Don't fail teardown - just log the error
    console.warn('⚠️ Some test data may not have been cleaned up properly');
  }
};