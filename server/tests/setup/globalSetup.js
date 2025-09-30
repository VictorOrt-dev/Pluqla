/**
 * Global Test Setup (setupFilesAfterEnv)
 *
 * Runs before each test file.
 * Provides test helpers, mocks, and global configuration.
 */

const { PrismaClient } = require('@prisma/client');

// Global test timeout
jest.setTimeout(30000); // 30 seconds for database operations

// Global Prisma client for tests
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.DEBUG_TESTS === 'true' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Clean up Prisma after all tests in the file
afterAll(async () => {
  await global.prisma.$disconnect();
});

// Test helpers
global.testHelpers = {
  /**
   * Create a test user
   */
  createTestUser: async (overrides = {}) => {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User',
      role: 'user',
      ...overrides
    };

    return await global.prisma.user.create({
      data: defaultUser
    });
  },

  /**
   * Create a test transaction
   */
  createTestTransaction: async (userId, overrides = {}) => {
    const defaultTransaction = {
      userId,
      amount: 50.0,
      category: 'alimentation',
      description: 'Test transaction',
      date: new Date(),
      type: 'expense',
      ...overrides
    };

    return await global.prisma.transaction.create({
      data: defaultTransaction
    });
  },

  /**
   * Clean a specific table
   */
  cleanTable: async (tableName) => {
    // Avoid cleaning migration table
    if (tableName === '_prisma_migrations') {
      return;
    }

    try {
      await global.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
    } catch (error) {
      console.warn(`Warning: Could not clean table ${tableName}:`, error.message);
    }
  },

  /**
   * Get test user credentials
   */
  getTestCredentials: (role = 'user') => {
    const credentials = {
      user: {
        email: 'testuser@example.com',
        password: 'Test123!@#'
      },
      premium: {
        email: 'premium@example.com',
        password: 'Premium123!@#'
      },
      admin: {
        email: 'admin@example.com',
        password: 'Admin123!@#'
      }
    };

    return credentials[role] || credentials.user;
  },

  /**
   * Wait for a condition with timeout
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for condition');
  }
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars';
process.env.JWT_EMAIL_SECRET = process.env.JWT_EMAIL_SECRET || 'test-email-secret-at-least-32-chars-long';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
process.env.AI_SANITIZER_MODE = 'strict';

// Suppress console logs in tests (unless DEBUG_TESTS=true)
if (process.env.DEBUG_TESTS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
    // Keep error and other important methods
  };
}

console.log('✅ Global test setup complete');