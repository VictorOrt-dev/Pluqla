/**
 * Jest Test Setup - FIXED VERSION
 *
 * ✅ FIXED: Uses singleton Prisma client instead of creating new instance
 * ✅ FIXED: Proper connection cleanup to prevent leaks
 * ✅ FIXED: Test environment configuration
 */

// Configuration Jest pour les tests
require('dotenv').config({ path: '.env.test' });

// ✅ FIXED: Use singleton Prisma client instead of new PrismaClient()
const { prisma, disconnectPrisma, __resetInstance } = require('../src/lib/prisma');

// Configuration de la base de données de test
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Optimize for testing
process.env.DB_CONNECTION_LIMIT = '3';
process.env.DB_POOL_TIMEOUT = '5';
process.env.DB_STATEMENT_TIMEOUT = '10000';

// Mock des APIs externes
jest.mock('../src/services/aiService', () => ({
  getSuggestions: jest.fn().mockResolvedValue([
    {
      id: 'mock-suggestion-1',
      title: 'Test suggestion',
      description: 'Mock suggestion for testing',
      category: 'alimentation',
      estimatedSavings: 50
    }
  ]),
  analyzeImage: jest.fn().mockResolvedValue({
    type: 'clothing',
    description: 'Mock analysis',
    suggestions: ['Mock suggestion']
  })
}));

jest.mock('../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

// Configuration globale des tests - FIXED VERSION
beforeAll(async () => {
  // ✅ FIXED: Prisma singleton handles connection automatically
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // ✅ FIXED: Proper cleanup to prevent connection leaks
  try {
    console.log('🧹 Cleaning up test data...');

    // Clean test data using Prisma deleteMany (safer than raw SQL)
    const cleanupTasks = [
      () => prisma.analyticsEvent.deleteMany(),
      () => prisma.transaction.deleteMany(),
      () => prisma.userAnswer.deleteMany(),
      () => prisma.refreshToken.deleteMany(),
      () => prisma.expense?.deleteMany?.(),
      () => prisma.account?.deleteMany?.(),
      () => prisma.asset?.deleteMany?.(),
      () => prisma.liability?.deleteMany?.(),
      () => prisma.user.deleteMany(),
    ];

    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (error) {
        // Some models might not exist, ignore errors
        if (process.env.VERBOSE_TESTS) {
          console.warn(`Cleanup task failed:`, error.message);
        }
      }
    }

    console.log('✅ Test data cleaned');

  } catch (error) {
    console.warn('⚠️ Some test cleanup operations failed:', error.message);
  }

  // ✅ FIXED: Proper Prisma disconnect using singleton method
  try {
    await disconnectPrisma();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.warn('⚠️ Prisma disconnect warning:', error.message);
  }

  // Clear global stores
  if (global.pkceStore) {
    global.pkceStore.clear();
  }

  // Reset Prisma instance for clean slate
  __resetInstance();
});

beforeEach(async () => {
  // Nettoyer les données avant chaque test
  await prisma.analyticsEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.userAnswer.deleteMany();
  await prisma.user.deleteMany();

  // Clear global stores
  if (global.pkceStore) {
    global.pkceStore.clear();
  }
});

// Données de test communes
global.testData = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123',
    name: 'Test User'
  },
  validTransaction: {
    amount: 25.50,
    category: 'alimentation',
    description: 'Économie supermarché'
  },
  validAnswers: [
    { key: 'age', value: '25-34' },
    { key: 'mainSpending', value: 'alimentation' },
    { key: 'savingsGoal', value: '500' }
  ]
};

// Fonctions utilitaires pour les tests
global.testUtils = {
  // Créer un utilisateur de test
  createTestUser: async (userData = {}) => {
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: {
        email: userData.email || global.testData.validUser.email,
        password: await bcrypt.hash(userData.password || global.testData.validUser.password, 12),
        name: userData.name || global.testData.validUser.name,
        ...userData
      }
    });
    return user;
  },

  // Créer une transaction de test
  createTestTransaction: async (userId, transactionData = {}) => {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: transactionData.amount || global.testData.validTransaction.amount,
        category: transactionData.category || global.testData.validTransaction.category,
        description: transactionData.description || global.testData.validTransaction.description,
        ...transactionData
      }
    });
    return transaction;
  },

  // Générer un token JWT de test
  generateTestToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // Créer des réponses au questionnaire de test
  createTestAnswers: async (userId, answers = []) => {
    const answersData = answers.length > 0 ? answers : global.testData.validAnswers;
    const createdAnswers = [];

    for (const answer of answersData) {
      const created = await prisma.userAnswer.create({
        data: {
          userId,
          key: answer.key,
          value: answer.value
        }
      });
      createdAnswers.push(created);
    }

    return createdAnswers;
  },

  // Nettoyer les données d'un utilisateur spécifique
  cleanupUser: async (userId) => {
    await prisma.analyticsEvent.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.userAnswer.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
};

// Configuration des timeouts pour les tests
jest.setTimeout(10000);

// Mock console.log en mode test pour réduire le bruit
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
  };
}