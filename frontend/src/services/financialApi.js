// Service centralisé pour les appels API financiers
// Évite la duplication de code et centralise la gestion des erreurs

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

// Variable globale pour stocker la référence à apiCall depuis AuthContext
let authApiCall = null;

/**
 * Initialise le service avec la fonction apiCall de AuthContext
 */
export const initFinancialApi = (apiCallFunction) => {
  authApiCall = apiCallFunction;
};

/**
 * Utilitaire pour faire des appels API avec gestion automatique des erreurs
 */
const apiCall = async (endpoint, options = {}) => {
  if (authApiCall) {
    // Utiliser la fonction apiCall de AuthContext qui gère automatiquement les tokens
    try {
      const result = await authApiCall(endpoint, options);
      return result.data || result;
    } catch (error) {
      // Traiter les erreurs spécifiques pour les messages utilisateur
      if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('token')) {
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      throw error;
    }
  } else {
    // Fallback vers l'ancienne méthode si AuthContext n'est pas initialisé
    console.warn('AuthContext not initialized, using fallback API call');
    return fallbackApiCall(endpoint, options);
  }
};

/**
 * Méthode de fallback (ancienne implémentation pour compatibilité)
 */
const fallbackApiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.message || 'API call failed');
    }

    return result.data || result;
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

/**
 * API financière centralisée
 */
export const financialApi = {
  /**
   * Récupère le résumé financier complet
   */
  async getSummary(language = 'fr', period = 'month') {
    return apiCall(`/financial/summary?lang=${language}&period=${period}`);
  },

  /**
   * Récupère les dépenses détaillées
   */
  async getExpenses(period = 'month', limit = 100) {
    return apiCall(`/financial/expenses?period=${period}&limit=${limit}`);
  },

  /**
   * Récupère les revenus détaillés
   */
  async getIncome(period = 'month', limit = 100) {
    return apiCall(`/financial/income?period=${period}&limit=${limit}`);
  },

  /**
   * Récupère les suggestions IA
   */
  async getSuggestions(language = 'fr', limit = 5) {
    return apiCall(`/financial/suggestions?lang=${language}&limit=${limit}`);
  },

  /**
   * Rejette une suggestion
   */
  async dismissSuggestion(suggestionId) {
    return apiCall(`/financial/suggestions/dismiss/${suggestionId}`, {
      method: 'POST'
    });
  },

  /**
   * Ajoute une transaction
   */
  async addTransaction(transactionData) {
    return apiCall('/financial/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData)
    });
  },

  /**
   * Supprime une transaction
   */
  async deleteTransaction(transactionId) {
    return apiCall(`/financial/transactions/${transactionId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Met à jour une transaction
   */
  async updateTransaction(transactionId, transactionData) {
    return apiCall(`/financial/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData)
    });
  },

  /**
   * Récupère les statistiques financières
   */
  async getStats(period = 'month') {
    return apiCall(`/financial/stats?period=${period}`);
  }
};

export default financialApi;