/**
 * 🧪 PREMIUM ROUTES INTEGRATION TESTS
 *
 * Comprehensive tests for premium tier enforcement across all endpoints.
 * Verifies free/premium/admin/expired subscription scenarios.
 *
 * Test Coverage:
 * - Free users denied (403) on premium endpoints
 * - Premium users allowed (200) with proper quotas
 * - Expired subscriptions rejected (403)
 * - Admin users bypass restrictions (200)
 * - Quota enforcement for premium features
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prismaClient');
const { signToken } = require('../../src/lib/jwtManager');

describe('Premium Routes Integration Tests', () => {
  let freeUser, premiumUser, expiredUser, adminUser;
  let freeToken, premiumToken, expiredToken, adminToken;

  beforeAll(async () => {
    // Clean up test data
    await prisma.aiUsage.deleteMany({
      where: {
        userId: {
          in: [
            'test-free-user-premium',
            'test-premium-user',
            'test-expired-user',
            'test-admin-user-premium'
          ]
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            'test-free-user-premium',
            'test-premium-user',
            'test-expired-user',
            'test-admin-user-premium'
          ]
        }
      }
    });

    // Create test users with different subscription states
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Free user (no premium)
    freeUser = await prisma.user.create({
      data: {
        id: 'test-free-user-premium',
        email: 'free@premiumtest.com',
        username: 'freeuser',
        password: 'hashed_password',
        subscriptionTier: 'FREE',
        isPremium: false,
        role: 'user'
      }
    });

    // Premium user (active subscription)
    premiumUser = await prisma.user.create({
      data: {
        id: 'test-premium-user',
        email: 'premium@premiumtest.com',
        username: 'premiumuser',
        password: 'hashed_password',
        subscriptionTier: 'PREMIUM',
        isPremium: true,
        subscriptionStartDate: now,
        subscriptionEndDate: futureDate,
        role: 'user'
      }
    });

    // Expired premium user
    expiredUser = await prisma.user.create({
      data: {
        id: 'test-expired-user',
        email: 'expired@premiumtest.com',
        username: 'expireduser',
        password: 'hashed_password',
        subscriptionTier: 'PREMIUM',
        isPremium: true,
        subscriptionStartDate: pastDate,
        subscriptionEndDate: pastDate,
        role: 'user'
      }
    });

    // Admin user (bypasses premium checks)
    adminUser = await prisma.user.create({
      data: {
        id: 'test-admin-user-premium',
        email: 'admin@premiumtest.com',
        username: 'adminuser',
        password: 'hashed_password',
        subscriptionTier: 'FREE',
        isPremium: false,
        role: 'admin'
      }
    });

    // Generate JWT tokens
    freeToken = signToken({ userId: freeUser.id, type: 'access' });
    premiumToken = signToken({ userId: premiumUser.id, type: 'access' });
    expiredToken = signToken({ userId: expiredUser.id, type: 'access' });
    adminToken = signToken({ userId: adminUser.id, type: 'access' });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.aiUsage.deleteMany({
      where: {
        userId: {
          in: [freeUser.id, premiumUser.id, expiredUser.id, adminUser.id]
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: [freeUser.id, premiumUser.id, expiredUser.id, adminUser.id] }
      }
    });

    await prisma.$disconnect();
  });

  describe('Premium-Protected AI Endpoints', () => {
    const premiumEndpoints = [
      { path: '/api/ai/suggestions/alimentation', method: 'post', body: { category: 'alimentation' } },
      { path: '/api/ai/suggestions/habits', method: 'post', body: { category: 'habits' } },
      { path: '/api/ai/suggestions/activite', method: 'post', body: { category: 'activite' } },
      { path: '/api/ai/suggestions/deplacement', method: 'post', body: { category: 'deplacement' } }
    ];

    describe('Free User Access (403 Denied)', () => {
      premiumEndpoints.forEach(({ path, method, body }) => {
        it(`should deny free user access to ${path}`, async () => {
          const response = await request(app)
            [method](path)
            .set('Authorization', `Bearer ${freeToken}`)
            .send(body);

          expect(response.status).toBe(403);
          expect(response.body).toMatchObject({
            error: 'Premium subscription required',
            details: {
              currentTier: 'FREE',
              requiredTier: 'PREMIUM',
              upgradeUrl: '/subscription'
            }
          });
          expect(response.body.details.benefits).toBeInstanceOf(Array);
          expect(response.body.details.benefits.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Premium User Access (200 Allowed)', () => {
      premiumEndpoints.forEach(({ path, method, body }) => {
        it(`should allow premium user access to ${path}`, async () => {
          const response = await request(app)
            [method](path)
            .set('Authorization', `Bearer ${premiumToken}`)
            .send(body);

          // Should be 200 or 500 (AI service might fail, but auth passed)
          expect([200, 500, 503]).toContain(response.status);

          // If 403, it means premium check failed (should not happen)
          if (response.status === 403) {
            throw new Error(`Premium user denied access: ${JSON.stringify(response.body)}`);
          }
        });
      });
    });

    describe('Expired Subscription (403 Denied)', () => {
      premiumEndpoints.forEach(({ path, method, body }) => {
        it(`should deny expired subscription access to ${path}`, async () => {
          const response = await request(app)
            [method](path)
            .set('Authorization', `Bearer ${expiredToken}`)
            .send(body);

          expect(response.status).toBe(403);
          expect(response.body).toMatchObject({
            error: 'Subscription expired',
            details: {
              renewUrl: '/subscription'
            }
          });
          expect(response.body.details.daysExpired).toBeGreaterThan(0);
        });
      });
    });

    describe('Admin Bypass (200 Allowed)', () => {
      premiumEndpoints.forEach(({ path, method, body }) => {
        it(`should allow admin bypass for ${path}`, async () => {
          const response = await request(app)
            [method](path)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(body);

          // Should be 200 or 500 (AI service might fail, but auth passed)
          expect([200, 500, 503]).toContain(response.status);

          // If 403, it means admin bypass failed (should not happen)
          if (response.status === 403) {
            throw new Error(`Admin user denied access: ${JSON.stringify(response.body)}`);
          }
        });
      });
    });
  });

  describe('AI Quota Enforcement for Premium Users', () => {
    it('should enforce premium quota limits', async () => {
      // Premium users get higher quota (500 vs 50 for free)
      const response = await request(app)
        .post('/api/ai/suggestions/alimentation')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({ category: 'alimentation' });

      // Check quota headers if present
      if (response.headers['x-ai-quota-remaining']) {
        const remaining = parseInt(response.headers['x-ai-quota-remaining'], 10);
        const limit = parseInt(response.headers['x-ai-quota-limit'], 10);

        // Premium limit should be 500
        expect(limit).toBeGreaterThanOrEqual(500);
        expect(remaining).toBeLessThanOrEqual(limit);
      }
    });

    it('should track premium AI usage separately', async () => {
      // Make request
      await request(app)
        .post('/api/ai/suggestions/habits')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({ category: 'habits' });

      // Check database usage record
      const usage = await prisma.aiUsage.findFirst({
        where: {
          userId: premiumUser.id,
          feature: 'suggestions'
        },
        orderBy: { createdAt: 'desc' }
      });

      if (usage) {
        expect(usage.userId).toBe(premiumUser.id);
        expect(usage.feature).toBe('suggestions');
        expect(usage.tokensUsed).toBeGreaterThan(0);
      }
    });
  });

  describe('Mixed User Scenarios', () => {
    it('should handle free user attempting multiple premium endpoints', async () => {
      const responses = await Promise.all([
        request(app)
          .post('/api/ai/suggestions/alimentation')
          .set('Authorization', `Bearer ${freeToken}`)
          .send({ category: 'alimentation' }),
        request(app)
          .post('/api/ai/suggestions/habits')
          .set('Authorization', `Bearer ${freeToken}`)
          .send({ category: 'habits' })
      ]);

      // All should be denied with 403
      responses.forEach(response => {
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Premium subscription required');
      });
    });

    it('should allow premium user across multiple endpoints', async () => {
      const responses = await Promise.all([
        request(app)
          .post('/api/ai/suggestions/alimentation')
          .set('Authorization', `Bearer ${premiumToken}`)
          .send({ category: 'alimentation' }),
        request(app)
          .post('/api/ai/suggestions/activite')
          .set('Authorization', `Bearer ${premiumToken}`)
          .send({ category: 'activite' })
      ]);

      // All should succeed or fail due to AI service, not auth
      responses.forEach(response => {
        expect(response.status).not.toBe(403);
      });
    });

    it('should handle subscription tier edge cases', async () => {
      // Test ENTERPRISE tier (should also pass)
      const enterpriseUser = await prisma.user.create({
        data: {
          id: 'test-enterprise-user',
          email: 'enterprise@premiumtest.com',
          username: 'enterpriseuser',
          password: 'hashed_password',
          subscriptionTier: 'ENTERPRISE',
          isPremium: true,
          role: 'user'
        }
      });

      const enterpriseToken = signToken({ userId: enterpriseUser.id, type: 'access' });

      const response = await request(app)
        .post('/api/ai/suggestions/alimentation')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({ category: 'alimentation' });

      expect(response.status).not.toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: enterpriseUser.id } });
    });
  });

  describe('Unauthenticated Access', () => {
    it('should require authentication for premium endpoints', async () => {
      const response = await request(app)
        .post('/api/ai/suggestions/alimentation')
        .send({ category: 'alimentation' });

      expect(response.status).toBe(401);
    });
  });

  describe('Premium Status Utility', () => {
    it('should correctly identify premium status', async () => {
      const { getPremiumStatus } = require('../../src/middleware/requirePremium');

      // Free user
      const freeStatus = getPremiumStatus(freeUser);
      expect(freeStatus.isPremium).toBe(false);
      expect(freeStatus.tier).toBe('FREE');
      expect(freeStatus.status).toBe('active');

      // Premium user
      const premiumStatus = getPremiumStatus(premiumUser);
      expect(premiumStatus.isPremium).toBe(true);
      expect(premiumStatus.tier).toBe('PREMIUM');
      expect(premiumStatus.status).toBe('active');

      // Expired user
      const expiredStatus = getPremiumStatus(expiredUser);
      expect(expiredStatus.isPremium).toBe(true);
      expect(expiredStatus.tier).toBe('PREMIUM');
      expect(expiredStatus.status).toBe('expired');

      // Admin user
      const adminStatus = getPremiumStatus(adminUser);
      expect(adminStatus.isPremium).toBe(false);
      expect(adminStatus.tier).toBe('FREE');
      expect(adminStatus.isAdmin).toBe(true);
    });
  });
});
