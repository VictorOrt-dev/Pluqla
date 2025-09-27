/**
 * Prisma Singleton Connection Pool Tests
 *
 * These tests verify that:
 * 1. Only one Prisma client instance is created
 * 2. Connections are properly closed during shutdown
 * 3. No connection leaks occur during concurrent operations
 * 4. Database health checks work correctly
 */

const { PrismaClient } = require('@prisma/client');

// Mock Prisma to avoid actual database connections during tests
jest.mock('@prisma/client', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockDisconnect = jest.fn().mockResolvedValue(undefined);
  const mockQueryRaw = jest.fn().mockResolvedValue([{ health_check: 1 }]);
  const mockOn = jest.fn();

  const MockPrismaClient = jest.fn().mockImplementation(() => ({
    $connect: mockConnect,
    $disconnect: mockDisconnect,
    $queryRaw: mockQueryRaw,
    $on: mockOn,
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    }
  }));

  return {
    PrismaClient: MockPrismaClient,
    mockConnect,
    mockDisconnect,
    mockQueryRaw,
    mockOn
  };
});

const { mockConnect, mockDisconnect, mockQueryRaw } = require('@prisma/client');

describe('Prisma Singleton Connection Management', () => {
  let prismaModule;

  beforeEach(() => {
    // Clear module cache to test fresh imports
    jest.resetModules();
    jest.clearAllMocks();

    // Reset environment
    process.env.NODE_ENV = 'test';
    delete global.__prisma;
  });

  afterEach(async () => {
    // Clean up any global instances
    delete global.__prisma;
  });

  describe('Singleton Pattern', () => {
    test('should create only one Prisma client instance', () => {
      // Import module multiple times
      const prisma1 = require('../../src/lib/prisma');
      const prisma2 = require('../../src/lib/prisma');
      const prisma3 = require('../../src/lib/prisma');

      // Should all reference the same instance
      expect(prisma1.prisma).toBe(prisma2.prisma);
      expect(prisma2.prisma).toBe(prisma3.prisma);

      // PrismaClient constructor should only be called once
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    test('should handle development hot reload protection', () => {
      process.env.NODE_ENV = 'development';

      // First import creates instance
      const prisma1 = require('../../src/lib/prisma');
      expect(global.__prisma).toBeDefined();

      // Second import should reuse global instance
      jest.resetModules();
      const prisma2 = require('../../src/lib/prisma');

      // Should not create new instance due to global protection
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    test('should create separate instances in production mode', () => {
      process.env.NODE_ENV = 'production';

      const prisma1 = require('../../src/lib/prisma');

      jest.resetModules();
      const prisma2 = require('../../src/lib/prisma');

      // In production, should create new instance after module reset
      expect(PrismaClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Configuration', () => {
    test('should build optimized DATABASE_URL with connection pooling', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.DB_CONNECTION_LIMIT = '3';
      process.env.DB_POOL_TIMEOUT = '15';

      require('../../src/lib/prisma');

      // Verify PrismaClient was called with optimized configuration
      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          datasources: {
            db: {
              url: expect.stringContaining('connection_limit=3')
            }
          }
        })
      );
    });

    test('should handle missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL;

      expect(() => {
        require('../../src/lib/prisma');
      }).toThrow('DATABASE_URL environment variable is required');
    });

    test('should configure logging based on environment', () => {
      process.env.NODE_ENV = 'development';
      require('../../src/lib/prisma');

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['query', 'info', 'warn', 'error']
        })
      );
    });
  });

  describe('Connection Lifecycle', () => {
    test('should connect to database on startup', () => {
      const prismaModule = require('../../src/lib/prisma');

      // Should attempt connection on first access
      expect(mockConnect).toHaveBeenCalled();
    });

    test('should disconnect gracefully', async () => {
      const { disconnectPrisma } = require('../../src/lib/prisma');

      await disconnectPrisma();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    test('should handle force disconnect', async () => {
      const { disconnectPrisma } = require('../../src/lib/prisma');

      await disconnectPrisma(true);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    test('should handle disconnect errors gracefully', async () => {
      mockDisconnect.mockRejectedValueOnce(new Error('Disconnect failed'));

      const { disconnectPrisma } = require('../../src/lib/prisma');

      await expect(disconnectPrisma()).rejects.toThrow('Disconnect failed');
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Health Monitoring', () => {
    test('should perform database health check', async () => {
      const { getDatabaseHealth } = require('../../src/lib/prisma');

      const health = await getDatabaseHealth();

      expect(health).toEqual({
        healthy: true,
        latency: expect.any(Number),
        timestamp: expect.any(String)
      });
      expect(mockQueryRaw).toHaveBeenCalledWith(['SELECT 1 as health_check']);
    });

    test('should handle health check failures', async () => {
      mockQueryRaw.mockRejectedValueOnce(new Error('Connection failed'));

      const { getDatabaseHealth } = require('../../src/lib/prisma');

      const health = await getDatabaseHealth();

      expect(health).toEqual({
        healthy: false,
        latency: expect.any(Number),
        error: 'Connection failed',
        timestamp: expect.any(String)
      });
    });

    test('should get connection statistics', async () => {
      mockQueryRaw.mockResolvedValueOnce([{
        total_connections: 5,
        active_connections: 2,
        idle_connections: 3,
        app_connections: 2
      }]);

      const { getConnectionStats } = require('../../src/lib/prisma');

      const stats = await getConnectionStats();

      expect(stats).toEqual({
        total_connections: 5,
        active_connections: 2,
        idle_connections: 3,
        app_connections: 2
      });
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent database operations without connection leaks', async () => {
      const { prisma } = require('../../src/lib/prisma');

      // Simulate concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        prisma.user.findMany().catch(() => [])
      );

      await Promise.all(operations);

      // Should only create one client instance regardless of concurrent access
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    test('should handle rapid sequential imports', () => {
      // Rapidly import module multiple times (simulating hot reload scenario)
      for (let i = 0; i < 10; i++) {
        require('../../src/lib/prisma');
      }

      // Should still only create one instance
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection failures during startup', () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

      // Should not throw during module import
      expect(() => {
        require('../../src/lib/prisma');
      }).not.toThrow();

      expect(mockConnect).toHaveBeenCalled();
    });

    test('should reset instance references on disconnect', async () => {
      const { disconnectPrisma, __resetInstance } = require('../../src/lib/prisma');

      // Reset the instance
      __resetInstance();

      // Should allow creating new instance after reset
      const { prisma } = require('../../src/lib/prisma');
      expect(prisma).toBeDefined();
    });
  });
});

describe('Integration with Express Application', () => {
  test('should work with multiple controller imports', () => {
    // Simulate multiple controllers importing Prisma
    const authController = () => {
      const { prisma } = require('../../src/lib/prisma');
      return prisma;
    };

    const userController = () => {
      const { prisma } = require('../../src/lib/prisma');
      return prisma;
    };

    const transactionController = () => {
      const { prisma } = require('../../src/lib/prisma');
      return prisma;
    };

    const authPrisma = authController();
    const userPrisma = userController();
    const transactionPrisma = transactionController();

    // All should reference the same instance
    expect(authPrisma).toBe(userPrisma);
    expect(userPrisma).toBe(transactionPrisma);

    // Only one PrismaClient should be created
    expect(PrismaClient).toHaveBeenCalledTimes(1);
  });

  test('should handle server shutdown scenario', async () => {
    const { disconnectPrisma } = require('../../src/lib/prisma');

    // Simulate server shutdown
    const shutdownPromise = disconnectPrisma();

    await expect(shutdownPromise).resolves.toBeUndefined();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});