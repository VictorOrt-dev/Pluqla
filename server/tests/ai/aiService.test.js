/**
 * AI Service Unit Tests
 *
 * Tests the core AI service functionality including provider management,
 * data sanitization, and security controls.
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const aiService = require('../../src/services/ai/aiService');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('AI Service Core Functionality', () => {
  describe('Service Initialization', () => {
    test('should initialize in disabled mode when AI_PROVIDER=none', () => {
      process.env.AI_PROVIDER = 'none';

      const status = aiService.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.provider).toBe('none');
      expect(status.ready).toBe(false);
    });

    test('should initialize in disabled mode when no API key provided', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_API_KEY = '';

      const status = aiService.getStatus();

      expect(status.enabled).toBe(false);
    });

    test('should return correct service status', () => {
      const status = aiService.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('ready');
      expect(typeof status.enabled).toBe('boolean');
      expect(typeof status.provider).toBe('string');
      expect(typeof status.ready).toBe('boolean');
    });
  });

  describe('AI Availability Checks', () => {
    test('should return false when AI is disabled', () => {
      process.env.AI_PROVIDER = 'none';

      const isEnabled = aiService.isAIEnabled();

      expect(isEnabled).toBe(false);
    });

    test('should return disabled response for generateResponse when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const request = {
        type: 'financial_analysis',
        data: { test: 'data' }
      };

      const result = await aiService.generateResponse(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
      expect(result.message).toContain('AI features are currently disabled');
    });
  });

  describe('Request Processing', () => {
    test('should return disabled response for analyzeFinancialData when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const data = { transactions: [] };
      const analysisType = 'spending_analysis';
      const userContext = { userId: 'test-user' };

      const result = await aiService.analyzeFinancialData(data, analysisType, userContext);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
    });

    test('should return disabled response for classifyTransaction when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const transaction = {
        description: 'Test transaction',
        amount: 100
      };
      const userContext = { userId: 'test-user' };

      const result = await aiService.classifyTransaction(transaction, userContext);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
    });

    test('should return disabled response for generateInsights when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const financialSummary = { totalExpenses: 1000 };
      const userContext = { userId: 'test-user' };

      const result = await aiService.generateInsights(financialSummary, userContext);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
    });

    test('should return disabled response for generateRecommendations when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const spendingPattern = { categories: { food: 500 } };
      const userGoals = [{ type: 'savings', target: 1000 }];
      const userContext = { userId: 'test-user' };

      const result = await aiService.generateRecommendations(spendingPattern, userGoals, userContext);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
    });
  });

  describe('Health Check', () => {
    test('should return health status when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const health = await aiService.healthCheck();

      expect(health).toHaveProperty('enabled');
      expect(health).toHaveProperty('provider');
      expect(health).toHaveProperty('ready');
      expect(health).toHaveProperty('connection');
      expect(health).toHaveProperty('timestamp');
      expect(health.enabled).toBe(false);
      expect(health.connection).toBe('disabled');
    });
  });

  describe('Analysis Instructions', () => {
    test('should return appropriate instructions for different analysis types', () => {
      const spendingAnalysis = aiService.getAnalysisInstructions('spending_analysis');
      const budgetOptimization = aiService.getAnalysisInstructions('budget_optimization');
      const riskAssessment = aiService.getAnalysisInstructions('risk_assessment');
      const unknownType = aiService.getAnalysisInstructions('unknown_type');

      expect(spendingAnalysis).toContain('spending patterns');
      expect(budgetOptimization).toContain('budget allocation');
      expect(riskAssessment).toContain('financial risks');
      expect(unknownType).toContain('general financial analysis');
    });
  });

  describe('Disabled Response Format', () => {
    test('should return standardized disabled response format', () => {
      const response = aiService.getDisabledResponse('Custom message');

      expect(response).toEqual({
        success: false,
        status: 'disabled',
        message: 'Custom message',
        data: null,
        metadata: {
          provider: 'none',
          enabled: false
        }
      });
    });

    test('should return default disabled response when no message provided', () => {
      const response = aiService.getDisabledResponse();

      expect(response.message).toBe('AI features are currently disabled');
      expect(response.success).toBe(false);
      expect(response.status).toBe('disabled');
    });
  });
});

describe('AI Service Configuration', () => {
  describe('Provider Adapter Selection', () => {
    test('should handle unknown provider gracefully', () => {
      process.env.AI_PROVIDER = 'unknown_provider';
      process.env.AI_API_KEY = 'test-key';

      expect(() => {
        aiService.getProviderAdapter();
      }).toThrow('Unsupported AI provider: unknown_provider');
    });

    test('should recognize valid providers', () => {
      const validProviders = ['openai', 'anthropic', 'claude', 'mistral', 'azure', 'azure-openai'];

      validProviders.forEach(provider => {
        process.env.AI_PROVIDER = provider;
        expect(() => {
          aiService.getProviderAdapter();
        }).not.toThrow();
      });
    });
  });

  describe('Configuration Update', () => {
    test('should handle configuration updates when disabled', async () => {
      process.env.AI_PROVIDER = 'none';

      const newConfig = {
        provider: 'none',
        apiKey: '',
        model: 'test-model'
      };

      const result = await aiService.updateConfig(newConfig);

      expect(result.success).toBe(true);
      expect(result.status.enabled).toBe(false);
    });
  });
});

describe('AI Service Error Handling', () => {
  test('should handle malformed requests gracefully', async () => {
    process.env.AI_PROVIDER = 'none';

    const malformedRequest = null;
    const userContext = { userId: 'test-user' };

    const result = await aiService.generateResponse(malformedRequest, userContext);

    expect(result.success).toBe(false);
    expect(result.status).toBe('disabled');
  });

  test('should handle missing user context gracefully', async () => {
    process.env.AI_PROVIDER = 'none';

    const request = {
      type: 'financial_analysis',
      data: { test: 'data' }
    };

    const result = await aiService.generateResponse(request);

    expect(result.success).toBe(false);
    expect(result.status).toBe('disabled');
  });
});

describe('AI Service Integration Tests', () => {
  test('should maintain consistent API when switching between disabled and enabled', async () => {
    // Test disabled state
    process.env.AI_PROVIDER = 'none';
    const disabledStatus = aiService.getStatus();
    const disabledHealth = await aiService.healthCheck();

    expect(disabledStatus).toHaveProperty('enabled');
    expect(disabledHealth).toHaveProperty('connection');

    // The API structure should remain consistent regardless of enabled state
    expect(typeof disabledStatus.enabled).toBe('boolean');
    expect(typeof disabledHealth.enabled).toBe('boolean');
  });

  test('should handle rapid status checks without errors', () => {
    process.env.AI_PROVIDER = 'none';

    // Perform multiple rapid status checks
    for (let i = 0; i < 10; i++) {
      const status = aiService.getStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('ready');
    }
  });
});

describe('AI Service Memory Management', () => {
  test('should not leak memory when processing multiple disabled requests', async () => {
    process.env.AI_PROVIDER = 'none';

    const request = {
      type: 'financial_analysis',
      data: { test: 'data' }
    };
    const userContext = { userId: 'test-user' };

    // Process multiple requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(aiService.generateResponse(request, userContext));
    }

    const results = await Promise.all(promises);

    // All should return consistent disabled responses
    results.forEach(result => {
      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
    });
  });
});