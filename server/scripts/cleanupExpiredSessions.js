#!/usr/bin/env node
/**
 * Session Cleanup Script
 *
 * Deletes expired Better Auth sessions from the database.
 * Can be run manually or via cron job.
 *
 * Usage:
 *   node scripts/cleanupExpiredSessions.js [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 */

const { prisma } = require('../src/lib/prisma');
const logger = require('../src/utils/logger');

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

async function cleanupExpiredSessions() {
  try {
    logger.info('🧹 Starting session cleanup', { isDryRun });

    // Count expired sessions
    const expiredCount = await prisma.betterAuthSession.count({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });

    logger.info(`Found ${expiredCount} expired sessions`);

    if (expiredCount === 0) {
      logger.info('✅ No expired sessions to clean up');
      return 0;
    }

    if (isDryRun) {
      logger.info(`[DRY RUN] Would delete ${expiredCount} expired sessions`);

      // Show sample of what would be deleted
      const sample = await prisma.betterAuthSession.findMany({
        where: {
          expires: {
            lt: new Date()
          }
        },
        take: 5,
        select: {
          id: true,
          expires: true,
          userId: true
        }
      });

      logger.info('Sample of sessions to be deleted:', sample);
      return expiredCount;
    }

    // Delete expired sessions in batches (for large datasets)
    const batchSize = 1000;
    let totalDeleted = 0;

    while (true) {
      const result = await prisma.betterAuthSession.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        },
        // Note: Prisma doesn't support LIMIT in deleteMany,
        // so we'll delete all at once for PostgreSQL
      });

      totalDeleted += result.count;

      if (result.count === 0) {
        break;
      }

      logger.info(`Deleted ${totalDeleted} sessions so far...`);
    }

    logger.info(`✅ Session cleanup completed: deleted ${totalDeleted} expired sessions`);
    return totalDeleted;

  } catch (error) {
    logger.error('❌ Session cleanup failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupExpiredSessions()
  .then((count) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
