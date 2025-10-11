/**
 * CLI Auth Admin Tool Tests
 *
 * Tests for the auth-admin CLI commands with mocked dependencies
 */

const {
  listSessions,
  revokeSession,
  rotateKeys,
  getMetrics,
  healthCheck,
  getStats
} = require('../../src/cli/auth-admin');

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    betterAuthSession: {
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn()
    },
    user: {
      count: jest.fn()
    },
    refreshToken: {
      count: jest.fn()
    },
    $disconnect: jest.fn(),
    $queryRaw: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

jest.mock('../../src/lib/jwtManager', () => ({
  generateSecret: jest.fn(() => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  rotateSecret: jest.fn((secret) => ({
    activeSecrets: 2,
    gracePeriodHours: 24,
    timestamp: new Date().toISOString()
  })),
  getStats: jest.fn(() => ({
    activeSecrets: 1,
    algorithm: 'HS256',
    gracePeriodHours: 24,
    revokedTokensInMemory: 0
  }))
}));

// Mock console methods
const mockLog = jest.fn();
const mockError = jest.fn();
const originalLog = console.log;
const originalError = console.error;

describe('CLI Auth Admin Tool', () => {
  let prisma;
  let jwtManager;

  beforeAll(() => {
    console.log = mockLog;
    console.error = mockError;
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    jwtManager = require('../../src/lib/jwtManager');
  });

  describe('listSessions', () => {
    it('should list active sessions with default parameters', async () => {
      const mockSessions = [
        {
          id: 'session1',
          sessionToken: 'token123456789012345678901234567890',
          userId: 'user1',
          expires: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          user: {
            email: 'user@example.com',
            name: 'Test User',
            role: 'user',
            status: 'active'
          }
        }
      ];

      prisma.betterAuthSession.findMany.mockResolvedValue(mockSessions);
      prisma.betterAuthSession.count.mockResolvedValue(1);

      await listSessions({ status: 'active', page: 1, limit: 50 });

      expect(prisma.betterAuthSession.findMany).toHaveBeenCalledWith({
        where: { expires: { gt: expect.any(Date) } },
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object)
      });

      expect(prisma.betterAuthSession.count).toHaveBeenCalled();
      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('should filter sessions by userId', async () => {
      prisma.betterAuthSession.findMany.mockResolvedValue([]);
      prisma.betterAuthSession.count.mockResolvedValue(0);

      await listSessions({ userId: 'user123', status: 'active', page: 1, limit: 50 });

      expect(prisma.betterAuthSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user123'
          })
        })
      );
    });

    it('should filter expired sessions', async () => {
      prisma.betterAuthSession.findMany.mockResolvedValue([]);
      prisma.betterAuthSession.count.mockResolvedValue(0);

      await listSessions({ status: 'expired', page: 1, limit: 50 });

      expect(prisma.betterAuthSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expires: { lte: expect.any(Date) }
          })
        })
      );
    });

    it('should handle pagination', async () => {
      prisma.betterAuthSession.findMany.mockResolvedValue([]);
      prisma.betterAuthSession.count.mockResolvedValue(100);

      await listSessions({ status: 'active', page: 3, limit: 20 });

      expect(prisma.betterAuthSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20
        })
      );
    });

    it('should handle errors gracefully', async () => {
      prisma.betterAuthSession.findMany.mockRejectedValue(new Error('Database error'));

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await listSessions({ status: 'active', page: 1, limit: 50 });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(prisma.$disconnect).toHaveBeenCalled();

      exitSpy.mockRestore();
    });
  });

  describe('revokeSession', () => {
    it('should revoke session by sessionToken', async () => {
      prisma.betterAuthSession.deleteMany.mockResolvedValue({ count: 1 });

      await revokeSession({ sessionToken: 'token123' });

      expect(prisma.betterAuthSession.deleteMany).toHaveBeenCalledWith({
        where: { sessionToken: 'token123' }
      });

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('should revoke all sessions for a userId', async () => {
      prisma.betterAuthSession.deleteMany.mockResolvedValue({ count: 3 });

      await revokeSession({ userId: 'user123' });

      expect(prisma.betterAuthSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      });
    });

    it('should revoke all sessions with confirmation delay', async () => {
      prisma.betterAuthSession.deleteMany.mockResolvedValue({ count: 50 });

      // Mock setTimeout to execute immediately
      jest.useFakeTimers();

      const promise = revokeSession({ all: true });

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      await promise;

      expect(prisma.betterAuthSession.deleteMany).toHaveBeenCalledWith({});

      jest.useRealTimers();
    });

    it('should warn when no sessions found', async () => {
      prisma.betterAuthSession.deleteMany.mockResolvedValue({ count: 0 });

      await revokeSession({ sessionToken: 'nonexistent' });

      expect(mockLog).toHaveBeenCalledWith(
        expect.anything(),
        'No sessions found to revoke'
      );
    });

    it('should exit with error when no parameters provided', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await revokeSession({});

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(prisma.$disconnect).toHaveBeenCalled();

      exitSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      prisma.betterAuthSession.deleteMany.mockRejectedValue(new Error('Connection lost'));

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await revokeSession({ sessionToken: 'token123' });

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });
  });

  describe('rotateKeys', () => {
    it('should generate and rotate new key', async () => {
      await rotateKeys({ generate: true });

      expect(jwtManager.generateSecret).toHaveBeenCalled();
      expect(jwtManager.rotateSecret).toHaveBeenCalledWith(expect.any(String));
      expect(mockLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('New Secret')
      );
    });

    it('should rotate with provided secret', async () => {
      const customSecret = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

      await rotateKeys({ generate: false, secret: customSecret });

      expect(jwtManager.generateSecret).not.toHaveBeenCalled();
      expect(jwtManager.rotateSecret).toHaveBeenCalledWith(customSecret);
    });

    it('should exit with error when no secret provided and generate=false', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await rotateKeys({ generate: false });

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should display rotation details', async () => {
      jwtManager.rotateSecret.mockReturnValue({
        activeSecrets: 3,
        gracePeriodHours: 24,
        timestamp: '2024-12-15T10:00:00.000Z'
      });

      await rotateKeys({ generate: true });

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Active Secrets: 3')
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Grace Period: 24 hours')
      );
    });

    it('should handle rotation errors', async () => {
      jwtManager.rotateSecret.mockImplementation(() => {
        throw new Error('Invalid secret format');
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await rotateKeys({ generate: true });

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Setup default mock values
      prisma.betterAuthSession.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(50);
      prisma.refreshToken.count.mockResolvedValue(15);
    });

    it('should fetch and display all metrics', async () => {
      await getMetrics({});

      expect(prisma.betterAuthSession.count).toHaveBeenCalledTimes(2); // activeSessions + totalSessions
      expect(prisma.user.count).toHaveBeenCalledTimes(2); // activeUsers + totalUsers
      expect(prisma.refreshToken.count).toHaveBeenCalledTimes(2); // refreshTokens + revokedTokens
      expect(jwtManager.getStats).toHaveBeenCalled();
      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('should display session metrics', async () => {
      prisma.betterAuthSession.count
        .mockResolvedValueOnce(75) // activeSessions
        .mockResolvedValueOnce(100); // totalSessions

      await getMetrics({});

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Active: ')
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('75%')
      );
    });

    it('should display user engagement metrics', async () => {
      prisma.user.count
        .mockResolvedValueOnce(30) // activeUsers (24h)
        .mockResolvedValueOnce(100); // totalUsers

      await getMetrics({});

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Engagement: 30.00%')
      );
    });

    it('should display JWT manager stats', async () => {
      jwtManager.getStats.mockReturnValue({
        activeSecrets: 2,
        algorithm: 'HS256',
        gracePeriodHours: 24,
        revokedTokensInMemory: 5
      });

      await getMetrics({});

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Active Secrets: 2')
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Algorithm: HS256')
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Revoked JTIs (in memory): 5')
      );
    });

    it('should handle metrics fetch errors', async () => {
      prisma.betterAuthSession.count.mockRejectedValue(new Error('Query timeout'));

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await getMetrics({});

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(prisma.$disconnect).toHaveBeenCalled();

      exitSpy.mockRestore();
    });
  });

  describe('healthCheck', () => {
    it('should pass all health checks', async () => {
      prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      prisma.betterAuthSession.count.mockResolvedValue(50);
      jwtManager.getStats.mockReturnValue({ activeSecrets: 1 });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await healthCheck({});

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.betterAuthSession.count).toHaveBeenCalled();
      expect(jwtManager.getStats).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(prisma.$disconnect).toHaveBeenCalled();

      exitSpy.mockRestore();
    });

    it('should fail when database check fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      prisma.betterAuthSession.count.mockResolvedValue(50);
      jwtManager.getStats.mockReturnValue({ activeSecrets: 1 });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await healthCheck({});

      expect(mockError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Database: FAILED')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should fail when JWT manager check fails', async () => {
      prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      prisma.betterAuthSession.count.mockResolvedValue(50);
      jwtManager.getStats.mockImplementation(() => {
        throw new Error('No secrets configured');
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await healthCheck({});

      expect(mockError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('JWT Manager: FAILED')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should fail when sessions check fails', async () => {
      prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      prisma.betterAuthSession.count.mockRejectedValue(new Error('Table not found'));
      jwtManager.getStats.mockReturnValue({ activeSecrets: 1 });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await healthCheck({});

      expect(mockError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Sessions: FAILED')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should display success message when all checks pass', async () => {
      prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      prisma.betterAuthSession.count.mockResolvedValue(50);
      jwtManager.getStats.mockReturnValue({ activeSecrets: 1 });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await healthCheck({});

      expect(mockLog).toHaveBeenCalledWith(
        expect.anything(),
        'All health checks passed ✓'
      );

      exitSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should display JWT manager statistics', async () => {
      jwtManager.getStats.mockReturnValue({
        activeSecrets: 2,
        algorithm: 'HS256',
        gracePeriodHours: 24,
        revokedTokensInMemory: 10,
        tokenSigningCount: 1500,
        tokenVerificationCount: 5000
      });

      await getStats({});

      expect(jwtManager.getStats).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(
        expect.anything(),
        'JWT Manager Statistics:'
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('"activeSecrets": 2')
      );
    });

    it('should handle stats fetch errors', async () => {
      jwtManager.getStats.mockImplementation(() => {
        throw new Error('Stats unavailable');
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await getStats({});

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should format JSON output correctly', async () => {
      const mockStats = {
        activeSecrets: 1,
        algorithm: 'HS256',
        gracePeriodHours: 24,
        revokedTokensInMemory: 0
      };

      jwtManager.getStats.mockReturnValue(mockStats);

      await getStats({});

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(mockStats, null, 2))
      );
    });
  });
});
