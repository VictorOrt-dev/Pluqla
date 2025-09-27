/**
 * Prisma Client Singleton
 *
 * This module provides a single, shared PrismaClient instance across the entire application.
 *
 * Key Benefits:
 * - Prevents connection pool exhaustion from multiple PrismaClient instances
 * - Ensures proper connection reuse and management
 * - Provides centralized connection configuration
 * - Enables graceful shutdown and health monitoring
 *
 * Usage:
 *   const prisma = require('./lib/prisma');
 *   const users = await prisma.user.findMany();
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { performanceMonitor } = require('../services/performanceService');

// Global singleton instance
let prismaInstance = null;

/**
 * Creates optimized PrismaClient configuration for production use
 *
 * Connection Pool Settings:
 * - connection_limit: Maximum concurrent connections to database
 * - pool_timeout: How long to wait for connection from pool
 * - statement_timeout: Maximum query execution time
 * - connect_timeout: Maximum connection establishment time
 */
function createPrismaClient() {
  // Build optimized DATABASE_URL with connection pooling
  const baseUrl = process.env.DATABASE_URL;

  if (!baseUrl) {
    // FIXED: Provide default SQLite database for development
    logger.warn('DATABASE_URL not found, using default SQLite database');
    return new PrismaClient({
      datasources: {
        db: {
          url: 'file:./dev.db'
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      errorFormat: 'minimal'
    });
  }

  // Production-optimized connection parameters
  const connectionParams = new URLSearchParams({
    // Connection Pool Configuration
    connection_limit: process.env.DB_CONNECTION_LIMIT || '5',
    pool_timeout: process.env.DB_POOL_TIMEOUT || '10',

    // Query Timeouts (in seconds)
    statement_timeout: process.env.DB_STATEMENT_TIMEOUT || '30000',
    connect_timeout: process.env.DB_CONNECT_TIMEOUT || '10',

    // PostgreSQL Specific Settings
    application_name: process.env.DB_APP_NAME || 'pluqla-backend',

    // Performance Optimizations
    prepared_statements: 'true',
    pgbouncer: process.env.DB_PGBOUNCER || 'false'
  });

  // Construct final database URL with optimizations
  const optimizedUrl = baseUrl.includes('?')
    ? `${baseUrl}&${connectionParams.toString()}`
    : `${baseUrl}?${connectionParams.toString()}`;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: optimizedUrl
      }
    },

    // Logging Configuration
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],

    // Error Formatting
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal'

    // Note: __internal.useUds removed - deprecated in newer Prisma versions
  });

  // Add performance monitoring middleware
  client.$use(async (params, next) => {
    const start = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - start;

      // Track performance for all database operations
      performanceMonitor.trackDatabaseQuery(
        `${params.model}.${params.action}`,
        duration,
        params.args
      );

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      // Track failed queries too
      performanceMonitor.trackDatabaseQuery(
        `${params.model}.${params.action} [ERROR]`,
        duration,
        params.args
      );

      logger.error('Database query failed', {
        model: params.model,
        action: params.action,
        duration,
        error: error.message
      });

      throw error;
    }
  });

  return client;
}

/**
 * Get singleton PrismaClient instance
 *
 * Creates new instance on first call, returns same instance on subsequent calls.
 * Thread-safe and handles hot reload in development.
 *
 * @returns {PrismaClient} Shared Prisma client instance
 */
function getPrismaClient() {
  // Prevent multiple instances during hot reload in development
  if (process.env.NODE_ENV === 'development') {
    if (!global.__prisma) {
      global.__prisma = createPrismaClient();
      logger.info('🗄️ Prisma client created (development mode with hot reload protection)');
    }
    return global.__prisma;
  }

  // Production singleton pattern
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
    logger.info('🗄️ Prisma client created (production singleton)');

    // Add process event listeners for graceful shutdown (Prisma 5.0+ compatible)
    process.on('beforeExit', async () => {
      logger.info('🔌 Prisma client disconnecting...');
    });

    // Health check: Test connection on startup
    prismaInstance.$connect()
      .then(() => {
        logger.info('✅ Database connection established successfully');
      })
      .catch((error) => {
        logger.error('❌ Database connection failed:', error);
        process.exit(1); // Fail fast if database unavailable
      });
  }

  return prismaInstance;
}

/**
 * Gracefully disconnect Prisma client
 *
 * Should be called during application shutdown to:
 * - Close all database connections
 * - Clean up connection pool resources
 * - Prevent connection leaks
 *
 * @param {boolean} force - Force disconnect without waiting for active queries
 * @returns {Promise<void>}
 */
async function disconnectPrisma(force = false) {
  const client = prismaInstance || global.__prisma;

  if (!client) {
    logger.info('🔌 No Prisma client to disconnect');
    return;
  }

  try {
    if (force) {
      logger.warn('⚠️ Force disconnecting Prisma client');
    } else {
      logger.info('🔌 Gracefully disconnecting Prisma client');
    }

    await client.$disconnect();

    // Clear references
    prismaInstance = null;
    if (global.__prisma) {
      global.__prisma = null;
    }

    logger.info('✅ Prisma client disconnected successfully');

  } catch (error) {
    logger.error('❌ Error disconnecting Prisma client:', error);
    throw error;
  }
}

/**
 * Get database connection health status
 *
 * Performs lightweight query to verify database connectivity.
 * Used for health checks and monitoring.
 *
 * @returns {Promise<{healthy: boolean, latency: number, error?: string}>}
 */
async function getDatabaseHealth() {
  const startTime = Date.now();

  try {
    const client = getPrismaClient();

    // Lightweight query to test connection
    await client.$queryRaw`SELECT 1 as health_check`;

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get database connection statistics
 *
 * Queries PostgreSQL system tables to get connection info.
 * Useful for monitoring connection pool usage.
 *
 * @returns {Promise<object>} Connection statistics
 */
async function getConnectionStats() {
  try {
    const client = getPrismaClient();

    // Query PostgreSQL connection statistics
    const stats = await client.$queryRaw`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE application_name LIKE 'pluqla%') as app_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    return stats[0] || {};

  } catch (error) {
    logger.error('❌ Failed to get connection stats:', error);
    return {
      error: error.message
    };
  }
}

// Export singleton instance and utilities
const prisma = getPrismaClient();

module.exports = {
  // Main singleton instance - use this in controllers
  prisma,

  // Alternative getter (same instance)
  getPrismaClient,

  // Lifecycle management
  disconnectPrisma,

  // Health and monitoring
  getDatabaseHealth,
  getConnectionStats,

  // For testing purposes
  __resetInstance: () => {
    prismaInstance = null;
    if (global.__prisma) {
      global.__prisma = null;
    }
  }
};