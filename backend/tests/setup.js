// Configuration Jest pour les tests
require('dotenv').config({ path: '.env.test' });

const { PrismaClient } = require('@prisma/client');

// Configuration de la base de données de test
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

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

// Configuration Prisma pour les tests
const prisma = new PrismaClient();

// Configuration globale des tests
beforeAll(async () => {
  // Initialiser la base de données de test
  await prisma.$connect();
});

afterAll(async () => {
  // Nettoyer la base de données après tous les tests
  try {
    await prisma.$executeRaw`DELETE FROM accounts`;
    await prisma.$executeRaw`DELETE FROM assets`;
    await prisma.$executeRaw`DELETE FROM liabilities`;
    await prisma.$executeRaw`DELETE FROM expenses`;
    await prisma.$executeRaw`DELETE FROM users`;
    await prisma.$executeRaw`DELETE FROM transactions`;
    await prisma.$executeRaw`DELETE FROM user_answers`;
    await prisma.$executeRaw`DELETE FROM analytics_events`;
  } catch (error) {
    console.warn('Some tables might not exist during cleanup:', error.message);
  }
  await prisma.$disconnect();

  // Clear global stores
  if (global.pkceStore) {
    global.pkceStore.clear();
  }
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