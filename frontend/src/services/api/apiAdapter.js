// Architecture API-ready avec adaptateurs
// Impact: Facilite la future migration vers un backend
// Préserve la compatibilité avec localStorage actuel

import { useState, useEffect, useCallback } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../../utils/storage';
import { globalCache } from '../../utils/cache';

// Configuration de l'adaptateur API
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3004/api',
  timeout: 10000,
  retries: 3,
  fallbackToLocal: true // Fallback vers localStorage si API indisponible
};

// États de connexion API
export const API_STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  ERROR: 'error'
};

class ApiAdapter {
  constructor() {
    this.status = API_STATUS.OFFLINE;
    this.baseURL = API_CONFIG.baseURL;
    this.token = null;
  }

  // Vérifier la disponibilité de l'API
  async checkApiAvailability() {
    try {
      // TODO: Ping endpoint quand le backend sera disponible
      // const response = await fetch(`${this.baseURL}/health`);
      // this.status = response.ok ? API_STATUS.ONLINE : API_STATUS.ERROR;
      this.status = API_STATUS.OFFLINE; // Pour l'instant, toujours offline
    } catch (error) {
      this.status = API_STATUS.ERROR;
    }
    return this.status;
  }

  // Méthode générique pour les requêtes API
  async request(endpoint, options = {}) {
    const cacheKey = `api_${endpoint}_${JSON.stringify(options)}`;

    // Vérifier le cache d'abord
    const cachedResponse = globalCache.get(cacheKey);
    if (cachedResponse && options.method !== 'POST') {
      return { data: cachedResponse, fromCache: true };
    }

    try {
      if (this.status === API_STATUS.ONLINE) {
        // TODO: Implémentation réelle de l'API
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            ...options.headers
          },
          timeout: API_CONFIG.timeout
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        // Mettre en cache la réponse
        if (options.method !== 'POST') {
          globalCache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes
        }

        return { data, fromCache: false };
      }
    } catch (error) {
      console.warn('API indisponible, fallback vers localStorage:', error);
    }

    // Fallback vers localStorage
    return this.handleLocalStorageFallback(endpoint, options);
  }

  // Gestion du fallback localStorage
  handleLocalStorageFallback(endpoint, options) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;

    // Mapping des endpoints vers les clés localStorage
    const localStorageMap = {
      '/user/data': 'userData',
      '/transactions': 'transactions',
      '/transport/trips': 'tripHistory',
      '/transport/preferences': 'transportPreferences',
      '/ai/suggestions': 'aiSuggestions'
    };

    const storageKey = localStorageMap[endpoint];
    if (!storageKey) {
      throw new Error(`Endpoint non mappé: ${endpoint}`);
    }

    switch (method) {
      case 'GET':
        return {
          data: loadFromLocalStorage(storageKey, null),
          fromCache: false,
          source: 'localStorage'
        };

      case 'POST':
      case 'PUT':
        saveToLocalStorage(storageKey, body);
        return {
          data: body,
          fromCache: false,
          source: 'localStorage'
        };

      case 'DELETE':
        saveToLocalStorage(storageKey, null);
        return {
          data: null,
          fromCache: false,
          source: 'localStorage'
        };

      default:
        throw new Error(`Méthode HTTP non supportée: ${method}`);
    }
  }

  // Méthodes spécialisées pour chaque type de données
  async getUserData() {
    return this.request('/user/data');
  }

  async updateUserData(userData) {
    return this.request('/user/data', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async getTransactions() {
    return this.request('/transactions');
  }

  async addTransaction(transaction) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    });
  }

  async getAISuggestions(category, answers) {
    return this.request('/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify({ category, answers })
    });
  }

  // Méthodes de gestion des tokens (pour future authentification)
  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }
}

// Instance globale de l'adaptateur
export const apiAdapter = new ApiAdapter();


export const useApiAdapter = () => {
  const [apiStatus, setApiStatus] = useState(API_STATUS.OFFLINE);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await apiAdapter.checkApiAvailability();
      setApiStatus(status);
    };

    checkStatus();
    // Vérifier le statut API toutes les 30 secondes
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const makeRequest = useCallback(async (endpoint, options) => {
    try {
      return await apiAdapter.request(endpoint, options);
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }, []);

  return {
    apiStatus,
    makeRequest,
    adapter: apiAdapter
  };
};