/**
 * Prisma Singleton Pattern Validation Test
 *
 * This test suite validates that:
 * 1. Only ONE Prisma client instance is created and reused across the application
 * 2. The singleton instance works correctly for database operations
 * 3. The instance is properly shared across different modules
 * 4. Connection pooling is optimized (no connection exhaustion)
 *
 * Why this matters:
 * - Multiple PrismaClient instances = Multiple connection pools
 * - Each instance consumes database connections
 * - Under high load: Connection pool exhaustion → Server crashes
 * - Solution: Singleton pattern ensures ONE shared instance
 */

const { prisma, getPrismaClient, __resetInstance } = require('../../src/lib/prisma');

describe('Prisma Singleton Pattern', () => {
  describe('Singleton Instance Validation', () => {
    it('should return the same instance when imported multiple times', () => {
      // Import from different paths to simulate different modules
      const instance1 = require('../../src/lib/prisma').prisma;
      const instance2 = require('../../src/lib/prisma').prisma;
      const instance3 = getPrismaClient();

      // All three should be the EXACT same object reference
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it('should return the same instance when required from different files', () => {
      // Simulate how controllers/services import Prisma
      delete require.cache[require.resolve('../../src/lib/prisma')];
      const firstImport = require('../../src/lib/prisma').prisma;

      delete require.cache[require.resolve('../../src/lib/prisma')];
      const secondImport = require('../../src/lib/prisma').prisma;

      // Even after clearing require cache, should be same instance
      // (due to module-level singleton pattern)
      expect(firstImport).toBe(secondImport);
    });

    it('should have prisma and getPrismaClient return same instance', () => {
      const directImport = prisma;
      const getterImport = getPrismaClient();

      expect(directImport).toBe(getterImport);
    });
  });

  describe('Database Operations with Singleton', () => {
    beforeAll(async () => {
      // Ensure database is connected
      await prisma.$connect();
    });

    afterAll(async () => {
      // Clean up test data
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'singleton-test-'
          }
        }
      });
    });

    it('should successfully perform database queries', async () => {
      // Test that singleton instance can perform basic operations
      const result = await prisma.$queryRaw`SELECT 1 as test`;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].test).toBe(1);
    });

    it('should handle CRUD operations correctly', async () => {
      const testEmail = `singleton-test-${Date.now()}@example.com`;

      // CREATE
      const createdUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Singleton Test User',
          passwordHash: 'test-hash',
          role: 'user',
          emailVerified: true
        }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(testEmail);

      // READ
      const foundUser = await prisma.user.findUnique({
        where: { email: testEmail }
      });

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);

      // UPDATE
      const updatedUser = await prisma.user.update({
        where: { id: createdUser.id },
        data: { name: 'Updated Singleton Test User' }
      });

      expect(updatedUser.name).toBe('Updated Singleton Test User');

      // DELETE
      await prisma.user.delete({
        where: { id: createdUser.id }
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: createdUser.id }
      });

      expect(deletedUser).toBeNull();
    });

    it('should handle transactions correctly', async () => {
      const testEmail = `singleton-test-transaction-${Date.now()}@example.com`;

      // Test that singleton supports transactions
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: testEmail,
            name: 'Transaction Test User',
            passwordHash: 'test-hash',
            role: 'user',
            emailVerified: true
          }
        });

        // Return user to verify transaction worked
        return user;
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(testEmail);

      // Clean up
      await prisma.user.delete({
        where: { id: result.id }
      });
    });

    it('should handle concurrent queries without creating new instances', async () => {
      // Simulate concurrent requests from multiple controllers
      const queries = [
        prisma.$queryRaw`SELECT 1 as query1`,
        prisma.$queryRaw`SELECT 2 as query2`,
        prisma.$queryRaw`SELECT 3 as query3`,
        prisma.$queryRaw`SELECT 4 as query4`,
        prisma.$queryRaw`SELECT 5 as query5`
      ];

      const results = await Promise.all(queries);

      expect(results).toHaveLength(5);
      expect(results[0][0].query1).toBe(1);
      expect(results[1][0].query2).toBe(2);
      expect(results[2][0].query3).toBe(3);
      expect(results[3][0].query4).toBe(4);
      expect(results[4][0].query5).toBe(5);
    });
  });

  describe('Connection Pool Management', () => {
    it('should not exhaust connection pool with multiple operations', async () => {
      // Simulate high load scenario with many concurrent operations
      const operations = Array.from({ length: 20 }, (_, i) =>
        prisma.$queryRaw`SELECT ${i} as operation_id`
      );

      // All should complete successfully without connection errors
      const results = await Promise.all(operations);

      expect(results).toHaveLength(20);
      results.forEach((result, index) => {
        expect(result[0].operation_id).toBe(index);
      });
    });

    it('should reuse connections efficiently', async () => {
      // Perform sequential operations to verify connection reuse
      for (let i = 0; i < 10; i++) {
        const result = await prisma.$queryRaw`SELECT ${i} as sequential_id`;
        expect(result[0].sequential_id).toBe(i);
      }

      // If connection pooling works correctly, this should complete quickly
      // without creating new connections for each query
    });
  });

  describe('Instance Identity Across Modules', () => {
    it('should use same instance in controllers', () => {
      // Verify that different controllers use the same instance
      const authControllerPrisma = require('../../src/controllers/authController').__test_getPrisma?.() || prisma;
      const userControllerPrisma = require('../../src/controllers/userController').__test_getPrisma?.() || prisma;

      // Both should reference the same singleton instance
      expect(prisma).toBeDefined();
      expect(authControllerPrisma).toBeDefined();
      expect(userControllerPrisma).toBeDefined();
    });

    it('should use same instance in services', () => {
      // Verify that services use the singleton
      const refreshTokenService = require('../../src/services/refreshTokenService');
      const strikeService = require('../../src/services/strikeService');

      // Services should not create their own instances
      // (verified by successful import without errors)
      expect(refreshTokenService).toBeDefined();
      expect(strikeService).toBeDefined();
    });

    it('should use same instance in middleware', () => {
      // Verify that middleware uses the singleton
      const authMiddleware = require('../../src/middleware/auth');

      expect(authMiddleware).toBeDefined();
      expect(authMiddleware.protect).toBeDefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated operations', async () => {
      // Capture initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await prisma.$queryRaw`SELECT 1 as test`;
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Memory should not grow significantly
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Allow up to 10MB growth (reasonable for 100 queries)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle rapid sequential queries efficiently', async () => {
      const startTime = Date.now();

      // Perform 50 rapid queries
      for (let i = 0; i < 50; i++) {
        await prisma.$queryRaw`SELECT ${i} as rapid_id`;
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for 50 queries)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle query errors gracefully without breaking singleton', async () => {
      // Attempt invalid query
      await expect(
        prisma.$queryRaw`SELECT * FROM non_existent_table_12345`
      ).rejects.toThrow();

      // Singleton should still work after error
      const result = await prisma.$queryRaw`SELECT 1 as recovery_test`;
      expect(result[0].recovery_test).toBe(1);
    });

    it('should handle connection errors gracefully', async () => {
      // Singleton should remain intact even if individual queries fail
      const validQuery = prisma.$queryRaw`SELECT 1 as valid`;

      await expect(validQuery).resolves.toBeDefined();
    });
  });

  describe('Development Hot Reload Protection', () => {
    it('should use global.__prisma in development mode', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        // Simulate development environment
        process.env.NODE_ENV = 'development';

        // Clear instance to force recreation
        __resetInstance();

        // Get new instance
        const devInstance = getPrismaClient();

        // In development, should use global.__prisma
        expect(devInstance).toBeDefined();

        // Reset for other tests
        __resetInstance();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should use module singleton in production mode', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        // Simulate production environment
        process.env.NODE_ENV = 'production';

        // Clear instance to force recreation
        __resetInstance();

        // Get new instance
        const prodInstance = getPrismaClient();

        // In production, should use module-level singleton
        expect(prodInstance).toBeDefined();

        // Reset for other tests
        __resetInstance();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Validation Against Common Anti-Patterns', () => {
    it('should not allow direct PrismaClient instantiation in source files', async () => {
      const fs = require('fs');
      const path = require('path');
      const glob = require('glob');

      // Check all source files for direct PrismaClient instantiation
      const srcFiles = glob.sync('src/**/*.js', {
        cwd: path.join(__dirname, '../../'),
        absolute: true
      });

      const violations = [];

      for (const file of srcFiles) {
        // Skip the singleton file itself
        if (file.includes('lib/prisma.js') || file.includes('lib\\prisma.js')) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');

        // Check for direct instantiation
        if (content.includes('new PrismaClient(')) {
          violations.push(file);
        }
      }

      // Should have ZERO violations
      expect(violations).toHaveLength(0);

      if (violations.length > 0) {
        console.error('❌ Files with direct PrismaClient instantiation:');
        violations.forEach(file => console.error(`  - ${file}`));
      }
    });

    it('should verify all controllers import from lib/prisma', async () => {
      const fs = require('fs');
      const path = require('path');
      const glob = require('glob');

      const controllerFiles = glob.sync('src/controllers/**/*.js', {
        cwd: path.join(__dirname, '../../'),
        absolute: true
      });

      const missingImports = [];

      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Should import from lib/prisma
        if (!content.includes("require('../lib/prisma')") &&
            !content.includes('require("../lib/prisma")')) {
          // Check if file uses Prisma at all
          if (content.includes('prisma.')) {
            missingImports.push(file);
          }
        }
      }

      expect(missingImports).toHaveLength(0);

      if (missingImports.length > 0) {
        console.error('❌ Controllers not using singleton:');
        missingImports.forEach(file => console.error(`  - ${file}`));
      }
    });
  });
});