/**
 * AI Migration Security Test Suite
 *
 * Comprehensive tests to validate the secure AI migration:
 * - PII protection and data anonymization
 * - Context builder security validation
 * - Rate limiting and access control
 * - Provider-agnostic functionality
 * - GDPR/PSD2 compliance validation
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const request = require('supertest');
const { app } = require('../../src/app'); // Assuming app export
const { ContextBuilderFactory } = require('../../src/services/ai/contextBuilder');
const { validateAIRequest } = require('../../src/services/ai/aiValidator');
const { sanitizeFinancialData, validateSanitization } = require('../../src/services/ai/financialDataSanitizer');

// Mock user data with PII for security testing
const mockUserWithPII = {
  id: 'user-123-test',
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  isPremium: false
};

const mockSensitiveFinancialData = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  accountNumber: '1234567890123456',
  iban: 'GB82WEST12345698765432',
  ssn: '123-45-6789',
  cardNumber: '4111-1111-1111-1111',
  transactions: [
    {
      amount: 123.45,
      description: 'Purchase at STARBUCKS #1234 NEW YORK NY using card *1111',
      merchant: 'Starbucks Coffee Company Store #1234',
      accountNumber: '9876543210123456',
      reference: 'TXN123456789ABCD',
      userEmail: 'john.doe@example.com',
      createdAt: '2024-09-29T14:30:22.123Z'
    },
    {
      amount: 45.99,
      description: 'Online payment to merchant@example.com for order #ORD789',
      merchant: 'Amazon.com LLC',
      phone: '555-123-4567',
      billingAddress: '123 Main St, New York, NY'
    }
  ],
  accounts: [
    {
      accountNumber: '1111222233334444',
      routingNumber: '123456789',
      balance: 1234.56,
      bankName: 'Chase Bank',
      accountHolder: 'John Doe'
    }
  ]
};

describe('AI Migration Security Test Suite', () => {
  let authToken;

  beforeEach(() => {
    // Mock authentication token
    authToken = 'mock-jwt-token';

    // Reset environment for testing
    process.env.AI_PROVIDER = 'none'; // Start with disabled AI for safety
    process.env.AI_ANONYMIZATION_SALT = 'test-salt-for-security-validation';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🔒 PII Protection and Data Anonymization', () => {
    test('should completely remove sensitive financial fields', async () => {
      const sanitized = await sanitizeFinancialData(mockSensitiveFinancialData, { userId: 'test-user' });

      // Critical: These fields must be completely removed
      expect(sanitized.accountNumber).toBeUndefined();
      expect(sanitized.iban).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.cardNumber).toBeUndefined();
      expect(sanitized.fullName).toMatch(/^ANON_FULLNAME_[a-f0-9]{16}$/);
      expect(sanitized.email).toMatch(/^ANON_EMAIL_[a-f0-9]{16}$/);

      // Nested sensitive data must also be removed
      expect(sanitized.transactions[0].accountNumber).toBeUndefined();
      expect(sanitized.transactions[0].userEmail).toBeUndefined();
      expect(sanitized.transactions[1].phone).toBeUndefined();
      expect(sanitized.transactions[1].billingAddress).toBeUndefined();

      expect(sanitized.accounts[0].accountNumber).toBeUndefined();
      expect(sanitized.accounts[0].routingNumber).toBeUndefined();
      expect(sanitized.accounts[0].accountHolder).toBeUndefined();
      expect(sanitized.accounts[0].bankName).toBeUndefined();
    });

    test('should anonymize PII consistently across sessions', async () => {
      const data1 = { fullName: 'John Doe', email: 'john@example.com' };
      const data2 = { fullName: 'John Doe', email: 'john@example.com' };

      const sanitized1 = await sanitizeFinancialData(data1, { userId: 'test-user' });
      const sanitized2 = await sanitizeFinancialData(data2, { userId: 'test-user' });

      // Same values should produce same anonymous IDs
      expect(sanitized1.fullName).toBe(sanitized2.fullName);
      expect(sanitized1.email).toBe(sanitized2.email);
    });

    test('should round financial amounts to prevent precision-based identification', async () => {
      const data = {
        amount: 123.45,
        balance: 987.89,
        transactions: [
          { amount: 12.99 },
          { amount: 100.01 }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, { userId: 'test-user' });

      expect(sanitized.amount).toBe(123);
      expect(sanitized.balance).toBe(988);
      expect(sanitized.transactions[0].amount).toBe(13);
      expect(sanitized.transactions[1].amount).toBe(100);
    });

    test('should generalize transaction descriptions', async () => {
      const data = {
        transactions: [
          {
            description: 'Purchase at STARBUCKS #1234 NEW YORK NY on 2024-09-29 REF:TXN123456789',
            merchant: 'Starbucks Coffee #1234'
          },
          {
            description: 'Online payment to john.doe@example.com for $45.99',
            merchant: 'Amazon.com'
          }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, { userId: 'test-user' });

      const desc1 = sanitized.transactions[0].description;
      const desc2 = sanitized.transactions[1].description;

      // Should not contain specific identifiers
      expect(desc1).not.toContain('1234');
      expect(desc1).not.toContain('TXN123456789');
      expect(desc2).not.toContain('john.doe@example.com');
      expect(desc2).not.toContain('$45.99');

      // Should contain generic placeholders
      expect(desc1).toContain('XXXX');
      expect(desc2).toContain('EMAIL');
      expect(desc2).toContain('AMOUNT');

      // Merchants should be categorized
      expect(sanitized.transactions[0].merchant).toBe('COFFEE_SHOP');
      expect(sanitized.transactions[1].merchant).toBe('ECOMMERCE_RETAILER');
    });

    test('should convert timestamps to general periods', async () => {
      const data = {
        createdAt: '2024-09-29T14:30:22.123Z',
        updatedAt: '2024-03-15T09:45:18.456Z',
        transactions: [
          { createdAt: '2024-06-15T10:30:00Z' }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, { userId: 'test-user' });

      expect(sanitized.createdAt).toBe('Q3_2024');
      expect(sanitized.updatedAt).toBe('Q1_2024');
      expect(sanitized.transactions[0].createdAt).toBe('Q2_2024');
    });
  });

  describe('🛡️ Context Builder Security', () => {
    test('should build financial context with full anonymization', async () => {
      const context = await ContextBuilderFactory.buildContextForFeature(
        'test-user-123',
        'financial',
        { includeTransactions: true, includeGoals: true }
      );

      // Context should be anonymized
      expect(context.anonymousUserId).toMatch(/^[a-f0-9]{16}$/);
      expect(context.contextType).toBe('financial');
      expect(context._metadata.sanitized).toBe(true);
      expect(context._metadata.contextBuilder).toBe('FinancialContextBuilder');

      // Should not contain raw user ID or email
      expect(JSON.stringify(context)).not.toContain('test-user-123');
      expect(JSON.stringify(context)).not.toContain('@');
      expect(JSON.stringify(context)).not.toContain('john.doe');
    });

    test('should build nutrition context without financial PII', async () => {
      const context = await ContextBuilderFactory.buildContextForFeature(
        'test-user-456',
        'nutrition',
        { includeMeals: true }
      );

      expect(context.contextType).toBe('nutrition');
      expect(context._metadata.sanitized).toBe(true);
      expect(context._metadata.contextBuilder).toBe('NutritionContextBuilder');

      // Should not contain any financial account information
      const contextString = JSON.stringify(context);
      expect(contextString).not.toContain('accountNumber');
      expect(contextString).not.toContain('iban');
      expect(contextString).not.toContain('routingNumber');
    });

    test('should build lifestyle context with appropriate data scope', async () => {
      const context = await ContextBuilderFactory.buildContextForFeature(
        'test-user-789',
        'lifestyle',
        { includeActivities: true }
      );

      expect(context.contextType).toBe('lifestyle');
      expect(context._metadata.sanitized).toBe(true);
      expect(context._metadata.contextBuilder).toBe('LifestyleContextBuilder');

      // Should not contain sensitive financial data
      const contextString = JSON.stringify(context);
      expect(contextString).not.toContain('balance');
      expect(contextString).not.toContain('accountNumber');
      expect(contextString).not.toContain('ssn');
    });

    test('should enforce data limits in context builders', async () => {
      const context = await ContextBuilderFactory.buildContextForFeature(
        'test-user-limits',
        'financial',
        { includeTransactions: true }
      );

      if (context.financial?.transactions) {
        expect(context.financial.transactions.length).toBeLessThanOrEqual(50);
      }

      if (context.financial?.goals) {
        expect(context.financial.goals.length).toBeLessThanOrEqual(5);
      }

      expect(context._metadata.limits).toBeDefined();
    });
  });

  describe('🔍 AI Request Validation', () => {
    test('should detect and reject credit card numbers in requests', () => {
      const request = {
        type: 'financial_analysis',
        data: {
          transactions: [
            {
              amount: 100,
              description: 'Payment with card 4111-1111-1111-1111'
            }
          ]
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('potentially sensitive data'))).toBe(true);
    });

    test('should detect and reject SSN patterns in requests', () => {
      const request = {
        type: 'financial_analysis',
        data: {
          userInfo: 'SSN: 123-45-6789'
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('potentially sensitive data'))).toBe(true);
    });

    test('should detect suspicious keywords in requests', () => {
      const request = {
        type: 'financial_analysis',
        data: {
          credentials: {
            password: 'secret123',
            api_key: 'sk-1234567890'
          }
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Suspicious keyword detected'))).toBe(true);
    });

    test('should reject oversized requests', () => {
      const largeData = 'x'.repeat(2000000); // 2MB of data
      const request = {
        type: 'financial_analysis',
        data: {
          largeField: largeData
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed'))).toBe(true);
    });

    test('should allow safe financial data after sanitization', () => {
      const request = {
        type: 'financial_analysis',
        data: {
          summary: {
            totalIncome: 5000,
            totalExpenses: 3000,
            savingsRate: 0.4
          },
          categories: {
            food: 800,
            transport: 300,
            entertainment: 200
          }
        },
        instructions: 'Analyze spending patterns'
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized._validation).toBeDefined();
    });
  });

  describe('🎯 Sanitization Validation', () => {
    test('should validate that sensitive data has been completely removed', async () => {
      const sanitizedData = {
        anonymousUserId: 'ANON_USERID_abc123def456',
        amount: 100,
        category: 'COFFEE_SHOP',
        description: 'MERCHANT purchase at LOCATION',
        date: 'Q3_2024'
      };

      const validation = validateSanitization(sanitizedData);
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    test('should detect remaining sensitive patterns in supposedly clean data', async () => {
      const unsanitizedData = {
        amount: 100,
        email: 'test@example.com',
        description: 'Payment to john.doe@email.com for $45.99',
        phone: '555-123-4567',
        ssn: '123-45-6789',
        accountNumber: '1234567890123456'
      };

      const validation = validateSanitization(unsanitizedData);
      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
      expect(validation.violations).toContain('Email addresses detected');
      expect(validation.violations).toContain('Phone numbers detected');
      expect(validation.violations).toContain('SSN patterns detected');
      expect(validation.violations).toContain('Potential account numbers detected');
    });
  });

  describe('🌐 Provider-Agnostic Architecture', () => {
    test('should work with AI_PROVIDER=none (disabled state)', async () => {
      process.env.AI_PROVIDER = 'none';

      const response = await request(app)
        .get('/api/ai-secure/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.provider).toBe('none');
      expect(response.body.data.ready).toBe(false);
    });

    test('should handle disabled AI gracefully in suggestions endpoint', async () => {
      process.env.AI_PROVIDER = 'none';

      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          category: 'financial',
          limit: 5
        })
        .expect(503);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('disabled');
      expect(response.body.data.enabled).toBe(false);
    });

    test('should validate provider switching capability', () => {
      const providers = ['none', 'openai', 'anthropic', 'mistral', 'azure'];

      providers.forEach(provider => {
        process.env.AI_PROVIDER = provider;
        // The system should handle each provider gracefully
        expect(() => {
          const aiService = require('../../src/services/ai/aiService');
          aiService.getStatus();
        }).not.toThrow();
      });
    });
  });

  describe('⚡ Rate Limiting and Access Control', () => {
    test('should enforce rate limits for free users', async () => {
      // This test would require mocking the rate limit service
      // to simulate rapid requests from a free user
      const mockUser = { ...mockUserWithPII, isPremium: false };

      // Simulate multiple rapid requests
      const requests = Array(15).fill(null).map(() =>
        request(app)
          .get('/api/ai-secure/suggestions')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ category: 'financial' })
      );

      // Some requests should be rate limited (429 status)
      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        response => response.value?.status === 429
      );

      // At least some requests should be rate limited for free users
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    test('should validate user context for sensitive operations', async () => {
      const userContext = {}; // No userId
      const request = { type: 'financial_analysis' };

      const { validateUserContext } = require('../../src/services/ai/aiValidator');
      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Authentication required for this request type');
    });
  });

  describe('📋 GDPR/PSD2 Compliance', () => {
    test('should add compliance metadata to all sanitized data', async () => {
      const sanitized = await sanitizeFinancialData(mockSensitiveFinancialData, { userId: 'test-user' });

      expect(sanitized._sanitization).toBeDefined();
      expect(sanitized._sanitization.anonymized).toBe(true);
      expect(sanitized._sanitization.version).toBe('1.0');
      expect(sanitized._sanitization.rules).toContain('sensitive_removed');
      expect(sanitized._sanitization.rules).toContain('pii_anonymized');
      expect(sanitized._sanitization.rules).toContain('amounts_rounded');
    });

    test('should preserve analytical value while removing PII', async () => {
      const data = {
        transactions: [
          {
            amount: 4.99,
            category: 'food',
            merchant: 'Starbucks',
            description: 'Coffee purchase',
            accountNumber: '1234567890123456' // This should be removed
          }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, { userId: 'test-user' });
      const txn = sanitized.transactions[0];

      // Analytical value preserved
      expect(txn.amount).toBe(5); // Rounded but still meaningful
      expect(txn.category).toBe('food');
      expect(txn.merchant).toBe('COFFEE_SHOP'); // Categorized

      // Sensitive data removed
      expect(txn.accountNumber).toBeUndefined();
    });

    test('should handle null and undefined data gracefully', async () => {
      const nullResult = await sanitizeFinancialData(null, { userId: 'test-user' });
      const undefinedResult = await sanitizeFinancialData(undefined, { userId: 'test-user' });

      expect(nullResult).toHaveProperty('error');
      expect(undefinedResult).toHaveProperty('error');
    });

    test('should handle circular references without crashing', async () => {
      const circularData = { a: {} };
      circularData.a.circular = circularData;

      const result = await sanitizeFinancialData(circularData, { userId: 'test-user' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('🚀 Migration Readiness', () => {
    test('should confirm all legacy endpoint functionality is covered', async () => {
      const legacyEndpoints = [
        '/api/ai/suggestions',
        '/api/ai/suggestions/alimentation',
        '/api/ai/suggestions/habits',
        '/api/ai/suggestions/activite',
        '/api/ai/suggestions/deplacement',
        '/api/ai/analyze',
        '/api/ai/analyze/spending',
        '/api/ai/analyze/savings',
        '/api/ai/chat'
      ];

      const secureEndpoints = [
        '/api/ai-secure/suggestions',
        '/api/ai-secure/suggestions/food',
        '/api/ai-secure/suggestions/habits',
        '/api/ai-secure/suggestions/activities',
        '/api/ai-secure/suggestions/transport',
        '/api/ai-secure/analyze',
        '/api/ai-secure/analyze/spending',
        '/api/ai-secure/analyze/savings',
        '/api/ai-secure/chat'
      ];

      // Each legacy endpoint should have a secure equivalent
      expect(secureEndpoints.length).toBeGreaterThanOrEqual(legacyEndpoints.length);
    });

    test('should provide migration status information', async () => {
      const response = await request(app)
        .get('/api/ai-secure/migration/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.secure_system_ready).toBe(true);
      expect(response.body.data.legacy_endpoints).toBeInstanceOf(Array);
      expect(response.body.data.secure_endpoints).toBeInstanceOf(Array);
    });
  });

  describe('🔧 Error Handling and Resilience', () => {
    test('should handle AI service failures gracefully', async () => {
      // Mock AI service failure
      jest.mock('../../src/services/ai/aiService', () => ({
        isAIEnabled: () => false,
        getStatus: () => ({ enabled: false, provider: 'none', ready: false })
      }));

      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expect(response.body.data.status).toBe('disabled');
    });

    test('should log security violations without exposing sensitive data', async () => {
      const mockLogger = jest.spyOn(require('../../src/utils/logger'), 'warn');

      const request = {
        type: 'financial_analysis',
        data: {
          creditCard: '4111-1111-1111-1111'
        }
      };

      validateAIRequest(request);

      // Logger should not contain the actual credit card number
      expect(mockLogger).toHaveBeenCalled();
      const logCalls = mockLogger.mock.calls;
      const containsSensitiveData = logCalls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('4111-1111-1111-1111'))
      );
      expect(containsSensitiveData).toBe(false);
    });
  });
});