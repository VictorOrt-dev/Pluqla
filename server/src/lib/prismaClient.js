/**
 * Prisma Client Singleton
 *
 * Ensures only one PrismaClient instance is created across the application.
 * Prevents connection pool exhaustion by reusing the same client.
 *
 * Development: Uses global cache to survive hot-reloads
 * Production: Creates single instance on first require
 *
 * Usage:
 *   const prisma = require('./lib/prismaClient');
 *   await prisma.user.findMany();
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Singleton instance holder
let prisma;

/**
 * Create Prisma Client with optimized configuration
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' }
    ],
    // Connection pool configuration
    // Default: min=2, max=10 (adjust based on load)
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Log slow queries in development (>100ms)
  if (process.env.NODE_ENV !== 'production') {
    client.$on('query', (e) => {
      if (e.duration > 100) {
        logger.warn('Slow query detected', {
          query: e.query,
          duration: `${e.duration}ms`,
          params: e.params
        });
      }
    });
  }

  // Graceful shutdown handler
  const gracefulShutdown = async () => {
    logger.info('Disconnecting Prisma Client...');
    await client.$disconnect();
    logger.info('Prisma Client disconnected');
  };

  // Register shutdown handlers
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('beforeExit', gracefulShutdown);

  logger.info('✅ Prisma Client initialized (singleton)');

  return client;
}

/**
 * Get Prisma Client instance (singleton)
 */
function getPrismaClient() {
  // Development: Use global cache to survive hot-reloads
  if (process.env.NODE_ENV !== 'production') {
    if (!global.__prisma) {
      global.__prisma = createPrismaClient();
    }
    return global.__prisma;
  }

  // Production: Create singleton
  if (!prisma) {
    prisma = createPrismaClient();
  }

  return prisma;
}

// Export singleton instance
module.exports = getPrismaClient();

// Export for testing/cleanup
module.exports.disconnect = async () => {
  const client = module.exports;
  await client.$disconnect();
  prisma = null;
  if (global.__prisma) {
    global.__prisma = null;
  }
};
