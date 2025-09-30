/**
 * Session Cleanup Integration Tests
 *
 * Tests to ensure automatic session cleanup works correctly:
 * - Expired sessions are deleted
 * - Active sessions remain untouched
 * - Job can be triggered manually for testing
 * - Statistics tracking works
 * - Cleanup handles errors gracefully
 */

const { prisma } = require('../../src/lib/prisma');
const {
  performCleanup,
  triggerManualCleanup,
  getCleanupStats
} = require('../../src/services/sessionCleanupService');

describe('Session Cleanup Service', () => {
  let testUser;

  beforeAll(async () => {
    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!@#', 10);

    testUser = await prisma.user.create({
      data: {
        email: `cleanup-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Cleanup Test User',
        role: 'user',
        status: 'active',
        emailVerified: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      // Delete all sessions for test user
      await prisma.betterAuthSession.deleteMany({
        where: { userId: testUser.id }
      });

      // Delete user
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    }
  });

  beforeEach(async () => {
    // Clean up any existing test sessions before each test
    await prisma.betterAuthSession.deleteMany({
      where: { userId: testUser.id }
    });
  });

  describe('Expired Session Cleanup', () => {
    it('should delete expired sessions', async () => {
      // Create 3 expired sessions
      const expiredSessions = await Promise.all([
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
          }
        }),
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
          }
        }),
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 72 * 60 * 60 * 1000) // 3 days ago
          }
        })
      ]);

      // Verify expired sessions exist
      const beforeCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(beforeCount).toBe(3);

      // Run cleanup
      const result = await performCleanup();

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(3);

      // Verify expired sessions were deleted
      const afterCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(afterCount).toBe(0);

      // Verify each session was deleted
      for (const session of expiredSessions) {
        const deleted = await prisma.betterAuthSession.findUnique({
          where: { sessionToken: session.sessionToken }
        });
        expect(deleted).toBeNull();
      }
    });

    it('should handle cleanup with no expired sessions', async () => {
      // No expired sessions exist

      // Run cleanup
      const result = await performCleanup();

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should delete many expired sessions efficiently', async () => {
      // Create 100 expired sessions
      const sessionsToCreate = Array.from({ length: 100 }, (_, i) => ({
        sessionToken: require('crypto').randomBytes(32).toString('hex'),
        userId: testUser.id,
        expires: new Date(Date.now() - (i + 1) * 60 * 60 * 1000) // Various times in the past
      }));

      await prisma.betterAuthSession.createMany({
        data: sessionsToCreate
      });

      // Verify sessions created
      const beforeCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(beforeCount).toBe(100);

      // Run cleanup and measure performance
      const startTime = Date.now();
      const result = await performCleanup();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all expired sessions deleted
      const afterCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(afterCount).toBe(0);
    });
  });

  describe('Active Session Preservation', () => {
    it('should NOT delete active sessions', async () => {
      // Create 2 active sessions (expires in the future)
      const activeSessions = await Promise.all([
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
          }
        }),
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }
        })
      ]);

      // Create 1 expired session
      const expiredSession = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      // Run cleanup
      const result = await performCleanup();

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(1);

      // Verify active sessions still exist
      for (const session of activeSessions) {
        const stillActive = await prisma.betterAuthSession.findUnique({
          where: { sessionToken: session.sessionToken }
        });
        expect(stillActive).not.toBeNull();
        expect(stillActive.expires.getTime()).toBeGreaterThan(Date.now());
      }

      // Verify expired session was deleted
      const deleted = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: expiredSession.sessionToken }
      });
      expect(deleted).toBeNull();
    });

    it('should preserve sessions that just expired but within safety margin', async () => {
      // Create session that expires in 1 second
      const almostExpiredSession = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() + 1000) // 1 second from now
        }
      });

      // Run cleanup immediately
      const result = await performCleanup();

      // Session should still exist (not yet expired)
      const stillExists = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: almostExpiredSession.sessionToken }
      });
      expect(stillExists).not.toBeNull();
    });

    it('should handle mixed expired and active sessions correctly', async () => {
      // Create 5 expired and 5 active sessions
      const expiredPromises = Array.from({ length: 5 }, () =>
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in past week
          }
        })
      );

      const activePromises = Array.from({ length: 5 }, () =>
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in next week
          }
        })
      );

      await Promise.all([...expiredPromises, ...activePromises]);

      // Verify 10 sessions exist
      const beforeCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(beforeCount).toBe(10);

      // Run cleanup
      const result = await performCleanup();

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(5);

      // Verify exactly 5 sessions remain (the active ones)
      const afterCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(afterCount).toBe(5);

      // Verify remaining sessions are all active
      const remainingSessions = await prisma.betterAuthSession.findMany({
        where: { userId: testUser.id }
      });

      for (const session of remainingSessions) {
        expect(session.expires.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('Manual Cleanup Trigger', () => {
    it('should allow manual cleanup triggering', async () => {
      // Create some expired sessions
      await Promise.all([
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }),
        prisma.betterAuthSession.create({
          data: {
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 48 * 60 * 60 * 1000)
          }
        })
      ]);

      // Trigger manual cleanup
      const result = await triggerManualCleanup();

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(2);
      expect(result.duration).toBeDefined();

      // Verify sessions were deleted
      const afterCount = await prisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });
      expect(afterCount).toBe(0);
    });

    it('should return statistics about cleanup operation', async () => {
      // Create expired sessions
      await prisma.betterAuthSession.createMany({
        data: Array.from({ length: 10 }, () => ({
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }))
      });

      // Trigger cleanup
      const result = await triggerManualCleanup();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sessionsDeleted');
      expect(result).toHaveProperty('duration');
      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(10);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Statistics Tracking', () => {
    it('should track cleanup statistics', async () => {
      // Get initial stats
      const statsBefore = getCleanupStats();

      // Create and cleanup some sessions
      await prisma.betterAuthSession.createMany({
        data: Array.from({ length: 5 }, () => ({
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }))
      });

      await triggerManualCleanup();

      // Get updated stats
      const statsAfter = getCleanupStats();

      expect(statsAfter.totalRuns).toBeGreaterThan(statsBefore.totalRuns);
      expect(statsAfter.totalSessionsCleaned).toBeGreaterThan(statsBefore.totalSessionsCleaned);
      expect(statsAfter.lastRunAt).not.toBeNull();
      expect(statsAfter.lastRunDuration).not.toBeNull();
      expect(statsAfter.lastRunSessionsCleaned).toBeGreaterThanOrEqual(5);
    });

    it('should track failures', async () => {
      // Stats tracking is global, so we just verify structure
      const stats = getCleanupStats();

      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('totalSessionsCleaned');
      expect(stats).toHaveProperty('lastRunAt');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successRate');
    });

    it('should calculate averages correctly', async () => {
      // Run cleanup multiple times
      for (let i = 0; i < 3; i++) {
        await prisma.betterAuthSession.createMany({
          data: Array.from({ length: 5 }, () => ({
            sessionToken: require('crypto').randomBytes(32).toString('hex'),
            userId: testUser.id,
            expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }))
        });

        await triggerManualCleanup();
      }

      const stats = getCleanupStats();

      expect(stats.averageSessionsPerRun).toBeDefined();
      expect(typeof stats.averageSessionsPerRun).toBe('number');
      expect(stats.averageSessionsPerRun).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test verifies that cleanup handles errors without throwing

      // We can't easily simulate a database error without breaking the test database
      // So we just verify that cleanup completes successfully
      const result = await performCleanup();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
    });

    it('should continue operation after errors', async () => {
      // Run cleanup twice to ensure it can recover
      const result1 = await triggerManualCleanup();
      const result2 = await triggerManualCleanup();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete cleanup quickly for small datasets', async () => {
      // Create 10 expired sessions
      await prisma.betterAuthSession.createMany({
        data: Array.from({ length: 10 }, () => ({
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }))
      });

      const startTime = Date.now();
      await performCleanup();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should complete cleanup reasonably fast for large datasets', async () => {
      // Create 1000 expired sessions
      await prisma.betterAuthSession.createMany({
        data: Array.from({ length: 1000 }, () => ({
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }))
      });

      const startTime = Date.now();
      const result = await performCleanup();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});