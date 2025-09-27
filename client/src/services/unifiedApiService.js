/**
 * Unified API Service for Pluqla
 * Consolidates all API interactions: Auth, Financial, Transactions, AI, etc.
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import { apiAdapter, ERROR_CATEGORIES } from './api/apiAdapter';
import secureLogger from '../utils/secureLogger';

/**
 * Unified API Service Class
 * Single point of access for all backend services
 */
class UnifiedApiService {
  constructor() {
    this.adapter = apiAdapter;
    this.initialized = false;

    secureLogger.info('Unified API Service created');
  }

  /**
   * Initialize with auth context
   */
  init(authContext) {
    this.adapter.init(authContext);
    this.initialized = true;
    secureLogger.info('Unified API Service initialized');
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized;
  }

  // ======================
  // AUTHENTICATION METHODS
  // ======================

  /**
   * User registration
   */
  async register(userData) {
    try {
      const result = await this.adapter.post('/auth/register', userData);
      secureLogger.success('User registered successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Registration failed', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(credentials) {
    try {
      const result = await this.adapter.post('/auth/login', credentials);
      secureLogger.success('User logged in successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Token refresh
   */
  async refreshToken(refreshToken) {
    try {
      const result = await this.adapter.post('/auth/refresh', { refreshToken });
      secureLogger.success('Token refreshed successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Token refresh failed', error);
      throw error;
    }
  }

  /**
   * User logout
   */
  async logout(refreshToken) {
    try {
      await this.adapter.post('/auth/logout', { refreshToken });
      secureLogger.success('User logged out successfully');
    } catch (error) {
      secureLogger.error('Logout failed', error, { recoverable: true });
      // Don't throw logout errors - always allow local logout
    }
  }

  /**
   * Verify token
   */
  async verifyToken() {
    try {
      const result = await this.adapter.get('/auth/verify');
      return result.data;
    } catch (error) {
      secureLogger.error('Token verification failed', error);
      throw error;
    }
  }

  // ======================
  // FINANCIAL METHODS
  // ======================

  /**
   * Get financial summary
   */
  async getFinancialSummary(params = {}) {
    try {
      const { lang = 'fr', period = 'month' } = params;
      const result = await this.adapter.get('/financial/summary', { lang, period });
      secureLogger.success('Financial summary retrieved');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get financial summary', error);
      throw error;
    }
  }

  /**
   * Get financial dashboard
   */
  async getFinancialDashboard(params = {}) {
    try {
      const result = await this.adapter.get('/financial/dashboard', params);
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get financial dashboard', error);
      throw error;
    }
  }

  /**
   * Get expenses
   */
  async getExpenses(params = {}) {
    try {
      const result = await this.adapter.get('/financial/expenses', params);
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get expenses', error);
      throw error;
    }
  }

  /**
   * Create expense
   */
  async createExpense(expenseData) {
    try {
      const result = await this.adapter.post('/financial/expenses', expenseData);
      secureLogger.success('Expense created successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to create expense', error);
      throw error;
    }
  }

  /**
   * Get income data
   */
  async getIncome(params = {}) {
    try {
      const result = await this.adapter.get('/financial/income', params);
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get income data', error);
      throw error;
    }
  }

  /**
   * Get financial suggestions
   */
  async getFinancialSuggestions(params = {}) {
    try {
      const { lang = 'fr', limit = 5 } = params;
      const result = await this.adapter.get('/financial/suggestions', { lang, limit });
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get financial suggestions', error);
      throw error;
    }
  }

  /**
   * Dismiss financial suggestion
   */
  async dismissFinancialSuggestion(suggestionId) {
    try {
      const result = await this.adapter.post(`/financial/suggestions/dismiss/${suggestionId}`);
      secureLogger.success('Financial suggestion dismissed');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to dismiss suggestion', error);
      throw error;
    }
  }

  // ======================
  // TRANSACTION METHODS
  // ======================

  /**
   * Get transactions
   */
  async getTransactions(params = {}) {
    try {
      const result = await this.adapter.get('/transactions', params);
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get transactions', error);
      throw error;
    }
  }

  /**
   * Create transaction
   */
  async createTransaction(transactionData) {
    try {
      const result = await this.adapter.post('/transactions', transactionData);
      secureLogger.success('Transaction created successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to create transaction', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(transactionId, transactionData) {
    try {
      const result = await this.adapter.put(`/transactions/${transactionId}`, transactionData);
      secureLogger.success('Transaction updated successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to update transaction', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(transactionId) {
    try {
      const result = await this.adapter.delete(`/transactions/${transactionId}`);
      secureLogger.success('Transaction deleted successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to delete transaction', error);
      throw error;
    }
  }

  // ======================
  // AI METHODS
  // ======================

  /**
   * Get AI suggestions
   */
  async getAISuggestions(params = {}) {
    try {
      const { category, lang = 'fr', limit = 5 } = params;
      const result = await this.adapter.get('/ai/suggestions', { category, lang, limit });

      // Ensure we always return an array for AI suggestions
      const suggestions = result.data?.suggestions || result.data || [];
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      secureLogger.error('Failed to get AI suggestions', error);

      // Return empty array for AI failures to prevent UI breaks
      if (error.category === ERROR_CATEGORIES.SERVER_ERROR ||
          error.category === ERROR_CATEGORIES.NETWORK_ERROR) {
        secureLogger.warn('Returning empty AI suggestions due to error');
        return [];
      }

      throw error;
    }
  }

  /**
   * Submit AI feedback
   */
  async submitAIFeedback(feedbackData) {
    try {
      const result = await this.adapter.post('/ai/feedback', feedbackData);
      secureLogger.success('AI feedback submitted');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to submit AI feedback', error);
      throw error;
    }
  }

  // ======================
  // USER METHODS
  // ======================

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      const result = await this.adapter.get('/users/profile');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get user profile', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData) {
    try {
      const result = await this.adapter.put('/users/profile', profileData);
      secureLogger.success('User profile updated');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to update user profile', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences) {
    try {
      const result = await this.adapter.put('/users/preferences', preferences);
      secureLogger.success('User preferences updated');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to update preferences', error);
      throw error;
    }
  }

  // ======================
  // ANALYTICS METHODS
  // ======================

  /**
   * Track analytics event
   */
  async trackEvent(eventName, properties = {}) {
    try {
      await this.adapter.post('/analytics/events', {
        event: eventName,
        properties,
        timestamp: new Date().toISOString()
      });
      secureLogger.debug('Analytics event tracked', { eventName });
    } catch (error) {
      // Don't throw analytics errors - they shouldn't break the app
      secureLogger.warn('Analytics tracking failed', error);
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(params = {}) {
    try {
      const result = await this.adapter.get('/analytics/user', params);
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get user analytics', error);
      throw error;
    }
  }

  // ======================
  // UTILITY METHODS
  // ======================

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.adapter.get('/health');
      return result.data;
    } catch (error) {
      secureLogger.error('Health check failed', error);
      throw error;
    }
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests() {
    this.adapter.clearPendingRequests();
  }

  /**
   * Get API statistics
   */
  getStats() {
    return this.adapter.getStats();
  }
}

// Create singleton instance
export const unifiedApiService = new UnifiedApiService();

// Export for backward compatibility
export default unifiedApiService;