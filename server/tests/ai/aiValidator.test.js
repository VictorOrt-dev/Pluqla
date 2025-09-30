/**
 * AI Validator Unit Tests
 *
 * Tests the AI request validation functionality to ensure proper
 * input validation, security checks, and user context validation.
 */

const { describe, test, expect } = require('@jest/globals');
const { validateAIRequest, validateUserContext, AI_REQUEST_TYPES } = require('../../src/services/ai/aiValidator');

describe('AI Validator', () => {
  describe('Basic Request Validation', () => {
    test('should validate a proper financial analysis request', () => {
      const validRequest = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        subtype: 'spending_analysis',
        data: {
          transactions: [
            {
              amount: 100,
              description: 'Test transaction',
              category: 'food'
            }
          ],
          summary: {
            totalIncome: 5000,
            totalExpenses: 3000
          }
        },
        instructions: 'Analyze spending patterns'
      };

      const result = validateAIRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized._validation).toBeDefined();
    });

    test('should validate a proper transaction classification request', () => {
      const validRequest = {
        type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION,
        data: {
          description: 'STARBUCKS COFFEE',
          amount: 4.99,
          merchant: 'Starbucks'
        },
        instructions: 'Classify this transaction'
      };

      const result = validateAIRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.type).toBe(AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION);
    });

    test('should reject invalid request type', () => {
      const invalidRequest = {
        type: 'invalid_type',
        data: { test: 'data' }
      };

      const result = validateAIRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('"type" must be one of [financial_analysis, transaction_classification, financial_insights, spending_recommendations, budget_optimization, risk_assessment, investment_insights, debt_analysis]');
    });

    test('should reject missing required fields', () => {
      const invalidRequest = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS
        // Missing required 'data' field
      };

      const result = validateAIRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('"data" is required'))).toBe(true);
    });

    test('should reject oversized requests', () => {
      const largeData = 'x'.repeat(2000000); // 2MB of data
      const oversizedRequest = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          largeField: largeData
        }
      };

      const result = validateAIRequest(oversizedRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed'))).toBe(true);
    });
  });

  describe('Financial Analysis Request Validation', () => {
    test('should validate financial analysis with transactions', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        subtype: 'spending_analysis',
        data: {
          transactions: [
            {
              amount: 100,
              description: 'Test transaction',
              category: 'food',
              date: new Date().toISOString(),
              merchant: 'Test Merchant'
            }
          ]
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
    });

    test('should validate financial analysis with accounts', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          accounts: [
            {
              type: 'checking',
              balance: 1000,
              currency: 'USD'
            }
          ]
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
    });

    test('should reject too many transactions', () => {
      const manyTransactions = Array(1001).fill({
        amount: 100,
        description: 'Test'
      });

      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          transactions: manyTransactions
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Too many transactions'))).toBe(true);
    });

    test('should reject invalid subtype', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        subtype: 'invalid_subtype',
        data: {
          summary: { totalIncome: 1000 }
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('"subtype" must be one of'))).toBe(true);
    });
  });

  describe('Transaction Classification Validation', () => {
    test('should validate proper transaction classification request', () => {
      const request = {
        type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION,
        data: {
          description: 'AMAZON.COM PURCHASE',
          amount: 29.99,
          merchant: 'Amazon',
          date: new Date().toISOString()
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
    });

    test('should reject transaction classification without required fields', () => {
      const request = {
        type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION,
        data: {
          // Missing required description and amount
          merchant: 'Amazon'
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('"description" is required'))).toBe(true);
      expect(result.errors.some(error => error.includes('"amount" is required'))).toBe(true);
    });

    test('should reject overly long transaction description', () => {
      const request = {
        type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION,
        data: {
          description: 'x'.repeat(501), // Over 500 character limit
          amount: 100
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('length must be less than or equal to 500'))).toBe(true);
    });
  });

  describe('Security Validation', () => {
    test('should detect credit card numbers', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
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

    test('should detect SSN patterns', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          userInfo: 'SSN: 123-45-6789'
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('potentially sensitive data'))).toBe(true);
    });

    test('should detect suspicious keywords', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
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

    test('should allow safe financial data', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
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
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Data Size Validation', () => {
    test('should reject requests with too many accounts', () => {
      const manyAccounts = Array(51).fill({
        type: 'checking',
        balance: 1000
      });

      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          accounts: manyAccounts
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Too many accounts'))).toBe(true);
    });

    test('should reject overly long instructions', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: { summary: { totalIncome: 1000 } },
        instructions: 'x'.repeat(2001) // Over 2000 character limit
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Instructions too long'))).toBe(true);
    });
  });

  describe('Request Sanitization', () => {
    test('should sanitize overly long instructions', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: { summary: { totalIncome: 1000 } },
        instructions: 'x'.repeat(1500) + 'important part'
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.instructions.length).toBeLessThanOrEqual(2003); // 2000 + '...'
      expect(result.sanitized.instructions.endsWith('...')).toBe(true);
    });

    test('should sanitize transaction descriptions', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {
          transactions: [
            {
              amount: 100,
              description: 'x'.repeat(450) + 'important part'
            }
          ]
        }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.data.transactions[0].description.length).toBeLessThanOrEqual(503); // 500 + '...'
    });

    test('should add validation metadata', () => {
      const request = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: { summary: { totalIncome: 1000 } }
      };

      const result = validateAIRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitized._validation).toBeDefined();
      expect(result.sanitized._validation.validated).toBe(true);
      expect(result.sanitized._validation.timestamp).toBeDefined();
      expect(result.sanitized._validation.version).toBe('1.0');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', () => {
      const malformedRequest = null;

      const result = validateAIRequest(malformedRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid request format');
    });

    test('should handle circular references', () => {
      const circularRequest = {
        type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
        data: {}
      };
      circularRequest.data.circular = circularRequest;

      const result = validateAIRequest(circularRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid request format');
    });
  });
});

describe('User Context Validation', () => {
  describe('Authentication Requirements', () => {
    test('should require authentication for sensitive requests', () => {
      const userContext = {}; // No userId
      const request = { type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Authentication required for this request type');
    });

    test('should allow authenticated users for sensitive requests', () => {
      const userContext = { userId: 'user-123' };
      const request = { type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(true);
    });

    test('should allow unauthenticated users for public request types', () => {
      const userContext = {}; // No userId
      const request = { type: 'public_request_type' };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Permission Checks', () => {
    test('should reject restricted users', () => {
      const userContext = {
        userId: 'user-123',
        role: 'restricted'
      };
      const request = { type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient permissions for AI features');
    });

    test('should allow normal users', () => {
      const userContext = {
        userId: 'user-123',
        role: 'user'
      };
      const request = { type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Premium Feature Checks', () => {
    test('should require premium subscription for premium features', () => {
      const userContext = {
        userId: 'user-123',
        isPremium: false
      };
      const request = { type: AI_REQUEST_TYPES.INVESTMENT_INSIGHTS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Premium subscription required for this feature');
    });

    test('should allow premium users for premium features', () => {
      const userContext = {
        userId: 'user-123',
        isPremium: true
      };
      const request = { type: AI_REQUEST_TYPES.INVESTMENT_INSIGHTS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(true);
    });

    test('should allow free users for non-premium features', () => {
      const userContext = {
        userId: 'user-123',
        isPremium: false
      };
      const request = { type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Multiple Validation Errors', () => {
    test('should return all validation errors', () => {
      const userContext = {
        role: 'restricted',
        isPremium: false
      }; // Missing userId
      const request = { type: AI_REQUEST_TYPES.INVESTMENT_INSIGHTS };

      const result = validateUserContext(userContext, request);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Authentication required for this request type');
      expect(result.errors).toContain('Insufficient permissions for AI features');
      expect(result.errors).toContain('Premium subscription required for this feature');
    });
  });
});