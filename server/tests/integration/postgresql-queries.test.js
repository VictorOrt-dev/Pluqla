/**
 * PostgreSQL Query Compatibility Tests
 *
 * Tests to ensure all raw SQL queries work correctly with PostgreSQL.
 * These tests verify:
 * - Date formatting functions (TO_CHAR instead of strftime)
 * - Date arithmetic (NOW() - INTERVAL instead of date('now', '-X'))
 * - Column name escaping ("columnName" for camelCase)
 * - Timestamp casting (::timestamp)
 */

const { prisma } = require('../../src/lib/prisma');

describe('PostgreSQL Query Compatibility', () => {
  let testUser;
  let testTransactions;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `pg-test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        name: 'PostgreSQL Test User',
        role: 'user'
      }
    });

    // Create test transactions with various dates
    const now = new Date();
    const testDates = [
      new Date(now.getFullYear(), now.getMonth(), 1), // Start of current month
      new Date(now.getFullYear(), now.getMonth() - 1, 15), // Last month
      new Date(now.getFullYear(), now.getMonth() - 3, 20), // 3 months ago
      new Date(now.getFullYear(), now.getMonth() - 6, 10), // 6 months ago
      new Date(now.getFullYear(), now.getMonth() - 12, 5) // 12 months ago
    ];

    testTransactions = await Promise.all(
      testDates.map((date, index) =>
        prisma.transaction.create({
          data: {
            userId: testUser.id,
            amount: (index + 1) * 50,
            category: index % 2 === 0 ? 'alimentation' : 'transport',
            description: `Test transaction ${index}`,
            date,
            createdAt: date,
            type: 'expense'
          }
        })
      )
    );
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  describe('Date Formatting (TO_CHAR)', () => {
    it('should format dates as YYYY-MM using TO_CHAR', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify format is YYYY-MM
      result.forEach((row) => {
        expect(row.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof row.transaction_count).toBe('bigint');
      });
    });

    it('should format dates as YYYY-MM-DD using TO_CHAR', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM-DD') as date,
          SUM(amount) as total_amount
        FROM transactions
        WHERE "userId" = ${testUser.id}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
        ORDER BY date DESC
      `;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((row) => {
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Date Arithmetic (INTERVAL)', () => {
    it('should filter transactions from last 12 months using INTERVAL', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      // Should include transactions from last 12 months (not the one from 12 months ago)
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should filter transactions from last 6 months using INTERVAL', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          category,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM'), category
        ORDER BY month ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      // Should only include recent transactions (not the 12 months old one)
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter transactions from last 30 days using INTERVAL', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      // Should only include very recent transactions
    });
  });

  describe('Column Name Escaping', () => {
    it('should handle camelCase column names with double quotes', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          "userId",
          "createdAt",
          amount
        FROM transactions
        WHERE "userId" = ${testUser.id}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(testUser.id);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should use escaped column names in GROUP BY', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          "userId",
          category,
          COUNT(*) as count
        FROM transactions
        WHERE "userId" = ${testUser.id}
        GROUP BY "userId", category
      `;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((row) => {
        expect(row.userId).toBe(testUser.id);
        expect(typeof row.category).toBe('string');
      });
    });
  });

  describe('Timestamp Casting', () => {
    it('should cast ISO strings to timestamps', async () => {
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const endDate = new Date();

      const result = await prisma.$queryRaw`
        SELECT
          DATE("createdAt") as day,
          SUM(amount) as daily_amount,
          COUNT(*) as daily_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND "createdAt" >= ${startDate.toISOString()}::timestamp
          AND "createdAt" <= ${endDate.toISOString()}::timestamp
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('DATE Function', () => {
    it('should extract date from timestamp using DATE()', async () => {
      const result = await prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM transactions
        WHERE "userId" = ${testUser.id}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((row) => {
        // PostgreSQL DATE() returns a Date object
        expect(row.date).toBeDefined();
      });
    });
  });

  describe('Complex Queries from Controllers', () => {
    it('should run monthly trend query from transactionController', async () => {
      // This is the actual query from transactionController.js
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((row) => {
        expect(row.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof row.total_amount).toBe('string'); // Decimal as string
        expect(typeof row.transaction_count).toBe('bigint');
      });
    });

    it('should run category trend query from aiController', async () => {
      // This is the actual query from aiController.js
      const result = await prisma.$queryRaw`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          category,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM'), category
        ORDER BY month ASC
      `;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((row) => {
        expect(row.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof row.category).toBe('string');
        expect(typeof row.total_amount).toBe('string'); // Decimal as string
        expect(typeof row.transaction_count).toBe('bigint');
      });
    });

    it('should run daily stats query from transactionController', async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const result = await prisma.$queryRaw`
        SELECT
          DATE("createdAt") as day,
          SUM(amount) as daily_amount,
          COUNT(*) as daily_count
        FROM transactions
        WHERE "userId" = ${testUser.id}
          AND "createdAt" >= ${startOfMonth.toISOString()}::timestamp
          AND "createdAt" <= ${endOfMonth.toISOString()}::timestamp
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `;

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Analytics Queries', () => {
    beforeAll(async () => {
      // Create analytics events
      await prisma.analyticsEvent.createMany({
        data: [
          {
            userId: testUser.id,
            sessionId: 'session-1',
            type: 'page_view',
            properties: JSON.stringify({ page: '/dashboard' }),
            metadata: JSON.stringify({})
          },
          {
            userId: testUser.id,
            sessionId: 'session-1',
            type: 'click',
            properties: JSON.stringify({ button: 'save' }),
            metadata: JSON.stringify({})
          }
        ]
      });
    });

    afterAll(async () => {
      await prisma.analyticsEvent.deleteMany({ where: { userId: testUser.id } });
    });

    it('should run analytics daily stats query', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await prisma.$queryRaw`
        SELECT
          DATE(timestamp) as date,
          type,
          COUNT(*) as count
        FROM analytics_events
        WHERE "userId" = ${testUser.id}
          AND timestamp >= ${startDate.toISOString()}::timestamp
        GROUP BY DATE(timestamp), type
        ORDER BY date DESC
      `;

      expect(Array.isArray(result)).toBe(true);
    });

    it('should run analytics session stats query', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await prisma.$queryRaw`
        SELECT
          DATE(timestamp) as date,
          COUNT(DISTINCT "sessionId") as sessions,
          COUNT(*) as events
        FROM analytics_events
        WHERE "userId" = ${testUser.id}
          AND timestamp >= ${startDate.toISOString()}::timestamp
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      expect(Array.isArray(result)).toBe(true);
    });
  });
});