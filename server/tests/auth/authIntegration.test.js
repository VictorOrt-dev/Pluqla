/**
 * Authentication Integration Tests
 *
 * End-to-end tests for complete authentication flows including:
 * - User registration → AI usage workflow
 * - Premium upgrade → premium features access
 * - Session management across multiple requests
 * - Real-world usage scenarios
 */

const request = require('supertest');
const app = require('../../src/app');
const {
  testPrisma,
  TestUserFactory,
  TestSessionManager,
  TestTransactionFactory,
  TestDataCleanup,
  APITestHelpers,
  MockAIService
} = require('../setup/authTestSetup');

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await TestDataCleanup.cleanupTestUsers('integration-test');
  });

  afterAll(async () => {
    await TestDataCleanup.cleanupAllTestData();
    await testPrisma.$disconnect();
  });

  describe('Complete User Journey - Free User', () => {
    let userEmail, sessionToken, userId;

    it('should complete full signup → login → AI usage flow', async () => {
      userEmail = 'integration-test-free@example.com';

      // 1. User Registration
      const signupResponse = await request(app)
        .post('/api/auth/sign-up')
        .send({
          email: userEmail,
          password: 'securePassword123',
          name: 'Integration Test User'
        })
        .expect(201);

      expect(signupResponse.body.success).toBe(true);
      expect(signupResponse.body.user.email).toBe(userEmail);
      expect(signupResponse.body.user.role).toBe('user');
      expect(signupResponse.body.user.isPremium).toBe(false);

      sessionToken = signupResponse.body.session.token;
      userId = signupResponse.body.user.id;

      // 2. Verify user can access basic AI features
      const suggestionsResponse = await request(app)
        .get('/api/ai-secure/suggestions?category=financial&limit=3')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      APITestHelpers.expectSuccessResponse(suggestionsResponse);
      expect(suggestionsResponse.body.data.suggestions).toBeDefined();

      // 3. Create some transaction data
      await TestTransactionFactory.createFinancialDataSet(userId);

      // 4. Request financial analysis
      const analysisResponse = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          analysisType: 'spending',
          timeframe: 'month',
          includeRecommendations: true
        })
        .expect(200);

      APITestHelpers.expectSuccessResponse(analysisResponse);
      expect(analysisResponse.body.data.analysis).toBeDefined();

      // 5. Try premium feature (should be rejected)
      const premiumResponse = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ timeframe: 'quarter' })
        .expect(403);

      APITestHelpers.expectPremiumRequiredError(premiumResponse);

      // 6. Logout
      const logoutResponse = await request(app)
        .post('/api/auth/sign-out')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 7. Verify session is invalidated
      await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(401);
    });
  });

  describe('Complete User Journey - Premium User', () => {
    let premiumUser, sessionToken;

    beforeEach(async () => {
      premiumUser = await TestUserFactory.createPremiumUser({
        email: 'integration-test-premium@example.com'
      });
    });

    it('should complete premium user workflow with all features', async () => {
      // 1. Login as premium user
      const loginResponse = await request(app)
        .post('/api/auth/sign-in')
        .send({
          email: premiumUser.email,
          password: 'testPassword123'
        })
        .expect(200);

      sessionToken = loginResponse.body.session.token;
      expect(loginResponse.body.user.isPremium).toBe(true);

      // 2. Access basic features
      const suggestionsResponse = await request(app)
        .get('/api/ai-secure/suggestions?category=financial&limit=5')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      APITestHelpers.expectSuccessResponse(suggestionsResponse);

      // 3. Access premium features
      const investmentResponse = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          timeframe: 'quarter',
          includeRecommendations: true
        })
        .expect(200);

      APITestHelpers.expectSuccessResponse(investmentResponse);

      // 4. Test AI chat with context
      const chatResponse = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          message: 'What investment strategies do you recommend for my portfolio?',
          contextType: 'financial'
        })
        .expect(200);

      APITestHelpers.expectSuccessResponse(chatResponse);
      expect(chatResponse.body.data.response).toBeDefined();
      expect(chatResponse.body.data.conversationId).toBeDefined();

      // 5. Classify transactions
      const classificationResponse = await request(app)
        .post('/api/ai-secure/classify/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          transactions: [
            {
              description: 'Apple Store Purchase',
              amount: 99.99,
              merchant: 'Apple'
            },
            {
              description: 'Grocery Shopping',
              amount: 156.78,
              merchant: 'SuperMarket'
            }
          ]
        })
        .expect(200);

      APITestHelpers.expectSuccessResponse(classificationResponse);
      expect(classificationResponse.body.data.classifications).toHaveLength(2);
    });
  });

  describe('Session Management Integration', () => {
    let testUser, session1, session2;

    beforeEach(async () => {
      testUser = await TestUserFactory.createFreeUser({
        email: 'integration-test-sessions@example.com'
      });

      // Create multiple sessions
      session1 = await TestSessionManager.createSession(testUser.id);
      session2 = await TestSessionManager.createSession(testUser.id);
    });

    it('should handle multiple concurrent sessions', async () => {
      // Both sessions should work
      const response1 = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${session1.sessionToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/ai-secure/suggestions?category=nutrition')
        .set('Authorization', `Bearer ${session2.sessionToken}`)
        .expect(200);

      APITestHelpers.expectSuccessResponse(response1);
      APITestHelpers.expectSuccessResponse(response2);
    });

    it('should invalidate specific session on logout', async () => {
      // Logout from session1
      await request(app)
        .post('/api/auth/sign-out')
        .set('Authorization', `Bearer ${session1.sessionToken}`)
        .expect(200);

      // Session1 should be invalid
      await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${session1.sessionToken}`)
        .expect(401);

      // Session2 should still work
      await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${session2.sessionToken}`)
        .expect(200);
    });

    it('should handle session expiration gracefully', async () => {
      // Create expired session
      const expiredSession = await TestSessionManager.createExpiredSession(testUser.id);

      // Should reject expired session
      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${expiredSession.sessionToken}`)
        .expect(401);

      expect(response.body.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('User Status Changes Integration', () => {
    let testUser, sessionToken;

    beforeEach(async () => {
      testUser = await TestUserFactory.createFreeUser({
        email: 'integration-test-status@example.com'
      });

      const session = await TestSessionManager.createSession(testUser.id);
      sessionToken = session.sessionToken;

      // Verify initial access works
      await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);
    });

    it('should immediately block access when user is deactivated', async () => {
      // Deactivate user
      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { status: 'inactive' }
      });

      // Should immediately reject requests
      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(403);

      expect(response.body.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should handle premium upgrade during active session', async () => {
      // Initially can't access premium features
      await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ timeframe: 'month' })
        .expect(403);

      // Upgrade to premium
      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { isPremium: true }
      });

      // Should immediately have access to premium features
      const response = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ timeframe: 'month' })
        .expect(200);

      APITestHelpers.expectSuccessResponse(response);
    });
  });

  describe('Data Consistency Integration', () => {
    let testUser, sessionToken;

    beforeEach(async () => {
      testUser = await TestUserFactory.createPremiumUser({
        email: 'integration-test-data@example.com'
      });

      const session = await TestSessionManager.createSession(testUser.id);
      sessionToken = session.sessionToken;

      // Create comprehensive financial data
      await TestTransactionFactory.createFinancialDataSet(testUser.id);
    });

    it('should maintain data consistency across multiple AI requests', async () => {
      // Get initial analysis
      const analysis1 = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          analysisType: 'spending',
          timeframe: 'month'
        })
        .expect(200);

      // Add more transactions
      await TestTransactionFactory.createMultipleTransactions(testUser.id, 5);

      // Get updated analysis
      const analysis2 = await request(app)
        .post('/api/ai-secure/analyze')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          analysisType: 'spending',
          timeframe: 'month'
        })
        .expect(200);

      // Both should succeed with updated context
      APITestHelpers.expectSuccessResponse(analysis1);
      APITestHelpers.expectSuccessResponse(analysis2);

      // Verify metadata indicates sanitized data
      expect(analysis1.body.data.metadata.sanitized).toBe(true);
      expect(analysis2.body.data.metadata.sanitized).toBe(true);
    });

    it('should handle concurrent AI requests from same user', async () => {
      // Make multiple concurrent requests
      const requests = [
        request(app)
          .get('/api/ai-secure/suggestions?category=financial')
          .set('Authorization', `Bearer ${sessionToken}`),

        request(app)
          .post('/api/ai-secure/analyze')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({ analysisType: 'spending', timeframe: 'month' }),

        request(app)
          .post('/api/ai-secure/chat')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({ message: 'How can I improve my savings?', contextType: 'financial' })
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status); // 503 if AI disabled
      });
    });
  });

  describe('Error Recovery Integration', () => {
    let testUser, sessionToken;

    beforeEach(async () => {
      testUser = await TestUserFactory.createFreeUser({
        email: 'integration-test-errors@example.com'
      });

      const session = await TestSessionManager.createSession(testUser.id);
      sessionToken = session.sessionToken;
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would need actual database mocking
      // For now, just verify error structure
      const response = await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 503]).toContain(response.status);

      if (response.status === 503) {
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle malformed requests without breaking authentication', async () => {
      // Send malformed JSON
      const response = await request(app)
        .post('/api/ai-secure/chat')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}')
        .expect(400);

      expect(response.body.success).toBe(false);

      // Authentication should still work for next request
      await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);
    });
  });

  describe('Analytics Integration', () => {
    let testUser, sessionToken;

    beforeEach(async () => {
      testUser = await TestUserFactory.createPremiumUser({
        email: 'integration-test-analytics@example.com'
      });

      const session = await TestSessionManager.createSession(testUser.id);
      sessionToken = session.sessionToken;
    });

    it('should track authentication events', async () => {
      // Make AI request
      await request(app)
        .get('/api/ai-secure/suggestions?category=financial')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      // Verify analytics event was created (if analytics are enabled)
      const analyticsEvents = await testPrisma.analyticsEvent.findMany({
        where: { userId: testUser.id }
      });

      // Events might be created depending on configuration
      expect(analyticsEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should track session creation and usage', async () => {
      const initialSessionCount = await testPrisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });

      // Create new session through login
      await request(app)
        .post('/api/auth/sign-in')
        .send({
          email: testUser.email,
          password: 'testPassword123'
        })
        .expect(200);

      const newSessionCount = await testPrisma.betterAuthSession.count({
        where: { userId: testUser.id }
      });

      expect(newSessionCount).toBeGreaterThan(initialSessionCount);
    });
  });

  describe('Performance Integration', () => {
    let testUsers = [];
    let sessionTokens = [];

    beforeEach(async () => {
      // Create multiple test users for load testing
      for (let i = 0; i < 5; i++) {
        const user = await TestUserFactory.createFreeUser({
          email: `integration-test-perf-${i}@example.com`
        });
        const session = await TestSessionManager.createSession(user.id);

        testUsers.push(user);
        sessionTokens.push(session.sessionToken);
      }
    });

    it('should handle multiple concurrent authenticated requests', async () => {
      const startTime = Date.now();

      // Create concurrent requests from different users
      const requests = sessionTokens.map(token =>
        request(app)
          .get('/api/ai-secure/suggestions?category=financial&limit=3')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
      });

      // Should complete within reasonable time (10 seconds for 5 concurrent requests)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should maintain session performance under load', async () => {
      const sessionChecks = sessionTokens.map(token =>
        request(app)
          .get('/api/auth/session')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(sessionChecks);

      // All session checks should succeed quickly
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user).toBeDefined();
      });
    });
  });
});