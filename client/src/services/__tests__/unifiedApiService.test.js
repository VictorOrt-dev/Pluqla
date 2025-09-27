/**
 * Unified API Service Tests
 * Tests for consolidated API service with Phase 2 enhancements
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import { unifiedApiService } from '../unifiedApiService';
import { apiAdapter } from '../api/apiAdapter';
import secureLogger from '../../utils/secureLogger';

// Mock dependencies
jest.mock('../api/apiAdapter');
jest.mock('../../utils/secureLogger');

describe('UnifiedApiService', () => {
  const mockAuthContext = {
    token: 'mock-token',
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiAdapter.init = jest.fn();
    apiAdapter.get = jest.fn();
    apiAdapter.post = jest.fn();
    apiAdapter.put = jest.fn();
    apiAdapter.delete = jest.fn();
    apiAdapter.clearPendingRequests = jest.fn();
    apiAdapter.getStats = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize with auth context', () => {
      unifiedApiService.init(mockAuthContext);

      expect(apiAdapter.init).toHaveBeenCalledWith(mockAuthContext);
      expect(unifiedApiService.isReady()).toBe(true);
      expect(secureLogger.info).toHaveBeenCalledWith('Unified API Service initialized');
    });

    it('should report ready status correctly', () => {
      expect(unifiedApiService.isReady()).toBe(false);

      unifiedApiService.init(mockAuthContext);
      expect(unifiedApiService.isReady()).toBe(true);
    });
  });

  describe('Authentication Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should handle user registration', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { data: { user: { id: 1, email: 'test@example.com' } } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.register(userData);

      expect(apiAdapter.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(secureLogger.success).toHaveBeenCalledWith('User registered successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle user login', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { data: { token: 'new-token', user: { id: 1 } } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.login(credentials);

      expect(apiAdapter.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(secureLogger.success).toHaveBeenCalledWith('User logged in successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle token refresh', async () => {
      const refreshToken = 'refresh-token-123';
      const mockResponse = { data: { token: 'new-access-token' } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.refreshToken(refreshToken);

      expect(apiAdapter.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken });
      expect(secureLogger.success).toHaveBeenCalledWith('Token refreshed successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle logout gracefully even on error', async () => {
      const refreshToken = 'refresh-token-123';
      const mockError = new Error('Network error');

      apiAdapter.post.mockRejectedValue(mockError);

      // Should not throw error
      await expect(unifiedApiService.logout(refreshToken)).resolves.toBeUndefined();

      expect(apiAdapter.post).toHaveBeenCalledWith('/auth/logout', { refreshToken });
      expect(secureLogger.error).toHaveBeenCalledWith(
        'Logout failed',
        mockError,
        { recoverable: true }
      );
    });

    it('should handle token verification', async () => {
      const mockResponse = { data: { valid: true, user: { id: 1 } } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.verifyToken();

      expect(apiAdapter.get).toHaveBeenCalledWith('/auth/verify');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Financial Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should get financial summary with default parameters', async () => {
      const mockResponse = { data: { totalSavings: 1000, expenses: 500 } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getFinancialSummary();

      expect(apiAdapter.get).toHaveBeenCalledWith('/financial/summary', {
        lang: 'fr',
        period: 'month'
      });
      expect(secureLogger.success).toHaveBeenCalledWith('Financial summary retrieved');
      expect(result).toEqual(mockResponse.data);
    });

    it('should get financial summary with custom parameters', async () => {
      const params = { lang: 'en', period: 'year' };
      const mockResponse = { data: { totalSavings: 12000 } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getFinancialSummary(params);

      expect(apiAdapter.get).toHaveBeenCalledWith('/financial/summary', params);
      expect(result).toEqual(mockResponse.data);
    });

    it('should create expense', async () => {
      const expenseData = { amount: 50, category: 'food', description: 'Lunch' };
      const mockResponse = { data: { id: 1, ...expenseData } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.createExpense(expenseData);

      expect(apiAdapter.post).toHaveBeenCalledWith('/financial/expenses', expenseData);
      expect(secureLogger.success).toHaveBeenCalledWith('Expense created successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should get financial suggestions with defaults', async () => {
      const mockResponse = { data: { suggestions: ['Save on groceries', 'Cancel unused subscriptions'] } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getFinancialSuggestions();

      expect(apiAdapter.get).toHaveBeenCalledWith('/financial/suggestions', {
        lang: 'fr',
        limit: 5
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should dismiss financial suggestion', async () => {
      const suggestionId = 'suggestion-123';
      const mockResponse = { data: { dismissed: true } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.dismissFinancialSuggestion(suggestionId);

      expect(apiAdapter.post).toHaveBeenCalledWith(`/financial/suggestions/dismiss/${suggestionId}`);
      expect(secureLogger.success).toHaveBeenCalledWith('Financial suggestion dismissed');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('AI Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should get AI suggestions and ensure array return', async () => {
      const mockResponse = { data: { suggestions: ['Suggestion 1', 'Suggestion 2'] } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getAISuggestions({ category: 'finance' });

      expect(apiAdapter.get).toHaveBeenCalledWith('/ai/suggestions', {
        category: 'finance',
        lang: 'fr',
        limit: 5
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockResponse.data.suggestions);
    });

    it('should handle AI suggestions when data is directly an array', async () => {
      const mockSuggestions = ['Direct suggestion 1', 'Direct suggestion 2'];
      const mockResponse = { data: mockSuggestions };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getAISuggestions();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockSuggestions);
    });

    it('should return empty array for server errors', async () => {
      const mockError = new Error('Server error');
      mockError.category = 'SERVER_ERROR';

      apiAdapter.get.mockRejectedValue(mockError);

      const result = await unifiedApiService.getAISuggestions();

      expect(secureLogger.error).toHaveBeenCalledWith('Failed to get AI suggestions', mockError);
      expect(secureLogger.warn).toHaveBeenCalledWith('Returning empty AI suggestions due to error');
      expect(result).toEqual([]);
    });

    it('should return empty array for network errors', async () => {
      const mockError = new Error('Network error');
      mockError.category = 'NETWORK_ERROR';

      apiAdapter.get.mockRejectedValue(mockError);

      const result = await unifiedApiService.getAISuggestions();

      expect(result).toEqual([]);
    });

    it('should rethrow non-server/network errors', async () => {
      const mockError = new Error('Authentication error');
      mockError.category = 'AUTHENTICATION_ERROR';

      apiAdapter.get.mockRejectedValue(mockError);

      await expect(unifiedApiService.getAISuggestions()).rejects.toThrow(mockError);
    });

    it('should submit AI feedback', async () => {
      const feedbackData = { rating: 5, comment: 'Great suggestion!' };
      const mockResponse = { data: { submitted: true } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.submitAIFeedback(feedbackData);

      expect(apiAdapter.post).toHaveBeenCalledWith('/ai/feedback', feedbackData);
      expect(secureLogger.success).toHaveBeenCalledWith('AI feedback submitted');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Transaction Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should get transactions', async () => {
      const params = { limit: 10, offset: 0 };
      const mockResponse = { data: { transactions: [], total: 0 } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.getTransactions(params);

      expect(apiAdapter.get).toHaveBeenCalledWith('/transactions', params);
      expect(result).toEqual(mockResponse.data);
    });

    it('should create transaction', async () => {
      const transactionData = { amount: 100, type: 'expense', category: 'food' };
      const mockResponse = { data: { id: 1, ...transactionData } };

      apiAdapter.post.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.createTransaction(transactionData);

      expect(apiAdapter.post).toHaveBeenCalledWith('/transactions', transactionData);
      expect(secureLogger.success).toHaveBeenCalledWith('Transaction created successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should update transaction', async () => {
      const transactionId = 'trans-123';
      const updateData = { amount: 150 };
      const mockResponse = { data: { id: transactionId, ...updateData } };

      apiAdapter.put.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.updateTransaction(transactionId, updateData);

      expect(apiAdapter.put).toHaveBeenCalledWith(`/transactions/${transactionId}`, updateData);
      expect(secureLogger.success).toHaveBeenCalledWith('Transaction updated successfully');
      expect(result).toEqual(mockResponse.data);
    });

    it('should delete transaction', async () => {
      const transactionId = 'trans-123';
      const mockResponse = { data: { deleted: true } };

      apiAdapter.delete.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.deleteTransaction(transactionId);

      expect(apiAdapter.delete).toHaveBeenCalledWith(`/transactions/${transactionId}`);
      expect(secureLogger.success).toHaveBeenCalledWith('Transaction deleted successfully');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Analytics Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should track analytics event without throwing errors', async () => {
      const eventName = 'user_action';
      const properties = { action: 'click', element: 'button' };

      apiAdapter.post.mockResolvedValue({ data: { tracked: true } });

      await unifiedApiService.trackEvent(eventName, properties);

      expect(apiAdapter.post).toHaveBeenCalledWith('/analytics/events', {
        event: eventName,
        properties,
        timestamp: expect.any(String)
      });
      expect(secureLogger.debug).toHaveBeenCalledWith('Analytics event tracked', { eventName });
    });

    it('should handle analytics errors gracefully', async () => {
      const mockError = new Error('Analytics service down');

      apiAdapter.post.mockRejectedValue(mockError);

      // Should not throw
      await expect(unifiedApiService.trackEvent('test_event')).resolves.toBeUndefined();

      expect(secureLogger.warn).toHaveBeenCalledWith('Analytics tracking failed', mockError);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should perform health check', async () => {
      const mockResponse = { data: { status: 'healthy', timestamp: new Date().toISOString() } };

      apiAdapter.get.mockResolvedValue(mockResponse);

      const result = await unifiedApiService.healthCheck();

      expect(apiAdapter.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });

    it('should clear pending requests', () => {
      unifiedApiService.clearPendingRequests();

      expect(apiAdapter.clearPendingRequests).toHaveBeenCalled();
    });

    it('should get API statistics', () => {
      const mockStats = { requests: 100, errors: 5 };
      apiAdapter.getStats.mockReturnValue(mockStats);

      const result = unifiedApiService.getStats();

      expect(apiAdapter.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      unifiedApiService.init(mockAuthContext);
    });

    it('should log and rethrow errors for most methods', async () => {
      const mockError = new Error('Test error');

      apiAdapter.get.mockRejectedValue(mockError);

      await expect(unifiedApiService.getUserProfile()).rejects.toThrow(mockError);

      expect(secureLogger.error).toHaveBeenCalledWith('Failed to get user profile', mockError);
    });

    it('should handle errors gracefully for non-critical operations', async () => {
      const mockError = new Error('Analytics error');

      apiAdapter.post.mockRejectedValue(mockError);

      // Logout and trackEvent should not throw
      await expect(unifiedApiService.logout('token')).resolves.toBeUndefined();
      await expect(unifiedApiService.trackEvent('event')).resolves.toBeUndefined();
    });
  });
});