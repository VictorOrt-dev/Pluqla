/**
 * Authentication Test Setup
 *
 * Common setup utilities for Better Auth testing including:
 * - Test database configuration
 * - Mock user creation
 * - Session management
 * - Test data cleanup
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Test database configuration
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:test@localhost:5432/pluqla_test'
    }
  }
});

/**
 * Test User Factory
 */
class TestUserFactory {
  static async createUser(overrides = {}) {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: await bcrypt.hash('testPassword123', 10),
      name: 'Test User',
      role: 'user',
      status: 'active',
      isPremium: false,
      emailVerified: true,
      savedAmount: 0,
      monthlyGoal: 800,
      streak: 0,
      level: 1,
      plansUsedThisMonth: 0,
      gamificationPoints: 0
    };

    const userData = { ...defaultUser, ...overrides };

    return await testPrisma.user.create({
      data: userData
    });
  }

  static async createFreeUser(overrides = {}) {
    return this.createUser({
      isPremium: false,
      role: 'user',
      ...overrides
    });
  }

  static async createPremiumUser(overrides = {}) {
    return this.createUser({
      isPremium: true,
      role: 'user',
      savedAmount: 1000,
      monthlyGoal: 2000,
      level: 5,
      gamificationPoints: 500,
      ...overrides
    });
  }

  static async createAdminUser(overrides = {}) {
    return this.createUser({
      isPremium: true,
      role: 'admin',
      savedAmount: 5000,
      monthlyGoal: 10000,
      level: 10,
      gamificationPoints: 2500,
      ...overrides
    });
  }

  static async createInactiveUser(overrides = {}) {
    return this.createUser({
      status: 'inactive',
      ...overrides
    });
  }

  static async createSuspendedUser(overrides = {}) {
    return this.createUser({
      status: 'suspended',
      ...overrides
    });
  }
}

/**
 * Session Management for Tests
 */
class TestSessionManager {
  static async createSession(userId, expiresIn = 7 * 24 * 60 * 60 * 1000) {
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + expiresIn);

    return await testPrisma.betterAuthSession.create({
      data: {
        sessionToken,
        userId,
        expires
      },
      include: {
        user: true
      }
    });
  }

  static async createExpiredSession(userId) {
    return this.createSession(userId, -1000); // Expired 1 second ago
  }

  static async destroySession(sessionToken) {
    await testPrisma.betterAuthSession.delete({
      where: { sessionToken }
    });
  }

  static async destroyAllUserSessions(userId) {
    await testPrisma.betterAuthSession.deleteMany({
      where: { userId }
    });
  }
}

/**
 * Test Transaction Factory
 */
class TestTransactionFactory {
  static async createTransaction(userId, overrides = {}) {
    const defaultTransaction = {
      userId,
      amount: 25.50,
      category: 'alimentation',
      description: 'Test transaction',
      type: 'saving',
      date: new Date()
    };

    const transactionData = { ...defaultTransaction, ...overrides };

    return await testPrisma.transaction.create({
      data: transactionData
    });
  }

  static async createMultipleTransactions(userId, count = 5, overrides = {}) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
      const transaction = await this.createTransaction(userId, {
        description: `Test transaction ${i + 1}`,
        amount: Math.random() * 100,
        ...overrides
      });
      transactions.push(transaction);
    }

    return transactions;
  }

  static async createFinancialDataSet(userId) {
    const categories = ['alimentation', 'transport', 'habits', 'activite'];
    const transactions = [];

    for (const category of categories) {
      for (let i = 0; i < 3; i++) {
        const transaction = await this.createTransaction(userId, {
          category,
          amount: Math.random() * 50 + 10,
          description: `${category} transaction ${i + 1}`
        });
        transactions.push(transaction);
      }
    }

    return transactions;
  }
}

/**
 * Test Data Cleanup
 */
class TestDataCleanup {
  static async cleanupTestUsers(emailPattern = 'test') {
    await testPrisma.betterAuthSession.deleteMany({
      where: {
        user: {
          email: {
            contains: emailPattern
          }
        }
      }
    });

    await testPrisma.transaction.deleteMany({
      where: {
        user: {
          email: {
            contains: emailPattern
          }
        }
      }
    });

    await testPrisma.user.deleteMany({
      where: {
        email: {
          contains: emailPattern
        }
      }
    });
  }

  static async cleanupAllTestData() {
    // Clean up all test data in correct order due to foreign key constraints
    await testPrisma.betterAuthSession.deleteMany();
    await testPrisma.transaction.deleteMany();
    await testPrisma.analyticsEvent.deleteMany();
    await testPrisma.cacheEntry.deleteMany();

    // Clean up users last
    await testPrisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
  }

  static async cleanupExpiredSessions() {
    await testPrisma.betterAuthSession.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });
  }
}

/**
 * API Test Helpers
 */
class APITestHelpers {
  static createAuthHeaders(sessionToken) {
    return {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    };
  }

  static createRequestWithAuth(request, sessionToken) {
    return request.set(this.createAuthHeaders(sessionToken));
  }

  static expectAuthError(response, errorCode = 'UNAUTHORIZED') {
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe(errorCode);
    expect(response.body).toHaveProperty('error');
  }

  static expectValidationError(response) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body).toHaveProperty('errors');
  }

  static expectSuccessResponse(response) {
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('data');
  }

  static expectRateLimitError(response) {
    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
  }

  static expectPremiumRequiredError(response) {
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PREMIUM_REQUIRED');
    expect(response.body).toHaveProperty('upgradeUrl');
  }
}

/**
 * Mock AI Service for Testing
 */
class MockAIService {
  static mockSuccessResponse(data) {
    return {
      success: true,
      data,
      metadata: {
        provider: 'mock',
        sanitized: true
      }
    };
  }

  static mockErrorResponse(message = 'AI service error') {
    return {
      success: false,
      message,
      metadata: {
        provider: 'mock'
      }
    };
  }

  static mockSuggestions(count = 3) {
    const suggestions = [];
    for (let i = 0; i < count; i++) {
      suggestions.push({
        id: `suggestion_${i + 1}`,
        title: `Test Suggestion ${i + 1}`,
        description: `This is a test suggestion for saving money`,
        category: 'financial',
        impact: 'medium',
        estimatedSaving: Math.random() * 50 + 10
      });
    }

    return this.mockSuccessResponse({ suggestions });
  }

  static mockAnalysis(analysisType = 'spending') {
    const analysis = {
      type: analysisType,
      summary: `Test ${analysisType} analysis`,
      insights: [
        `Your ${analysisType} patterns show room for improvement`,
        'Consider implementing the suggested changes'
      ],
      recommendations: [
        'Reduce unnecessary expenses',
        'Increase monthly savings goal'
      ],
      metrics: {
        totalAmount: 500,
        averageTransaction: 25,
        categoryBreakdown: {
          alimentation: 200,
          transport: 150,
          habits: 100,
          activite: 50
        }
      }
    };

    return this.mockSuccessResponse({ analysis });
  }

  static mockClassification(transactions) {
    const classifications = transactions.map((transaction, index) => ({
      originalTransaction: {
        description: transaction.description.substring(0, 50),
        amount: Math.round(Math.abs(transaction.amount || 0))
      },
      classification: {
        category: ['alimentation', 'transport', 'habits'][index % 3],
        confidence: 0.85 + Math.random() * 0.1,
        subcategory: 'general'
      },
      error: null
    }));

    return this.mockSuccessResponse({ classifications });
  }

  static mockChatResponse(message) {
    return this.mockSuccessResponse({
      response: `This is a mock response to: "${message}"`,
      conversationId: `conv_${Date.now()}`,
      contextUsed: true
    });
  }
}

/**
 * Environment Setup for Tests
 */
function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AI_PROVIDER = 'none'; // Disable AI for most tests
  process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute for faster testing
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';

  // Mock console methods to reduce test noise
  if (process.env.SILENT_TESTS === 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
}

/**
 * Global Test Hooks
 */
function setupGlobalTestHooks() {
  beforeAll(() => {
    setupTestEnvironment();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await TestDataCleanup.cleanupTestUsers();
  });

  afterAll(async () => {
    // Clean up all test data after all tests
    await TestDataCleanup.cleanupAllTestData();
    await testPrisma.$disconnect();
  });
}

module.exports = {
  testPrisma,
  TestUserFactory,
  TestSessionManager,
  TestTransactionFactory,
  TestDataCleanup,
  APITestHelpers,
  MockAIService,
  setupTestEnvironment,
  setupGlobalTestHooks
};