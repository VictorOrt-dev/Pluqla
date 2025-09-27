/**
 * Enhanced Financial API Service for Pluqla
 * Uses the new ApiAdapter with proper error handling and race condition prevention
 * Version: 2.0.0 - Phase 1 Critical Fixes
 */

import { apiAdapter, ERROR_CATEGORIES, ApiError } from './api/apiAdapter';
import secureLogger from '../utils/secureLogger';

/**
 * Initialize financial API with auth context
 */
export const initFinancialApi = (authContext) => {
  apiAdapter.init(authContext);
  secureLogger.info('Financial API initialized with auth context');
};

/**
 * Enhanced Financial API with proper error categorization
 */
export const financialApi = {
  /**
   * Récupère le résumé financier complet
   */
  async getSummary(language = 'fr', period = 'month') {
    try {
      const result = await apiAdapter.get('/financial/summary', {
        lang: language,
        period: period
      });
      secureLogger.success('Financial summary retrieved successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get financial summary', error, {
        language,
        period,
        category: error.category
      });

      // Handle specific error categories
      if (error.category === ERROR_CATEGORIES.AUTHENTICATION) {
        // Auth errors are handled by the adapter automatically
        throw error;
      } else if (error.category === ERROR_CATEGORIES.RATE_LIMIT) {
        // Add specific handling for rate limits
        throw new ApiError(
          'Trop de demandes de résumé financier. Veuillez patienter.',
          ERROR_CATEGORIES.RATE_LIMIT,
          429
        );
      }

      throw error;
    }
  },

  /**
   * Récupère les dépenses détaillées
   */
  async getExpenses(period = 'month', limit = 100) {
    try {
      const result = await apiAdapter.get('/financial/expenses', {
        period,
        limit
      });
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get expenses', error, {
        period,
        limit,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Récupère les revenus détaillés
   */
  async getIncome(period = 'month', limit = 100) {
    try {
      const result = await apiAdapter.get('/financial/income', {
        period,
        limit
      });
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get income', error, {
        period,
        limit,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Récupère les suggestions IA
   */
  async getSuggestions(language = 'fr', limit = 5) {
    try {
      const result = await apiAdapter.get('/financial/suggestions', {
        lang: language,
        limit
      });
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get AI suggestions', error, {
        language,
        limit,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Rejette une suggestion
   */
  async dismissSuggestion(suggestionId) {
    try {
      const result = await apiAdapter.post(`/financial/suggestions/dismiss/${suggestionId}`);
      secureLogger.success('Suggestion dismissed successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to dismiss suggestion', error, {
        suggestionId,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Ajoute une transaction
   */
  async addTransaction(transactionData) {
    try {
      const result = await apiAdapter.post('/financial/transactions', transactionData);
      secureLogger.success('Transaction added successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to add transaction', error, {
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Supprime une transaction
   */
  async deleteTransaction(transactionId) {
    try {
      const result = await apiAdapter.delete(`/financial/transactions/${transactionId}`);
      secureLogger.success('Transaction deleted successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to delete transaction', error, {
        transactionId,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Met à jour une transaction
   */
  async updateTransaction(transactionId, transactionData) {
    try {
      const result = await apiAdapter.put(`/financial/transactions/${transactionId}`, transactionData);
      secureLogger.success('Transaction updated successfully');
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to update transaction', error, {
        transactionId,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Récupère les statistiques financières
   */
  async getStats(period = 'month') {
    try {
      const result = await apiAdapter.get('/financial/stats', { period });
      return result.data;
    } catch (error) {
      secureLogger.error('Failed to get financial stats', error, {
        period,
        category: error.category
      });
      throw error;
    }
  },

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clearPendingRequests() {
    apiAdapter.clearPendingRequests();
  },

  /**
   * Get API adapter statistics
   */
  getApiStats() {
    return apiAdapter.getStats();
  }
};

export default financialApi;