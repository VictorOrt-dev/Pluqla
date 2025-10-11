/**
 * Auth Admin Routes Integration Tests
 *
 * Tests admin authentication endpoints with real database connections
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../src/app');
const jwtManager = require('../src/lib/jwtManager');

const prisma = new PrismaClient();

describe('Auth Admin Routes Integration', () => {
  let adminToken;
  let adminUser;
  let regularUser;
  let testSession;

  beforeAll(async () => {
    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: '$2a$10$ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', // Hashed password
        role: 'admin',
        status: 'active',
        emailVerified: true
      }
    });

    // Create regular user
    regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        name: 'Regular User',
        password: '$2a$10$ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        role: 'user',
        status: 'active',
        emailVerified: true
      }
    });

    // Generate admin JWT token
    adminToken = jwtManager.signToken({
      userId: adminUser.id,
      type: 'access',
      role: 'admin'
    });

    // Create test session
    testSession = await prisma.betterAuthSession.create({
      data: {
        sessionToken: 'test-session-token-12345',
        userId: regularUser.id,
        expires: new Date(Date.now() + 86400000), // 24 hours
        data: JSON.stringify({ userAgent: 'Test Agent' })
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.betterAuthSession.deleteMany({
      where: { userId: { in: [adminUser.id, regularUser.id] } }
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminUser.id, regularUser.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, regularUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('GET /admin/auth/sessions', () => {
    it('should list sessions with admin token', async () => {
      const response = await request(app)
        .get('/admin/auth/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter sessions by userId', async () => {
      const response = await request(app)
        .get(`/admin/auth/sessions?userId=${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessions.every(s => s.userId === regularUser.id)).toBe(true);
    });

    it('should filter active sessions only', async () => {
      const response = await request(app)
        .get('/admin/auth/sessions?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.sessions.forEach(session => {
        expect(new Date(session.expires) > new Date()).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/admin/auth/sessions?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/admin/auth/sessions')
        .expect(401);
    });

    it('should reject request with regular user token', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .get('/admin/auth/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/admin/auth/sessions?page=invalid&limit=abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should fall back to defaults
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.limit).toBeDefined();
    });
  });

  describe('POST /admin/auth/revoke-session', () => {
    let sessionToRevoke;

    beforeEach(async () => {
      sessionToRevoke = await prisma.betterAuthSession.create({
        data: {
          sessionToken: `revoke-test-${Date.now()}`,
          userId: regularUser.id,
          expires: new Date(Date.now() + 86400000)
        }
      });
    });

    it('should revoke session by sessionToken', async () => {
      const response = await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionToken: sessionToRevoke.sessionToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', expect.stringContaining('revoked'));

      // Verify session was deleted
      const deletedSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: sessionToRevoke.sessionToken }
      });
      expect(deletedSession).toBeNull();
    });

    it('should revoke all sessions for a userId', async () => {
      // Create multiple sessions
      await prisma.betterAuthSession.createMany({
        data: [
          {
            sessionToken: `multi-1-${Date.now()}`,
            userId: regularUser.id,
            expires: new Date(Date.now() + 86400000)
          },
          {
            sessionToken: `multi-2-${Date.now()}`,
            userId: regularUser.id,
            expires: new Date(Date.now() + 86400000)
          }
        ]
      });

      const response = await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: regularUser.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.revokedCount).toBeGreaterThan(0);

      // Verify all sessions deleted
      const remainingSessions = await prisma.betterAuthSession.count({
        where: { userId: regularUser.id }
      });
      expect(remainingSessions).toBe(0);
    });

    it('should return error when no sessionToken or userId provided', async () => {
      const response = await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle non-existent sessionToken gracefully', async () => {
      const response = await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionToken: 'non-existent-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.revokedCount).toBe(0);
    });

    it('should reject request without admin privileges', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ sessionToken: sessionToRevoke.sessionToken })
        .expect(403);
    });
  });

  describe('POST /admin/auth/rotate-keys', () => {
    it('should rotate JWT keys with generated secret', async () => {
      const response = await request(app)
        .post('/admin/auth/rotate-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ generate: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', expect.stringContaining('rotated'));
      expect(response.body).toHaveProperty('newSecret');
      expect(response.body.newSecret.length).toBeGreaterThanOrEqual(64); // Hex string
      expect(response.body).toHaveProperty('activeSecrets');
      expect(response.body).toHaveProperty('gracePeriodHours');
    });

    it('should rotate JWT keys with provided secret', async () => {
      const customSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const response = await request(app)
        .post('/admin/auth/rotate-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ secret: customSecret })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).not.toHaveProperty('newSecret'); // Should not expose provided secret
      expect(response.body).toHaveProperty('activeSecrets');
    });

    it('should reject invalid secret format', async () => {
      const response = await request(app)
        .post('/admin/auth/rotate-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ secret: 'too-short' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .post('/admin/auth/rotate-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ generate: true })
        .expect(403);
    });

    it('should handle missing body parameters', async () => {
      const response = await request(app)
        .post('/admin/auth/rotate-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/auth/metrics', () => {
    beforeEach(async () => {
      // Create some test data for metrics
      await prisma.refreshToken.create({
        data: {
          token: `metrics-refresh-${Date.now()}`,
          userId: regularUser.id,
          expiresAt: new Date(Date.now() + 7 * 86400000),
          revoked: false
        }
      });
    });

    it('should return comprehensive authentication metrics', async () => {
      const response = await request(app)
        .get('/admin/auth/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');

      const metrics = response.body.metrics;
      expect(metrics).toHaveProperty('sessions');
      expect(metrics.sessions).toHaveProperty('active');
      expect(metrics.sessions).toHaveProperty('total');

      expect(metrics).toHaveProperty('users');
      expect(metrics.users).toHaveProperty('active24h');
      expect(metrics.users).toHaveProperty('totalActive');

      expect(metrics).toHaveProperty('tokens');
      expect(metrics.tokens).toHaveProperty('refreshTokens');
      expect(metrics.tokens).toHaveProperty('revokedTokens');

      expect(metrics).toHaveProperty('jwt');
      expect(metrics.jwt).toHaveProperty('activeSecrets');
      expect(metrics.jwt).toHaveProperty('revokedTokensInMemory');
    });

    it('should calculate percentages correctly', async () => {
      const response = await request(app)
        .get('/admin/auth/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const metrics = response.body.metrics;

      if (metrics.sessions.total > 0) {
        expect(metrics.sessions.activePercentage).toBeGreaterThanOrEqual(0);
        expect(metrics.sessions.activePercentage).toBeLessThanOrEqual(100);
      }

      if (metrics.users.totalActive > 0) {
        expect(metrics.users.engagementPercentage).toBeGreaterThanOrEqual(0);
        expect(metrics.users.engagementPercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should reject non-admin users', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .get('/admin/auth/metrics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/admin/auth/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.metrics).toHaveProperty('timestamp');
      expect(new Date(response.body.metrics.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('POST /admin/auth/revoke-token', () => {
    it('should revoke JWT token by JTI', async () => {
      // Create a token with JTI
      const tokenWithJti = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        jti: 'test-jti-12345'
      });

      const response = await request(app)
        .post('/admin/auth/revoke-token')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jti: 'test-jti-12345' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', expect.stringContaining('revoked'));

      // Verify token is now rejected
      const verifyResponse = jwtManager.verifyToken(tokenWithJti);
      expect(verifyResponse).toBeNull(); // Should fail verification due to revocation
    });

    it('should return error when JTI is missing', async () => {
      const response = await request(app)
        .post('/admin/auth/revoke-token')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle already revoked JTI', async () => {
      const jti = 'already-revoked-jti';

      // Revoke once
      await request(app)
        .post('/admin/auth/revoke-token')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jti })
        .expect(200);

      // Revoke again - should still succeed (idempotent)
      const response = await request(app)
        .post('/admin/auth/revoke-token')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jti })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject non-admin users', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .post('/admin/auth/revoke-token')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jti: 'some-jti' })
        .expect(403);
    });
  });

  describe('GET /admin/auth/health', () => {
    it('should return healthy status when all systems operational', async () => {
      const response = await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('health');
      expect(response.body.health).toHaveProperty('database');
      expect(response.body.health).toHaveProperty('jwtManager');
      expect(response.body.health).toHaveProperty('sessions');
      expect(response.body.health).toHaveProperty('overall', 'healthy');
    });

    it('should check database connectivity', async () => {
      const response = await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.health.database).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(response.body.health.database.status);
    });

    it('should check JWT manager status', async () => {
      const response = await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.health.jwtManager).toHaveProperty('status');
      expect(response.body.health.jwtManager).toHaveProperty('activeSecrets');
      expect(response.body.health.jwtManager.activeSecrets).toBeGreaterThan(0);
    });

    it('should check sessions table', async () => {
      const response = await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.health.sessions).toHaveProperty('status');
      expect(response.body.health.sessions).toHaveProperty('count');
    });

    it('should reject non-admin users', async () => {
      const userToken = jwtManager.signToken({
        userId: regularUser.id,
        type: 'access',
        role: 'user'
      });

      await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/admin/auth/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on admin endpoints', async () => {
      const requests = [];

      // Make multiple rapid requests (assuming rate limit is configured)
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/admin/auth/metrics')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited if limits are in place
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // This test depends on rate limiting configuration
      // If configured, we should see some 429 responses
      if (process.env.RATE_LIMIT_ENABLED === 'true') {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    }, 10000); // Increase timeout for multiple requests
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Disconnect Prisma temporarily
      await prisma.$disconnect();

      const response = await request(app)
        .get('/admin/auth/sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should return 500 but with proper error structure
      expect([500, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Reconnect
      await prisma.$connect();
    });

    it('should validate input data types', async () => {
      const response = await request(app)
        .post('/admin/auth/revoke-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionToken: 12345 }) // Should be string
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize error messages', async () => {
      const response = await request(app)
        .get('/admin/auth/sessions?page=-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).not.toContain('stack');
      expect(response.body.error).not.toContain('prisma');
    });
  });
});
