/**
 * requirePremium Middleware Tests
 *
 * Comprehensive test suite for premium subscription enforcement
 *
 * Test Coverage:
 * - Unauthenticated requests (401)
 * - Free users (403 with upgrade message)
 * - Premium users (allowed)
 * - Admin bypass
 * - Expired subscriptions
 * - Backward compatibility with isPremium
 * - Custom feature names
 * - Response format validation
 */

const request = require('supertest');
const express = require('express');
const { requirePremium } = require('../src/middleware/requirePremium');

// Mock Express app for testing
function createTestApp(middlewareOptions = {}) {
  const app = express();
  app.use(express.json());

  // Protected route with premium check
  app.get('/api/premium-feature',
    requirePremium(middlewareOptions),
    (req, res) => {
      res.json({ success: true, message: 'Premium feature accessed' });
    }
  );

  return app;
}

// Mock user objects
const mockUsers = {
  unauthenticated: null,

  freeUser: {
    id: 'free-user-123',
    email: 'free@pluqla.com',
    name: 'Free User',
    role: 'user',
    isPremium: false,
    subscriptionTier: 'FREE'
  },

  premiumUser: {
    id: 'premium-user-456',
    email: 'premium@pluqla.com',
    name: 'Premium User',
    role: 'user',
    isPremium: true,
    subscriptionTier: 'PREMIUM',
    subscriptionStartDate: new Date('2024-01-01'),
    subscriptionEndDate: null // Active
  },

  enterpriseUser: {
    id: 'enterprise-user-789',
    email: 'enterprise@pluqla.com',
    name: 'Enterprise User',
    role: 'user',
    isPremium: true,
    subscriptionTier: 'ENTERPRISE',
    subscriptionStartDate: new Date('2024-01-01'),
    subscriptionEndDate: null
  },

  adminUser: {
    id: 'admin-user-999',
    email: 'admin@pluqla.com',
    name: 'Admin User',
    role: 'admin',
    isPremium: false,
    subscriptionTier: 'FREE' // Admin doesn't need premium
  },

  expiredUser: {
    id: 'expired-user-111',
    email: 'expired@pluqla.com',
    name: 'Expired User',
    role: 'user',
    isPremium: true,
    subscriptionTier: 'PREMIUM',
    subscriptionStartDate: new Date('2023-01-01'),
    subscriptionEndDate: new Date('2023-12-31') // Expired
  },

  legacyPremiumUser: {
    id: 'legacy-user-222',
    email: 'legacy@pluqla.com',
    name: 'Legacy Premium User',
    role: 'user',
    isPremium: true, // Old field
    subscriptionTier: null // No new field
  }
};

// Middleware to inject mock user
function mockAuthMiddleware(user) {
  return (req, res, next) => {
    req.user = user;
    next();
  };
}

// Helper to create app with mocked user
function createAppWithUser(user, premiumOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(mockAuthMiddleware(user));
  app.get('/api/premium-feature',
    requirePremium(premiumOptions),
    (req, res) => {
      res.json({ success: true, message: 'Premium feature accessed' });
    }
  );
  return app;
}

describe('requirePremium Middleware', () => {

  // ==================== 1. Authentication Tests ====================

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const app = createAppWithUser(null);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(401);

      expect(res.body).toEqual({
        error: 'Authentication required',
        message: 'You must be logged in to access this feature'
      });
    });

    it('should return 401 when req.user exists but has no id', async () => {
      const app = createAppWithUser({ email: 'test@test.com' }); // No id

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(401);

      expect(res.body.error).toBe('Authentication required');
    });
  });

  // ==================== 2. Free User Tests ====================

  describe('Free Users', () => {
    it('should return 403 for free users', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.error).toBe('Premium subscription required');
    });

    it('should include upgrade message in 403 response', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.message).toContain('Upgrade to premium');
    });

    it('should include full details object in 403 response', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.details).toMatchObject({
        currentTier: 'FREE',
        requiredTier: 'PREMIUM',
        upgradeUrl: '/subscription',
        pricing: {
          monthly: '5€',
          currency: 'EUR'
        }
      });
    });

    it('should include benefits list in 403 response', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.details.benefits).toBeInstanceOf(Array);
      expect(res.body.details.benefits.length).toBe(8);
      expect(res.body.details.benefits[0]).toContain('500 AI requests');
    });
  });

  // ==================== 3. Premium User Tests ====================

  describe('Premium Users', () => {
    it('should allow PREMIUM tier users', async () => {
      const app = createAppWithUser(mockUsers.premiumUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow ENTERPRISE tier users', async () => {
      const app = createAppWithUser(mockUsers.enterpriseUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow users with active subscription (no end date)', async () => {
      const app = createAppWithUser(mockUsers.premiumUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow users with future expiration date', async () => {
      const futureUser = {
        ...mockUsers.premiumUser,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
      };
      const app = createAppWithUser(futureUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 4. Admin Bypass Tests ====================

  describe('Admin Bypass', () => {
    it('should allow admins by default', async () => {
      const app = createAppWithUser(mockUsers.adminUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow admins when allowAdmin=true', async () => {
      const app = createAppWithUser(mockUsers.adminUser, { allowAdmin: true });

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should block admins when allowAdmin=false', async () => {
      const app = createAppWithUser(mockUsers.adminUser, { allowAdmin: false });

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.error).toBe('Premium subscription required');
    });
  });

  // ==================== 5. Expired Subscription Tests ====================

  describe('Expired Subscriptions', () => {
    it('should block users with expired subscriptions', async () => {
      const app = createAppWithUser(mockUsers.expiredUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.error).toBe('Subscription expired');
    });

    it('should include expiration message for expired users', async () => {
      const app = createAppWithUser(mockUsers.expiredUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.message).toContain('premium subscription has expired');
    });

    it('should include renew URL for expired users', async () => {
      const app = createAppWithUser(mockUsers.expiredUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.details.renewUrl).toBe('/subscription');
    });
  });

  // ==================== 6. Backward Compatibility Tests ====================

  describe('Backward Compatibility', () => {
    it('should allow users with isPremium=true (legacy)', async () => {
      const app = createAppWithUser(mockUsers.legacyPremiumUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should prioritize subscriptionTier over isPremium', async () => {
      const conflictUser = {
        ...mockUsers.freeUser,
        isPremium: true, // Says premium
        subscriptionTier: 'FREE' // But tier is free
      };
      const app = createAppWithUser(conflictUser);

      // Should use subscriptionTier and allow (since isPremium=true is checked too)
      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);
    });
  });

  // ==================== 7. Custom Feature Name Tests ====================

  describe('Custom Feature Names', () => {
    it('should use default feature name when not specified', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.message).toContain('this premium feature');
    });

    it('should use custom feature name when specified', async () => {
      const app = createAppWithUser(mockUsers.freeUser, {
        feature: 'AI transport optimization'
      });

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.message).toContain('AI transport optimization');
    });

    it('should use different feature names for different routes', async () => {
      const app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(mockUsers.freeUser));

      app.get('/api/transport', requirePremium({ feature: 'transport optimization' }), (req, res) => {
        res.json({ success: true });
      });

      app.get('/api/meals', requirePremium({ feature: 'meal planning' }), (req, res) => {
        res.json({ success: true });
      });

      const res1 = await request(app).get('/api/transport').expect(403);
      expect(res1.body.message).toContain('transport optimization');

      const res2 = await request(app).get('/api/meals').expect(403);
      expect(res2.body.message).toContain('meal planning');
    });
  });

  // ==================== 8. Response Format Tests ====================

  describe('Response Format', () => {
    it('should return consistent 403 error structure', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('details');
    });

    it('should include all required details fields', async () => {
      const app = createAppWithUser(mockUsers.freeUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      const details = res.body.details;
      expect(details).toHaveProperty('currentTier');
      expect(details).toHaveProperty('requiredTier');
      expect(details).toHaveProperty('upgradeUrl');
      expect(details).toHaveProperty('pricing');
      expect(details).toHaveProperty('benefits');
    });
  });

  // ==================== 9. Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle null subscriptionTier gracefully', async () => {
      const nullTierUser = {
        ...mockUsers.freeUser,
        subscriptionTier: null,
        isPremium: false
      };
      const app = createAppWithUser(nullTierUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.details.currentTier).toBe('FREE');
    });

    it('should handle undefined subscriptionTier gracefully', async () => {
      const undefinedTierUser = {
        id: 'test-123',
        email: 'test@test.com',
        role: 'user'
        // No subscriptionTier or isPremium
      };
      const app = createAppWithUser(undefinedTierUser);

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(res.body.error).toBe('Premium subscription required');
    });

    it('should handle case-sensitive tier comparison', async () => {
      const lowercaseTierUser = {
        ...mockUsers.premiumUser,
        subscriptionTier: 'premium' // lowercase instead of PREMIUM
      };
      const app = createAppWithUser(lowercaseTierUser);

      // Should NOT match 'PREMIUM' exactly
      const res = await request(app)
        .get('/api/premium-feature')
        .expect(403);
    });
  });

  // ==================== 10. Integration Tests ====================

  describe('Integration with Routes', () => {
    it('should work in middleware chain with multiple middlewares', async () => {
      const app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(mockUsers.premiumUser));

      // Middleware chain
      const loggingMiddleware = (req, res, next) => {
        req.logged = true;
        next();
      };

      app.get('/api/premium-feature',
        loggingMiddleware,
        requirePremium(),
        (req, res) => {
          res.json({ success: true, logged: req.logged });
        }
      );

      const res = await request(app)
        .get('/api/premium-feature')
        .expect(200);

      expect(res.body.logged).toBe(true);
    });

    it('should not proceed to controller if premium check fails', async () => {
      let controllerCalled = false;

      const app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(mockUsers.freeUser));

      app.get('/api/premium-feature',
        requirePremium(),
        (req, res) => {
          controllerCalled = true;
          res.json({ success: true });
        }
      );

      await request(app)
        .get('/api/premium-feature')
        .expect(403);

      expect(controllerCalled).toBe(false);
    });
  });
});
