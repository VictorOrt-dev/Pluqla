const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Test helper functions for financial dashboard tests
 */

/**
 * Create a test user for testing purposes
 */
async function createTestUser(overrides = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: await bcrypt.hash('testpassword123', 10),
    status: 'active',
    emailVerified: true,
    ...overrides
  };

  try {
    const user = await prisma.user.create({
      data: defaultUser
    });

    return user;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

/**
 * Generate a JWT token for test authentication
 */
function generateAuthToken(userId) {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret';

  return jwt.sign(
    {
      userId,
      type: 'access'
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Create test financial data for a user
 */
async function createTestFinancialData(userId) {
  try {
    // Create test accounts
    const accounts = await prisma.account.createMany({
      data: [
        {
          userId,
          name: 'Test Checking Account',
          type: 'checking',
          provider: 'manual',
          balance: 2500,
          currency: 'EUR'
        },
        {
          userId,
          name: 'Test Savings Account',
          type: 'savings',
          provider: 'manual',
          balance: 15000,
          currency: 'EUR'
        }
      ]
    });

    // Get created accounts
    const createdAccounts = await prisma.account.findMany({
      where: { userId }
    });

    // Create test assets
    const assets = await prisma.asset.createMany({
      data: [
        {
          userId,
          accountId: createdAccounts[0].id,
          name: 'Apple Inc.',
          type: 'stock',
          symbol: 'AAPL',
          quantity: 10,
          unitValue: 150,
          totalValue: 1500,
          currency: 'USD'
        },
        {
          userId,
          name: 'Bitcoin',
          type: 'crypto',
          symbol: 'BTC-EUR',
          quantity: 0.1,
          unitValue: 35000,
          totalValue: 3500,
          currency: 'EUR'
        }
      ]
    });

    // Create test liabilities
    const liabilities = await prisma.liability.createMany({
      data: [
        {
          userId,
          accountId: createdAccounts[0].id,
          name: 'Student Loan',
          type: 'personal_loan',
          balance: 25000,
          interestRate: 4.5,
          monthlyPayment: 300,
          currency: 'EUR'
        }
      ]
    });

    // Create test financial goals
    const goals = await prisma.financialGoal.createMany({
      data: [
        {
          userId,
          name: 'Emergency Fund',
          type: 'emergency_fund',
          targetAmount: 20000,
          currentAmount: 8000,
          priority: 'high',
          status: 'active'
        },
        {
          userId,
          name: 'Vacation Fund',
          type: 'savings',
          targetAmount: 5000,
          currentAmount: 1200,
          priority: 'medium',
          status: 'active'
        }
      ]
    });

    return {
      accounts: createdAccounts,
      assetsCount: 2,
      liabilitiesCount: 1,
      goalsCount: 2
    };
  } catch (error) {
    console.error('Failed to create test financial data:', error);
    throw error;
  }
}

/**
 * Create test user consent records
 */
async function createTestConsent(userId, consentType = 'financial_aggregation', granted = true) {
  try {
    const consent = await prisma.userConsent.create({
      data: {
        userId,
        consentType,
        purpose: `Test consent for ${consentType}`,
        legalBasis: 'consent',
        granted,
        grantedAt: granted ? new Date() : null,
        withdrawnAt: !granted ? new Date() : null,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Suite',
        version: '1.0'
      }
    });

    return consent;
  } catch (error) {
    console.error('Failed to create test consent:', error);
    throw error;
  }
}

/**
 * Create test transactions for an account
 */
async function createTestTransactions(accountId, count = 5) {
  const categories = ['alimentation', 'deplacement', 'habits', 'activite'];
  const descriptions = [
    'Supermarket purchase',
    'Bus ticket',
    'Coffee shop',
    'Gym membership',
    'Restaurant dinner'
  ];

  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push({
      accountId,
      amount: -(Math.random() * 100 + 10), // Random expense between 10-110
      description: descriptions[i % descriptions.length],
      category: categories[i % categories.length],
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // i days ago
      type: 'debit',
      status: 'posted'
    });
  }

  return await prisma.accountTransaction.createMany({
    data: transactions
  });
}

/**
 * Clean up all test data for a user
 */
async function cleanupTestData(userId) {
  try {
    // Clean up in correct order due to foreign key constraints

    // Delete account transactions first
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true }
    });

    for (const account of accounts) {
      await prisma.accountTransaction.deleteMany({
        where: { accountId: account.id }
      });
    }

    // Delete financial related data
    await prisma.asset.deleteMany({ where: { userId } });
    await prisma.liability.deleteMany({ where: { userId } });
    await prisma.income.deleteMany({ where: { userId } });
    await prisma.financialGoal.deleteMany({ where: { userId } });
    await prisma.netWorthSnapshot.deleteMany({ where: { userId } });

    // Delete accounts
    await prisma.account.deleteMany({ where: { userId } });

    // Delete GDPR related data
    await prisma.userConsent.deleteMany({ where: { userId } });
    await prisma.dataProcessingLog.deleteMany({ where: { userId } });
    await prisma.securityIncident.deleteMany({ where: { userId } });

    // Delete user-specific data
    await prisma.userAnswer.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } }); // Ajout des comptes
    await prisma.userBadge.deleteMany({ where: { userId } });
    await prisma.dailyChallenge.deleteMany({ where: { userId } });
    await prisma.favoriteRecipe.deleteMany({ where: { userId } });
    await prisma.analyticsEvent.deleteMany({ where: { userId } });
    await prisma.cacheEntry.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    console.log(`Cleaned up test data for user: ${userId}`);
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    // Don't throw error during cleanup to avoid breaking other tests
  }
}

/**
 * Create mock OAuth state for testing
 */
function createMockOAuthState(userId) {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${userId}:${timestamp}:${random}`).digest('hex');
  return `${timestamp}:${hash}`;
}

/**
 * Create test rate limiting store
 */
function createTestRateLimitStore() {
  const store = new Map();

  return {
    get: (key) => store.get(key),
    set: (key, value, ttl) => {
      store.set(key, value);
      if (ttl) {
        setTimeout(() => store.delete(key), ttl * 1000);
      }
    },
    delete: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

/**
 * Mock external API responses
 */
const mockApiResponses = {
  bridgeAccounts: {
    resources: [
      {
        id: 'bridge_test_account_1',
        name: 'Compte Courant Test',
        type: 'checking',
        balance: 1500.50,
        currency_code: 'EUR',
        bank: { name: 'Test Bank' },
        iban: 'FR7612345678901234567890'
      }
    ]
  },

  budgetInsightAccounts: {
    accounts: [
      {
        id: 12345,
        name: 'Compte Test BI',
        type: 'bank',
        balance: 250000, // In cents
        currency: { symbol: 'EUR' },
        bank: { name: 'Budget Insight Test Bank' }
      }
    ]
  },

  tinkAccounts: {
    accounts: [
      {
        id: 'tink_test_account_1',
        name: 'Test Sparkonto',
        type: 'SAVINGS',
        balance: 10000.00,
        currencyCode: 'SEK',
        financialInstitutionId: 'test_bank'
      }
    ]
  }
};

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  // Ensure test database is clean
  console.log('Setting up test environment...');

  // You might want to truncate all tables here for isolated tests
  // Be very careful with this in production!

  return true;
}

/**
 * Teardown test environment
 */
async function teardownTestEnvironment() {
  try {
    await prisma.$disconnect();
    console.log('Test environment cleaned up.');
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
  }
}

module.exports = {
  createTestUser,
  generateAuthToken,
  createTestFinancialData,
  createTestConsent,
  createTestTransactions,
  cleanupTestData,
  createMockOAuthState,
  createTestRateLimitStore,
  mockApiResponses,
  setupTestEnvironment,
  teardownTestEnvironment,
  prisma
};