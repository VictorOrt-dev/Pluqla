// Service de gestion multi-utilisateurs backend-ready
// Impact: Prépare l'architecture pour backend + support multi-utilisateurs
// Compatible: localStorage actuel avec migration automatique vers API future

import { saveToLocalStorage, loadFromLocalStorage } from '../../utils/storage';
import { apiAdapter } from '../api/apiAdapter';
import { globalCache } from '../../utils/cache';
import { INITIAL_USER_DATA } from '../../utils/constants';

// Configuration multi-utilisateurs
const USER_CONFIG = {
  maxLocalUsers: 5, // Limite locale avant migration backend
  sessionTimeout: 24 * 60 * 60 * 1000, // 24h
  anonymousUserPrefix: 'anon_'
};

class UserService {
  constructor() {
    this.currentUserId = null;
    this.isBackendMode = false;
    this.sessionToken = null;
    this.userCache = new Map();
  }

  // Initialisation du service utilisateur
  async initialize() {
    // Vérifier si on peut utiliser le backend
    const apiStatus = await apiAdapter.checkApiAvailability();
    this.isBackendMode = apiStatus === 'online';

    // Récupérer l'utilisateur actuel ou créer un utilisateur anonyme
    const savedUserId = loadFromLocalStorage('currentUserId', null);

    if (savedUserId && await this.userExists(savedUserId)) {
      this.currentUserId = savedUserId;
    } else {
      // Créer un nouvel utilisateur anonyme
      this.currentUserId = await this.createAnonymousUser();
    }

    return this.currentUserId;
  }

  // Créer un utilisateur anonyme
  async createAnonymousUser() {
    const anonymousId = `${USER_CONFIG.anonymousUserPrefix}${Date.now()}`;

    const userData = {
      ...INITIAL_USER_DATA,
      id: anonymousId,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      // Structure backend-ready
      profile: {
        name: INITIAL_USER_DATA.name,
        preferences: {
          theme: 'system', // 'light', 'dark', 'system'
          notifications: true,
          language: 'fr'
        }
      },
      // Données séparées pour future migration backend
      savings: {
        amount: INITIAL_USER_DATA.savedAmount,
        monthlyGoal: INITIAL_USER_DATA.monthlyGoal,
        streak: INITIAL_USER_DATA.streak
      },
      gamification: {
        level: INITIAL_USER_DATA.level,
        points: 0,
        badges: [],
        dailyChallenges: {}
      },
      subscription: {
        isPremium: INITIAL_USER_DATA.isPremium,
        plansUsedThisMonth: INITIAL_USER_DATA.plansUsedThisMonth,
        premiumExpiresAt: null
      }
    };

    await this.saveUserData(anonymousId, userData);
    saveToLocalStorage('currentUserId', anonymousId);

    return anonymousId;
  }

  // Vérifier si un utilisateur existe
  async userExists(userId) {
    try {
      if (this.isBackendMode) {
        const response = await apiAdapter.request(`/users/${userId}`);
        return response.data !== null;
      } else {
        const userData = loadFromLocalStorage(`user_${userId}`, null);
        return userData !== null;
      }
    } catch (error) {
      return false;
    }
  }

  // Récupérer les données utilisateur
  async getUserData(userId = null) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return null;

    // Vérifier le cache d'abord
    const cacheKey = `user_data_${targetUserId}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    try {
      let userData;

      if (this.isBackendMode) {
        const response = await apiAdapter.request(`/users/${targetUserId}`);
        userData = response.data;
      } else {
        userData = loadFromLocalStorage(`user_${targetUserId}`, null);

        // Migration des anciennes données vers la nouvelle structure
        if (userData && !userData.profile) {
          userData = this.migrateUserDataStructure(userData);
          await this.saveUserData(targetUserId, userData);
        }
      }

      if (userData) {
        // Mettre à jour la dernière activité
        userData.lastActiveAt = new Date().toISOString();
        globalCache.set(cacheKey, userData, 5 * 60 * 1000); // 5 minutes
      }

      return userData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      return null;
    }
  }

  // Sauvegarder les données utilisateur
  async saveUserData(userId, userData) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) throw new Error('Aucun utilisateur spécifié');

    try {
      // Ajouter les métadonnées
      userData.id = targetUserId;
      userData.updatedAt = new Date().toISOString();

      if (this.isBackendMode) {
        await apiAdapter.request(`/users/${targetUserId}`, {
          method: 'PUT',
          body: JSON.stringify(userData)
        });
      } else {
        saveToLocalStorage(`user_${targetUserId}`, userData);

        // Maintenir la liste des utilisateurs locaux
        const localUsers = loadFromLocalStorage('localUsers', []);
        if (!localUsers.includes(targetUserId)) {
          localUsers.push(targetUserId);
          // Limiter le nombre d'utilisateurs locaux
          if (localUsers.length > USER_CONFIG.maxLocalUsers) {
            const oldestUser = localUsers.shift();
            this.removeLocalUser(oldestUser);
          }
          saveToLocalStorage('localUsers', localUsers);
        }
      }

      // Mettre à jour le cache
      const cacheKey = `user_data_${targetUserId}`;
      globalCache.set(cacheKey, userData, 5 * 60 * 1000);

      return userData;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données utilisateur:', error);
      throw error;
    }
  }

  // Migrer les anciennes données vers la nouvelle structure
  migrateUserDataStructure(oldData) {
    return {
      id: oldData.id || this.currentUserId,
      isAnonymous: true,
      createdAt: oldData.joinDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),

      // Structure nouvelle
      profile: {
        name: oldData.name || 'Louis',
        preferences: {
          theme: 'system',
          notifications: true,
          language: 'fr'
        }
      },

      savings: {
        amount: oldData.savedAmount || 0,
        monthlyGoal: oldData.monthlyGoal || 800,
        streak: oldData.streak || 0
      },

      gamification: {
        level: oldData.level || 1,
        points: oldData.gamificationPoints || 0,
        badges: oldData.badges || [],
        dailyChallenges: oldData.dailyChallenges || {}
      },

      subscription: {
        isPremium: oldData.isPremium || false,
        plansUsedThisMonth: oldData.plansUsedThisMonth || 0,
        premiumExpiresAt: null
      },

      // Conserver les anciennes données pour compatibilité
      ...oldData
    };
  }

  // Changer d'utilisateur actuel
  async switchUser(userId) {
    if (await this.userExists(userId)) {
      this.currentUserId = userId;
      saveToLocalStorage('currentUserId', userId);

      // Invalider le cache utilisateur
      globalCache.clear();

      return await this.getUserData(userId);
    }
    throw new Error(`Utilisateur ${userId} non trouvé`);
  }

  // Obtenir la liste des utilisateurs locaux
  getLocalUsers() {
    if (this.isBackendMode) return [];

    const localUsers = loadFromLocalStorage('localUsers', []);
    return localUsers.map(userId => {
      const userData = loadFromLocalStorage(`user_${userId}`, null);
      return userData ? {
        id: userId,
        name: userData.profile?.name || userData.name || 'Utilisateur',
        lastActiveAt: userData.lastActiveAt,
        isAnonymous: userData.isAnonymous || false
      } : null;
    }).filter(Boolean);
  }

  // Supprimer un utilisateur local
  removeLocalUser(userId) {
    if (this.isBackendMode) return;

    // Supprimer les données utilisateur
    localStorage.removeItem(`user_${userId}`);

    // Supprimer des listes
    const localUsers = loadFromLocalStorage('localUsers', []);
    const updatedUsers = localUsers.filter(id => id !== userId);
    saveToLocalStorage('localUsers', updatedUsers);

    // Supprimer du cache
    globalCache.delete(`user_data_${userId}`);
  }

  // Créer un utilisateur authentifié (futur backend)
  async createAuthenticatedUser(email, password) {
    if (!this.isBackendMode) {
      throw new Error('Authentification non disponible en mode hors ligne');
    }

    try {
      const response = await apiAdapter.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const { user, token } = response.data;
      this.sessionToken = token;
      this.currentUserId = user.id;

      saveToLocalStorage('sessionToken', token);
      saveToLocalStorage('currentUserId', user.id);

      return user;
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      throw error;
    }
  }

  // Authentifier un utilisateur existant (futur backend)
  async authenticateUser(email, password) {
    if (!this.isBackendMode) {
      throw new Error('Authentification non disponible en mode hors ligne');
    }

    try {
      const response = await apiAdapter.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const { user, token } = response.data;
      this.sessionToken = token;
      this.currentUserId = user.id;

      saveToLocalStorage('sessionToken', token);
      saveToLocalStorage('currentUserId', user.id);

      return user;
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
      throw error;
    }
  }

  // Déconnexion
  async logout() {
    this.sessionToken = null;
    this.currentUserId = null;

    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUserId');
    globalCache.clear();
  }

  // Getters
  getCurrentUserId() {
    return this.currentUserId;
  }

  isAuthenticated() {
    return !!(this.sessionToken || this.currentUserId);
  }

  isInBackendMode() {
    return this.isBackendMode;
  }
}

// Instance globale
export const userService = new UserService();

// Hook React pour utiliser le service utilisateur
import { useState, useEffect, useCallback } from 'react';

export const useUserService = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendMode, setIsBackendMode] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        await userService.initialize();
        const userData = await userService.getUserData();
        setCurrentUser(userData);
        setIsBackendMode(userService.isInBackendMode());
      } catch (error) {
        console.error('Erreur initialisation utilisateur:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const updateUser = useCallback(async (updates) => {
    if (!currentUser) return;

    const updatedData = { ...currentUser, ...updates };
    await userService.saveUserData(null, updatedData);
    setCurrentUser(updatedData);
  }, [currentUser]);

  const switchUser = useCallback(async (userId) => {
    const userData = await userService.switchUser(userId);
    setCurrentUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await userService.logout();
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    isLoading,
    isBackendMode,
    updateUser,
    switchUser,
    logout,
    userService
  };
};