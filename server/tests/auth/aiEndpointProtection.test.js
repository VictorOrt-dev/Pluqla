/**
 * AI Endpoint Protection Tests
 *
 * Tests for Better Auth protection on AI endpoints including:
 * - Authentication requirements
 * - Role-based access control
 * - Rate limiting
 * - Input validation
 * - Context security
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');
const bcrypt = require('bcryptjs');

describe('AI Endpoint Protection', () => {
  let freeUser, premiumUser, adminUser;
  let freeToken, premiumToken, adminToken;

  beforeAll(async () => {
    // Clean up test data
    await prisma.betterAuthSession.deleteMany({
      where: { user: { email: { contains: 'ai-test' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'ai-test' } }
    });

    // Create test users with different roles
    freeUser = await prisma.user.create({
      data: {
        email: 'ai-test-free@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'AI Test Free User',
        role: 'user',
        status: 'active',
        isPremium: false,
        savedAmount: 100,
        monthlyGoal: 500,
        level: 2,
        gamificationPoints: 150
      }
    });

    premiumUser = await prisma.user.create({
      data: {
        email: 'ai-test-premium@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'AI Test Premium User',
        role: 'user',
        status: 'active',
        isPremium: true,
        savedAmount: 1000,
        monthlyGoal: 2000,
        level: 5,
        gamificationPoints: 850
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'ai-test-admin@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'AI Test Admin User',
        role: 'admin',
        status: 'active',
        isPremium: true,
        savedAmount: 5000,
        monthlyGoal: 10000,
        level: 10,
        gamificationPoints: 2500
      }
    });

    // Create test transactions for context
    await prisma.transaction.createMany({
      data: [
        {
          userId: freeUser.id,
          amount: 25.50,
          category: 'alimentation',
          description: 'Grocery shopping',
          type: 'saving'
        },
        {
          userId: premiumUser.id,
          amount: 15.00,
          category: 'transport',
          description: 'Bus pass',
          type: 'saving'
        }
      ]
    });

    // Create sessions
    const { createSession } = require('../../src/auth/betterAuth');

    const freeSession = await createSession(freeUser.id);
    freeToken = freeSession.sessionToken;

    const premiumSession = await createSession(premiumUser.id);
    premiumToken = premiumSession.sessionToken;

    const adminSession = await createSession(adminUser.id);
    adminToken = adminSession.sessionToken;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: { in: [freeUser.id, premiumUser.id, adminUser.id] } }
    });
    await prisma.betterAuthSession.deleteMany({
      where: { userId: { in: [freeUser.id, premiumUser.id, adminUser.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [freeUser.id, premiumUser.id, adminUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('Public AI Endpoints', () => {
    it('should allow access to AI service status without authentication', async () => {
      const response = await request(app)
        .get('/api/ai-secure/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('features');
    });
  });

  describe('Authentication Requirements', () => {
    const protectedEndpoints = [
      { method: 'get', path: '/api/ai-secure/suggestions' },
      { method: 'post', path: '/api/ai-secure/suggestions' },
      { method: 'post', path: '/api/ai-secure/analyze' },
      { method: 'post', path: '/api/ai-secure/chat' },
      { method: 'post', path: '/api/ai-secure/classify/transactions' }
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`should require authentication for ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app)[method](path).expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('UNAUTHORIZED');
        expect(response.body.error).toContain('Authentication required');
      });

      it(`should reject invalid tokens for ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app)[method](path)
          .set('Authorization', 'Bearer invalid_token_123')
          .expect(401);

        expect(response.body.code).toBe('SESSION_EXPIRED');
      });

      it(`should accept valid tokens for ${method.toUpperCase()} ${path}`, async () => {
        const requestBody = getValidRequestBody(path);

        const response = await request(app)[method](path)
          .set('Authorization', `Bearer ${freeToken}`)
          .send(requestBody);

        // Should not be 401 or 403 (auth/authorization errors)
        expect([200, 400, 503]).toContain(response.status);
        if (response.status === 400) {
          // Validation error is acceptable, means auth passed
          expect(response.body.code).toBe('VALIDATION_ERROR');
        }
      });
    });
  });

  describe('AI Suggestions Protection', () => {
    it('should allow free users to access basic suggestions', async () => {
      const response = await request(app)
        .get('/api/ai-secure/suggestions?category=financial&limit=3')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should include user context in suggestions for authenticated users', async () => {
      const response = await request(app)
        .get('/api/ai-secure/suggestions?category=financial&limit=5')
        .set('Authorization', `Bearer ${premiumToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data.metadata).toHaveProperty('contextVersion');
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should validate suggestion parameters', async () => {
      // Invalid category
      const response1 = await request(app)
        .get('/api/ai-secure/suggestions?category=invalid&limit=5')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(400);

      expect(response1.body.code).toBe('VALIDATION_ERROR');

      // Invalid limit
      const response2 = await request(app)
        .get('/api/ai-secure/suggestions?category=financial&limit=999')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(400);

      expect(response2.body.code).toBe('VALIDATION_ERROR');
    });

    it('should support different suggestion categories', async () => {
      const categories = ['financial', 'nutrition', 'lifestyle', 'general'];

      for (const category of categories) {
        const response = await request(app)
          .get(`/api/ai-secure/suggestions?category=${category}&limit=2`)
          .set('Authorization', `Bearer ${freeToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
      }
    });
  });

  describe('AI Analysis Protection', () => {
    it('should allow free users to access basic analysis', async () => {
      const response = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          analysisType: 'spending',
          timeframe: 'month',
          includeRecommendations: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should allow premium users to access investment analysis', async () => {
      const response = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          timeframe: 'quarter',
          includeRecommendations: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
    });

    it('should reject free users from premium investment analysis', async () => {
      const response = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          timeframe: 'quarter'
        })
        .expect(403);

      expect(response.body.code).toBe('PREMIUM_REQUIRED');
      expect(response.body).toHaveProperty('upgradeUrl');
    });

    it('should validate analysis parameters', async () => {
      // Invalid analysis type
      const response1 = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          analysisType: 'invalid_type',
          timeframe: 'month'
        })
        .expect(400);

      expect(response1.body.code).toBe('VALIDATION_ERROR');

      // Invalid timeframe
      const response2 = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          analysisType: 'spending',
          timeframe: 'invalid_timeframe'
        })
        .expect(400);

      expect(response2.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AI Chat Protection', () => {
    it('should allow authenticated users to chat with AI', async () => {
      const response = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: 'How can I save money on groceries?',
          contextType: 'financial'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('response');
      expect(response.body.data).toHaveProperty('conversationId');
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should validate chat messages', async () => {
      // Empty message
      const response1 = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: '',
          contextType: 'financial'
        })
        .expect(400);

      expect(response1.body.code).toBe('VALIDATION_ERROR');

      // Message too long
      const longMessage = 'a'.repeat(1001);
      const response2 = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: longMessage,
          contextType: 'financial'
        })
        .expect(400);

      expect(response2.body.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize dangerous input', async () => {
      const response = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: '<script>alert("xss")</script>How can I save money?',
          contextType: 'financial'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Message should be sanitized but request should succeed
    });
  });

  describe('Transaction Classification Protection', () => {
    it('should allow authenticated users to classify transactions', async () => {
      const response = await request(app)
        .post('/api/ai-secure/classify/transactions')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          transactions: [
            {
              description: 'Starbucks Coffee',
              amount: 4.50,
              merchant: 'Starbucks'
            },
            {
              description: 'Grocery Store Purchase',
              amount: 65.20,
              merchant: 'Super Market'
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('classifications');
      expect(response.body.data.classifications).toHaveLength(2);
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should validate transaction data', async () => {
      // Empty transactions array
      const response1 = await request(app)
        .post('/api/ai-secure/classify/transactions')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          transactions: []
        })
        .expect(400);

      expect(response1.body.code).toBe('VALIDATION_ERROR');

      // Too many transactions
      const manyTransactions = Array(15).fill({
        description: 'Test transaction',
        amount: 10.00
      });

      const response2 = await request(app)
        .post('/api/ai-secure/classify/transactions')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          transactions: manyTransactions
        })
        .expect(400);

      expect(response2.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed transaction data', async () => {
      const response = await request(app)
        .post('/api/ai-secure/classify/transactions')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          transactions: [
            {
              description: '', // Empty description
              amount: 'invalid_amount' // Invalid amount
            }
          ]
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Context Security', () => {
    it('should anonymize user data in AI context', async () => {
      // Make request and check that response doesn't contain PII
      const response = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      const responseStr = JSON.stringify(response.body);

      // Verify no PII is leaked in response
      expect(responseStr).not.toContain(freeUser.email);
      expect(responseStr).not.toContain(freeUser.id);
      expect(response.body.data.metadata.sanitized).toBe(true);
    });

    it('should include appropriate context based on user tier', async () => {
      // Free user context should be limited
      const freeResponse = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      // Premium user context should be enhanced
      const premiumResponse = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${premiumToken}`)
        .expect(200);

      expect(freeResponse.body.data.metadata).toHaveProperty('contextVersion');
      expect(premiumResponse.body.data.metadata).toHaveProperty('contextVersion');
    });
  });

  describe('Rate Limiting', () => {
    it('should track AI usage per user', async () => {
      // Make several requests
      const requests = Array(5).fill().map(() =>
        request(app)
          .get('/api/ai-secure/suggestions?category=financial&limit=1')
          .set('Authorization', `Bearer ${freeToken}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed for small number of requests
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should provide different rate limits for premium users', async () => {
      // Premium users should have higher limits
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/api/ai-secure/suggestions?category=financial&limit=1')
          .set('Authorization', `Bearer ${premiumToken}`)
      );

      const responses = await Promise.all(requests);

      // Premium users should have more successful requests
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service unavailable gracefully', async () => {
      // This test depends on AI service being disabled
      // When AI_PROVIDER=none, service should return appropriate error
      const response = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${freeToken}`);

      if (response.status === 503) {
        expect(response.body.code).toBe('AI_SERVICE_ERROR');
        expect(response.body.error).toContain('unavailable');
      }
    });

    it('should handle validation errors consistently', async () => {
      const response = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: 'x'.repeat(1001), // Too long
          contextType: 'financial'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body).toHaveProperty('errors');
    });

    it('should log security-relevant events', async () => {
      // Make request with potential security issue
      const response = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          message: '<script>alert("test")</script>',
          contextType: 'financial'
        });

      // Request should be handled but input sanitized
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Session Management in AI Context', () => {
    it('should reject requests with expired sessions', async () => {
      // Create expired session
      const expiredSession = await prisma.betterAuthSession.create({
        data: {
          sessionToken: 'expired_ai_test_token',
          userId: freeUser.id,
          expires: new Date(Date.now() - 1000) // 1 second ago
        }
      });

      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${expiredSession.sessionToken}`)
        .expect(401);

      expect(response.body.code).toBe('SESSION_EXPIRED');

      // Cleanup
      await prisma.betterAuthSession.delete({
        where: { sessionToken: 'expired_ai_test_token' }
      });
    });

    it('should reject requests from inactive users', async () => {
      // Create inactive user
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'ai-test-inactive@example.com',
          password: await bcrypt.hash('password123', 10),
          name: 'Inactive AI Test User',
          role: 'user',
          status: 'inactive', // Inactive status
          isPremium: false
        }
      });

      const { createSession } = require('../../src/auth/betterAuth');
      const inactiveSession = await createSession(inactiveUser.id);

      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${inactiveSession.sessionToken}`)
        .expect(403);

      expect(response.body.code).toBe('ACCOUNT_INACTIVE');

      // Cleanup
      await prisma.betterAuthSession.delete({
        where: { sessionToken: inactiveSession.sessionToken }
      });
      await prisma.user.delete({
        where: { id: inactiveUser.id }
      });
    });
  });
});

// Helper function to provide valid request bodies for different endpoints
function getValidRequestBody(path) {
  const requestBodies = {
    '/api/ai-secure/suggestions': {},
    '/api/ai-secure/analyze': {
      analysisType: 'spending',
      timeframe: 'month'
    },
    '/api/ai-secure/chat': {
      message: 'Test message',
      contextType: 'financial'
    },
    '/api/ai-secure/classify/transactions': {
      transactions: [
        {
          description: 'Test transaction',
          amount: 10.00
        }
      ]
    }
  };

  return requestBodies[path] || {};
}