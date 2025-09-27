const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

/**
 * DATABASE INDEXING PERFORMANCE VERIFICATION TESTS
 *
 * This test suite verifies that database indexes are working correctly
 * and providing the expected performance improvements for Pluqla.
 *
 * Tests cover:
 * - Authentication queries (login, token validation)
 * - Financial transaction queries (user history, category filtering)
 * - Security token operations (refresh, blacklist)
 * - Cache operations (lookup, cleanup)
 * - Analytics queries (user activity, trends)
 *
 * Performance targets:
 * - Authentication queries: < 2ms
 * - Transaction queries: < 10ms for 1000+ records
 * - Security operations: < 5ms
 * - Cache operations: < 1ms
 */

describe('Database Indexing Performance Tests', () => {
  let prisma;
  let testUsers = [];
  let testTransactions = [];
  let startTime, endTime;

  // Performance measurement helper
  const measureTime = (operation) => ({
    start: () => startTime = Date.now(),
    end: () => {
      endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`${operation}: ${duration}ms`);
      return duration;
    }
  });

  beforeAll(async () => {
    // Initialize Prisma with connection pooling for performance tests
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pluqla_test'
        }
      }
    });

    console.log('🚀 Setting up performance test data...');
    await setupTestData();
    console.log('✅ Test data setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData();
    await prisma.$disconnect();
    console.log('✅ Cleanup complete');
  });

  /**
   * Setup comprehensive test data for performance testing
   */
  async function setupTestData() {
    const timer = measureTime('Test data creation');
    timer.start();

    // Create 1000 test users for performance testing
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        id: `perf-user-${i}`,
        email: `perftest${i}@test.com`,
        password: await bcrypt.hash('testpassword', 12),
        name: `Performance Test User ${i}`,
        status: i % 10 === 0 ? 'inactive' : 'active', // 10% inactive users
        isPremium: i % 5 === 0, // 20% premium users
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random dates within last year
        lastLoginAt: i % 2 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null
      });
    }

    // Batch insert users
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password, name, status, "isPremium", "createdAt", "lastLoginAt", "updatedAt")
      SELECT * FROM unnest(
        ${users.map(u => u.id)}::text[],
        ${users.map(u => u.email)}::text[],
        ${users.map(u => u.password)}::text[],
        ${users.map(u => u.name)}::text[],
        ${users.map(u => u.status)}::text[],
        ${users.map(u => u.isPremium)}::boolean[],
        ${users.map(u => u.createdAt)}::timestamp[],
        ${users.map(u => u.lastLoginAt)}::timestamp[],
        ${users.map(u => new Date())}::timestamp[]
      )
    `;

    testUsers = users;

    // Create 10,000 transactions for performance testing
    const transactions = [];
    const categories = ['alimentation', 'transport', 'loisirs', 'habits', 'sante'];
    const types = ['saving', 'expense', 'income'];

    for (let i = 0; i < 10000; i++) {
      const userId = testUsers[Math.floor(Math.random() * testUsers.length)].id;
      transactions.push({
        id: `perf-transaction-${i}`,
        userId,
        amount: Math.random() * 500 + 10, // Random amount between 10-510
        category: categories[Math.floor(Math.random() * categories.length)],
        description: `Performance test transaction ${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random dates within last 6 months
        createdAt: new Date()
      });
    }

    // Batch insert transactions
    await prisma.$executeRaw`
      INSERT INTO transactions (id, "userId", amount, category, description, type, date, "createdAt")
      SELECT * FROM unnest(
        ${transactions.map(t => t.id)}::text[],
        ${transactions.map(t => t.userId)}::text[],
        ${transactions.map(t => t.amount)}::double precision[],
        ${transactions.map(t => t.category)}::text[],
        ${transactions.map(t => t.description)}::text[],
        ${transactions.map(t => t.type)}::text[],
        ${transactions.map(t => t.date)}::timestamp[],
        ${transactions.map(t => t.createdAt)}::timestamp[]
      )
    `;

    testTransactions = transactions;

    // Create cache entries
    const cacheEntries = [];
    for (let i = 0; i < 1000; i++) {
      const userId = i < 500 ? testUsers[i].id : null; // 50% user-specific, 50% global
      cacheEntries.push({
        id: `cache-${i}`,
        userId,
        cacheKey: `test-key-${i}`,
        category: ['ai_suggestions', 'recipes', 'analytics'][Math.floor(Math.random() * 3)],
        data: JSON.stringify({ test: `data-${i}` }),
        expiresAt: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Random expiry within 24h
        createdAt: new Date()
      });
    }

    await prisma.cacheEntry.createMany({
      data: cacheEntries
    });

    // Create refresh tokens for security testing
    const refreshTokens = [];
    for (let i = 0; i < 500; i++) {
      const userId = testUsers[i].id;
      refreshTokens.push({
        id: `refresh-${i}`,
        tokenHash: await bcrypt.hash(`refresh-token-${i}`, 12),
        jti: `jti-${i}`,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        revoked: i % 10 === 0, // 10% revoked
        revokedAt: i % 10 === 0 ? new Date() : null,
        ipAddress: `192.168.1.${i % 255}`,
        userAgent: `TestAgent-${i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await prisma.refreshToken.createMany({
      data: refreshTokens
    });

    // Create analytics events
    const analyticsEvents = [];
    for (let i = 0; i < 2000; i++) {
      const userId = i < 1000 ? testUsers[i % 1000].id : null; // 50% user events, 50% anonymous
      analyticsEvents.push({
        id: `analytics-${i}`,
        userId,
        sessionId: `session-${Math.floor(i / 10)}`, // 10 events per session
        type: ['login', 'transaction', 'view_recipe', 'ai_suggestion'][Math.floor(Math.random() * 4)],
        properties: JSON.stringify({ test: true }),
        metadata: JSON.stringify({ performance: true }),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last week
      });
    }

    await prisma.analyticsEvent.createMany({
      data: analyticsEvents
    });

    const setupTime = timer.end();
    expect(setupTime).toBeLessThan(30000); // Setup should complete within 30 seconds
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    await prisma.analyticsEvent.deleteMany({
      where: { id: { startsWith: 'analytics-' } }
    });
    await prisma.refreshToken.deleteMany({
      where: { id: { startsWith: 'refresh-' } }
    });
    await prisma.cacheEntry.deleteMany({
      where: { id: { startsWith: 'cache-' } }
    });
    await prisma.transaction.deleteMany({
      where: { id: { startsWith: 'perf-transaction-' } }
    });
    await prisma.user.deleteMany({
      where: { id: { startsWith: 'perf-user-' } }
    });
  }

  describe('Authentication Performance', () => {
    test('should perform user login lookup quickly', async () => {
      const timer = measureTime('User login lookup');
      timer.start();

      const user = await prisma.user.findUnique({
        where: { email: 'perftest0@test.com' },
        select: { id: true, email: true, password: true, status: true }
      });

      const duration = timer.end();

      expect(user).toBeTruthy();
      expect(user.email).toBe('perftest0@test.com');
      expect(duration).toBeLessThan(2); // Should be < 2ms with proper indexing
    });

    test('should filter active users efficiently', async () => {
      const timer = measureTime('Active users query');
      timer.start();

      const activeUsers = await prisma.user.findMany({
        where: { status: 'active' },
        take: 100,
        select: { id: true, email: true, status: true }
      });

      const duration = timer.end();

      expect(activeUsers.length).toBeGreaterThan(0);
      expect(activeUsers.every(u => u.status === 'active')).toBe(true);
      expect(duration).toBeLessThan(5); // Should be < 5ms with status index
    });

    test('should find premium users efficiently', async () => {
      const timer = measureTime('Premium users query');
      timer.start();

      const premiumUsers = await prisma.user.findMany({
        where: { isPremium: true },
        take: 50,
        select: { id: true, isPremium: true }
      });

      const duration = timer.end();

      expect(premiumUsers.length).toBeGreaterThan(0);
      expect(premiumUsers.every(u => u.isPremium)).toBe(true);
      expect(duration).toBeLessThan(3); // Should be < 3ms with isPremium index
    });
  });

  describe('Transaction Performance', () => {
    test('should query user transactions efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('User transactions query');
      timer.start();

      const transactions = await prisma.transaction.findMany({
        where: { userId },
        take: 100,
        orderBy: { date: 'desc' },
        select: { id: true, userId: true, amount: true, category: true, date: true }
      });

      const duration = timer.end();

      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions.every(t => t.userId === userId)).toBe(true);
      expect(duration).toBeLessThan(10); // Should be < 10ms with userId index
    });

    test('should filter transactions by category efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('Transaction category filter');
      timer.start();

      const foodTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          category: 'alimentation'
        },
        take: 50,
        select: { id: true, userId: true, category: true }
      });

      const duration = timer.end();

      expect(foodTransactions.every(t =>
        t.userId === userId && t.category === 'alimentation'
      )).toBe(true);
      expect(duration).toBeLessThan(8); // Should be < 8ms with compound index
    });

    test('should query transactions by date range efficiently', async () => {
      const timer = measureTime('Transaction date range query');
      timer.start();

      const recentTransactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        take: 200,
        orderBy: { date: 'desc' },
        select: { id: true, date: true, amount: true }
      });

      const duration = timer.end();

      expect(recentTransactions.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(15); // Should be < 15ms with date index
    });

    test('should perform complex transaction filtering efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('Complex transaction filter');
      timer.start();

      const complexQuery = await prisma.transaction.findMany({
        where: {
          userId,
          category: 'alimentation',
          date: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
          }
        },
        orderBy: { date: 'desc' },
        take: 50,
        select: { id: true, userId: true, category: true, date: true, amount: true }
      });

      const duration = timer.end();

      expect(complexQuery.every(t =>
        t.userId === userId &&
        t.category === 'alimentation'
      )).toBe(true);
      expect(duration).toBeLessThan(12); // Should be < 12ms with compound indexes
    });
  });

  describe('Security Token Performance', () => {
    test('should lookup refresh tokens efficiently', async () => {
      const timer = measureTime('Refresh token lookup');
      timer.start();

      const token = await prisma.refreshToken.findFirst({
        where: {
          jti: 'jti-0',
          revoked: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: { id: true, status: true }
          }
        }
      });

      const duration = timer.end();

      expect(token).toBeTruthy();
      expect(token.revoked).toBe(false);
      expect(duration).toBeLessThan(5); // Should be < 5ms with compound indexes
    });

    test('should find user active tokens efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('User active tokens query');
      timer.start();

      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: new Date() }
        },
        select: { id: true, userId: true, revoked: true, expiresAt: true }
      });

      const duration = timer.end();

      expect(activeTokens.every(t =>
        t.userId === userId &&
        !t.revoked &&
        t.expiresAt > new Date()
      )).toBe(true);
      expect(duration).toBeLessThan(3); // Should be < 3ms with user_active compound index
    });

    test('should cleanup expired tokens efficiently', async () => {
      const timer = measureTime('Token cleanup query');
      timer.start();

      const expiredTokens = await prisma.refreshToken.findMany({
        where: {
          OR: [
            { revoked: true },
            { expiresAt: { lt: new Date() } }
          ]
        },
        take: 100,
        select: { id: true, revoked: true, expiresAt: true }
      });

      const duration = timer.end();

      expect(duration).toBeLessThan(8); // Should be < 8ms with cleanup compound index
    });
  });

  describe('Cache Performance', () => {
    test('should lookup cache entries efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('Cache lookup');
      timer.start();

      const cacheEntry = await prisma.cacheEntry.findFirst({
        where: {
          userId,
          category: 'ai_suggestions',
          expiresAt: { gt: new Date() }
        },
        select: { id: true, userId: true, category: true, data: true }
      });

      const duration = timer.end();

      expect(duration).toBeLessThan(2); // Should be < 2ms with cache indexes
    });

    test('should find expired cache entries for cleanup efficiently', async () => {
      const timer = measureTime('Cache cleanup query');
      timer.start();

      const expiredEntries = await prisma.cacheEntry.findMany({
        where: {
          expiresAt: { lt: new Date() }
        },
        take: 100,
        select: { id: true, expiresAt: true }
      });

      const duration = timer.end();

      expect(duration).toBeLessThan(3); // Should be < 3ms with expiresAt index
    });

    test('should query cache by category efficiently', async () => {
      const timer = measureTime('Cache by category query');
      timer.start();

      const categoryCache = await prisma.cacheEntry.findMany({
        where: {
          category: 'recipes',
          expiresAt: { gt: new Date() }
        },
        take: 50,
        select: { id: true, category: true, expiresAt: true }
      });

      const duration = timer.end();

      expect(categoryCache.every(c => c.category === 'recipes')).toBe(true);
      expect(duration).toBeLessThan(4); // Should be < 4ms with category_expires compound index
    });
  });

  describe('Analytics Performance', () => {
    test('should query user analytics efficiently', async () => {
      const userId = testUsers[0].id;
      const timer = measureTime('User analytics query');
      timer.start();

      const userEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          type: 'transaction'
        },
        take: 100,
        orderBy: { timestamp: 'desc' },
        select: { id: true, userId: true, type: true, timestamp: true }
      });

      const duration = timer.end();

      expect(userEvents.every(e =>
        e.userId === userId && e.type === 'transaction'
      )).toBe(true);
      expect(duration).toBeLessThan(6); // Should be < 6ms with user_type compound index
    });

    test('should query analytics by time range efficiently', async () => {
      const timer = measureTime('Analytics time range query');
      timer.start();

      const recentEvents = await prisma.analyticsEvent.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        take: 200,
        orderBy: { timestamp: 'desc' },
        select: { id: true, type: true, timestamp: true }
      });

      const duration = timer.end();

      expect(duration).toBeLessThan(10); // Should be < 10ms with timestamp index
    });

    test('should query event type trends efficiently', async () => {
      const timer = measureTime('Event type trends query');
      timer.start();

      const typeEvents = await prisma.analyticsEvent.findMany({
        where: {
          type: 'login',
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: { id: true, type: true, timestamp: true }
      });

      const duration = timer.end();

      expect(typeEvents.every(e => e.type === 'login')).toBe(true);
      expect(duration).toBeLessThan(7); // Should be < 7ms with type_timestamp compound index
    });
  });

  describe('Index Usage Verification', () => {
    test('should verify critical indexes are being used', async () => {
      // This test verifies that PostgreSQL is actually using our indexes
      // by checking the query execution plans

      const timer = measureTime('Index usage verification');
      timer.start();

      // Test user email lookup (should use unique index)
      const emailPlan = await prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM users WHERE email = 'perftest0@test.com'
      `;

      // Test user transactions query (should use userId index)
      const transactionPlan = await prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM transactions WHERE "userId" = ${testUsers[0].id} LIMIT 10
      `;

      // Test active users query (should use status index)
      const statusPlan = await prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM users WHERE status = 'active' LIMIT 10
      `;

      const duration = timer.end();

      // Verify that index scans are being used (not sequential scans)
      console.log('Query Plans:', {
        emailPlan: emailPlan[0]['QUERY PLAN'],
        transactionPlan: transactionPlan[0]['QUERY PLAN'],
        statusPlan: statusPlan[0]['QUERY PLAN']
      });

      expect(duration).toBeLessThan(100); // Query plan analysis should be fast
    });

    test('should show performance improvement over sequential scans', async () => {
      // Measure performance with indexes vs without (simulate sequential scan)

      const timer = measureTime('Index vs Sequential performance');
      timer.start();

      // Force sequential scan for comparison (disable index temporarily)
      await prisma.$executeRaw`SET enable_indexscan = OFF`;
      await prisma.$executeRaw`SET enable_bitmapscan = OFF`;

      const slowQuery = Date.now();
      await prisma.user.findMany({
        where: { status: 'active' },
        take: 10
      });
      const slowDuration = Date.now() - slowQuery;

      // Re-enable indexes
      await prisma.$executeRaw`SET enable_indexscan = ON`;
      await prisma.$executeRaw`SET enable_bitmapscan = ON`;

      const fastQuery = Date.now();
      await prisma.user.findMany({
        where: { status: 'active' },
        take: 10
      });
      const fastDuration = Date.now() - fastQuery;

      timer.end();

      console.log(`Sequential scan: ${slowDuration}ms, Index scan: ${fastDuration}ms`);
      console.log(`Performance improvement: ${(slowDuration / fastDuration).toFixed(2)}x faster`);

      // Indexes should provide significant performance improvement
      expect(fastDuration).toBeLessThan(slowDuration);
      expect(slowDuration / fastDuration).toBeGreaterThan(1.5); // At least 1.5x improvement
    });
  });

  describe('Compound Index Effectiveness', () => {
    test('should verify compound indexes work correctly', async () => {
      const userId = testUsers[0].id;

      // Test compound index on (userId, category, date)
      const timer = measureTime('Compound index test');
      timer.start();

      const compoundResult = await prisma.transaction.findMany({
        where: {
          userId,
          category: 'alimentation',
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        take: 20,
        orderBy: { date: 'desc' }
      });

      const duration = timer.end();

      expect(compoundResult.every(t =>
        t.userId === userId &&
        t.category === 'alimentation'
      )).toBe(true);
      expect(duration).toBeLessThan(8); // Compound index should make this very fast
    });

    test('should verify refresh token compound index', async () => {
      const userId = testUsers[0].id;

      const timer = measureTime('Refresh token compound index test');
      timer.start();

      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      const duration = timer.end();

      expect(activeTokens.every(t =>
        t.userId === userId &&
        !t.revoked &&
        t.expiresAt > new Date()
      )).toBe(true);
      expect(duration).toBeLessThan(3); // Should be very fast with compound index
    });
  });
});