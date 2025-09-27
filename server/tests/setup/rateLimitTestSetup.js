/**
 * Test setup configuration for rate limiting tests
 * Sets up test environment, mocks, and configurations
 */

const { createClient } = require('redis');

/**
 * Setup test environment for rate limiting tests
 */
const setupRateLimitTests = () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-rate-limit-tests';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-rate-limit-tests';

  // Configure rate limiting for testing
  process.env.RATE_LIMIT_TEST_MODE = 'true';
  process.env.RATE_LIMIT_WINDOW_MS = '5000'; // 5 seconds for faster testing
  process.env.RATE_LIMIT_FREE_TIER_MAX = '5'; // Lower limits for testing
  process.env.RATE_LIMIT_PREMIUM_TIER_MAX = '15';

  // Disable Redis for unit tests unless specifically testing Redis integration
  if (!process.env.RATE_LIMIT_REDIS_TEST) {
    process.env.REDIS_URL = '';
  }

  console.log('Rate limiting test environment configured');
};

/**
 * Setup Redis for integration tests
 */
const setupRedisForTests = async () => {
  if (process.env.RATE_LIMIT_REDIS_TEST === 'true') {
    const redisClient = createClient({
      url: process.env.REDIS_TEST_URL || 'redis://localhost:6379/15' // Use test database
    });

    try {
      await redisClient.connect();
      console.log('Redis test client connected');
      return redisClient;
    } catch (error) {
      console.warn('Redis not available for tests:', error.message);
      return null;
    }
  }
  return null;
};

/**
 * Cleanup Redis after tests
 */
const cleanupRedisAfterTests = async (redisClient) => {
  if (redisClient) {
    try {
      await redisClient.flushDb(); // Clear test database
      await redisClient.quit();
      console.log('Redis test client cleaned up');
    } catch (error) {
      console.warn('Error cleaning up Redis:', error.message);
    }
  }
};

/**
 * Mock rate limit configuration for testing
 */
const mockRateLimitConfig = {
  // Test-friendly rate limits
  subscriptionTiers: {
    free: {
      transactions: { requests: 5, window: 5000, burst: 1 },
      payments: { requests: 2, window: 10000, burst: 0 },
      subscriptions: { requests: 1, window: 15000, burst: 0 },
      reports: { requests: 3, window: 10000, burst: 1 },
      apiCalls: { requests: 10, window: 5000, burst: 2 }
    },
    premium: {
      transactions: { requests: 15, window: 5000, burst: 3 },
      payments: { requests: 8, window: 10000, burst: 2 },
      subscriptions: { requests: 5, window: 15000, burst: 1 },
      reports: { requests: 12, window: 10000, burst: 3 },
      apiCalls: { requests: 30, window: 5000, burst: 5 }
    },
    enterprise: {
      transactions: { requests: 50, window: 5000, burst: 10 },
      payments: { requests: 25, window: 10000, burst: 5 },
      subscriptions: { requests: 15, window: 15000, burst: 3 },
      reports: { requests: 40, window: 10000, burst: 8 },
      apiCalls: { requests: 100, window: 5000, burst: 15 }
    }
  }
};

/**
 * Create test-specific rate limiter factory
 */
const createTestRateLimiter = (operationType, userTier = 'free') => {
  const config = mockRateLimitConfig.subscriptionTiers[userTier][operationType];

  if (!config) {
    throw new Error(`No test configuration for ${operationType} and tier ${userTier}`);
  }

  return {
    windowMs: config.window,
    max: config.requests,
    burst: config.burst,
    keyGenerator: (req) => `test:${req.user?.id || req.ip}:${operationType}`,
    message: {
      error: `Test rate limit exceeded for ${operationType}`,
      retryAfter: Math.ceil(config.window / 1000),
      limit: config.requests,
      operationType,
      tier: userTier
    }
  };
};

/**
 * Jest setup for rate limiting tests
 */
const setupJestForRateLimiting = () => {
  // Setup test timeouts
  jest.setTimeout(30000); // 30 second timeout for performance tests

  // Mock console methods to reduce test noise
  const originalConsole = { ...console };

  beforeAll(() => {
    // Suppress logs during tests unless DEBUG is set
    if (!process.env.DEBUG) {
      console.log = jest.fn();
      console.info = jest.fn();
      console.warn = jest.fn();
    }
  });

  afterAll(() => {
    // Restore console
    Object.assign(console, originalConsole);
  });

  // Setup global test helpers
  global.testHelpers = {
    mockRateLimitConfig,
    createTestRateLimiter,
    setupRedisForTests,
    cleanupRedisAfterTests
  };
};

/**
 * Database setup for rate limiting tests
 */
const setupDatabaseForRateLimitTests = async () => {
  try {
    const prisma = require('../../src/lib/prisma');

    // Clean up any existing test data
    await prisma.transaction.deleteMany({
      where: {
        description: { contains: 'rate limit test' }
      }
    });

    await prisma.subscription.deleteMany({
      where: {
        user: {
          email: { contains: 'ratelimit.test' }
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'ratelimit.test' }
      }
    });

    console.log('Database cleaned for rate limit tests');
  } catch (error) {
    console.warn('Error setting up database for tests:', error.message);
  }
};

/**
 * Performance monitoring for tests
 */
const setupPerformanceMonitoring = () => {
  const performanceData = {
    tests: [],
    startTime: Date.now()
  };

  const originalTest = global.test;
  global.test = (name, fn, timeout) => {
    return originalTest(name, async () => {
      const testStartTime = process.hrtime.bigint();

      try {
        await fn();
      } finally {
        const testEndTime = process.hrtime.bigint();
        const duration = Number(testEndTime - testStartTime) / 1000000; // ms

        performanceData.tests.push({
          name,
          duration,
          timestamp: Date.now()
        });
      }
    }, timeout);
  };

  // Report performance after all tests
  process.on('beforeExit', () => {
    if (performanceData.tests.length > 0) {
      const totalDuration = performanceData.tests.reduce((sum, test) => sum + test.duration, 0);
      const avgDuration = totalDuration / performanceData.tests.length;

      console.log(`
🔍 Rate Limiting Test Performance Report:
  Total tests: ${performanceData.tests.length}
  Total duration: ${totalDuration.toFixed(2)}ms
  Average test duration: ${avgDuration.toFixed(2)}ms
  Slowest test: ${Math.max(...performanceData.tests.map(t => t.duration)).toFixed(2)}ms
  Fastest test: ${Math.min(...performanceData.tests.map(t => t.duration)).toFixed(2)}ms
      `);

      // Report slow tests
      const slowTests = performanceData.tests
        .filter(test => test.duration > 5000)
        .sort((a, b) => b.duration - a.duration);

      if (slowTests.length > 0) {
        console.log('⚠️  Slow tests (>5s):');
        slowTests.slice(0, 5).forEach(test => {
          console.log(`  ${test.name}: ${test.duration.toFixed(2)}ms`);
        });
      }
    }
  });

  return performanceData;
};

/**
 * Memory leak detection for tests
 */
const setupMemoryLeakDetection = () => {
  let initialMemory = null;

  beforeAll(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    initialMemory = process.memoryUsage();
  });

  afterAll(() => {
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const memoryDiff = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };

    // Report significant memory increases
    const heapIncreaseMB = memoryDiff.heapUsed / 1024 / 1024;
    if (heapIncreaseMB > 10) {
      console.warn(`⚠️  Potential memory leak detected: +${heapIncreaseMB.toFixed(2)}MB heap usage`);
    }

    console.log(`📊 Memory usage change: ${heapIncreaseMB > 0 ? '+' : ''}${heapIncreaseMB.toFixed(2)}MB heap`);
  });
};

module.exports = {
  setupRateLimitTests,
  setupRedisForTests,
  cleanupRedisAfterTests,
  mockRateLimitConfig,
  createTestRateLimiter,
  setupJestForRateLimiting,
  setupDatabaseForRateLimitTests,
  setupPerformanceMonitoring,
  setupMemoryLeakDetection
};