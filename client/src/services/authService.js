/**
 * Service d'authentification centralisé pour Pluqla
 * Gère les tokens JWT, l'état de connexion et les appels API auth
 */

class AuthService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || '/api';
    this.tokenKey = 'token';
    this.refreshTokenKey = 'refreshToken';
    this.userKey = 'userData';
  }

  /**
   * Connexion utilisateur
   * @param {string} email
   * @param {string} password
   * @returns {Object} Résultat de la connexion
   */
  async login(email, password) {
    try {
      console.log('📡 Tentative de connexion:', { email, apiUrl: this.apiUrl });

      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': navigator.userAgent || 'Pluqla-Client/1.0'
        },
        body: JSON.stringify({ email, password })
      });

      // CRITICAL SECURITY FIX: Remove sensitive header/data logging
      console.log('📡 Login response status:', response.status);

      const data = await response.json();
      // SECURITY: Only log non-sensitive response status

      if (response.ok && data.success) {
        // Stocker les tokens
        localStorage.setItem(this.tokenKey, data.data.token);
        if (data.data.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        }

        // Stocker les infos utilisateur
        if (data.data.user) {
          localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
        }

        console.log('✅ Connexion réussie');
        return {
          success: true,
          user: data.data.user,
          token: data.data.token,
          message: data.message
        };
      } else {
        console.error('❌ Échec de la connexion:', {
          status: response.status,
          message: data.message,
          error: data.error
        });
        return {
          success: false,
          message: data.message || 'Erreur de connexion',
          error: data.error
        };
      }
    } catch (error) {
      console.error('❌ Erreur réseau lors de la connexion:', {
        message: error.message,
        stack: error.stack,
        apiUrl: this.apiUrl
      });
      return {
        success: false,
        message: 'Erreur de réseau, veuillez réessayer',
        error: error.message
      };
    }
  }

  /**
   * Inscription utilisateur
   * @param {Object} userData - Données d'inscription
   * @returns {Object} Résultat de l'inscription
   */
  async register(userData) {
    try {
      console.log('📡 Tentative d\'inscription:', { userData, apiUrl: this.apiUrl });

      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': navigator.userAgent || 'Pluqla-Client/1.0'
        },
        body: JSON.stringify(userData)
      });

      // CRITICAL SECURITY FIX: Remove sensitive header/data logging
      console.log('📡 Registration response status:', response.status);

      const data = await response.json();
      // SECURITY: Only log non-sensitive status information

      if (response.ok && data.success) {
        // Auto-login après inscription
        if (data.data.token) {
          localStorage.setItem(this.tokenKey, data.data.token);
          if (data.data.refreshToken) {
            localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
          }
          if (data.data.user) {
            localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
          }
        }

        console.log('✅ Inscription réussie');
        return {
          success: true,
          user: data.data.user,
          token: data.data.token,
          message: data.message
        };
      } else {
        console.error('❌ Échec de l\'inscription:', {
          status: response.status,
          message: data.message,
          error: data.error
        });
        return {
          success: false,
          message: data.message || 'Erreur d\'inscription',
          error: data.error
        };
      }
    } catch (error) {
      console.error('❌ Erreur réseau lors de l\'inscription:', {
        message: error.message,
        stack: error.stack,
        apiUrl: this.apiUrl
      });
      return {
        success: false,
        message: 'Erreur de réseau, veuillez réessayer',
        error: error.message
      };
    }
  }

  /**
   * Déconnexion
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('transactions');

    console.log('✅ Déconnexion effectuée');
  }

  /**
   * Vérifier si l'utilisateur est connecté
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;

    try {
      // Vérifier si le token n'est pas expiré
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp < currentTime) {
        console.warn('Token expiré');
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Token malformé:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Obtenir le token actuel
   * @returns {string|null}
   */
  getToken() {
    if (this.isAuthenticated()) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  /**
   * Obtenir les infos utilisateur stockées
   * @returns {Object|null}
   */
  getCurrentUser() {
    try {
      const userData = localStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Erreur parsing userData:', error);
      return null;
    }
  }

  /**
   * Rafraîchir le token avec le refresh token
   * @returns {boolean} Succès du rafraîchissement
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem(this.refreshTokenKey);
      if (!refreshToken) {
        console.warn('Pas de refresh token disponible');
        return false;
      }

      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem(this.tokenKey, data.data.token);
        if (data.data.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        }

        console.log('✅ Token rafraîchi avec succès');
        return true;
      } else {
        console.error('❌ Échec du rafraîchissement du token');
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Faire un appel API authentifié avec gestion auto du token
   * @param {string} endpoint
   * @param {Object} options
   * @returns {Response}
   */
  async authenticatedFetch(endpoint, options = {}) {
    let token = this.getToken();
    if (!token) {
      throw new Error('Utilisateur non authentifié');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;

    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };

    let response = await fetch(url, fetchOptions);

    // Si token expiré, essayer de le rafraîchir
    if (response.status === 401) {
      console.warn('Token expiré, tentative de rafraîchissement...');
      const refreshed = await this.refreshToken();

      if (refreshed) {
        token = this.getToken();
        fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(url, fetchOptions);
      } else {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
    }

    return response;
  }

  /**
   * Vérification de mot de passe oublié
   * @param {string} email
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Email de réinitialisation envoyé');
        return {
          success: true,
          message: data.message
        };
      } else {
        console.error('❌ Échec envoi email réinitialisation:', data.message);
        return {
          success: false,
          message: data.message || 'Erreur lors de l\'envoi'
        };
      }
    } catch (error) {
      console.error('❌ Erreur mot de passe oublié:', error);
      return {
        success: false,
        message: 'Erreur de réseau, veuillez réessayer'
      };
    }
  }

  /**
   * Réinitialisation de mot de passe
   * @param {string} token
   * @param {string} newPassword
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Mot de passe réinitialisé');
        return {
          success: true,
          message: data.message
        };
      } else {
        console.error('❌ Échec réinitialisation:', data.message);
        return {
          success: false,
          message: data.message || 'Erreur de réinitialisation'
        };
      }
    } catch (error) {
      console.error('❌ Erreur réinitialisation:', error);
      return {
        success: false,
        message: 'Erreur de réseau, veuillez réessayer'
      };
    }
  }

  /**
   * Obtenir les statistiques d'utilisation de l'API
   * @returns {Object}
   */
  getApiStats() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!localStorage.getItem(this.tokenKey),
      hasRefreshToken: !!localStorage.getItem(this.refreshTokenKey),
      currentUser: this.getCurrentUser(),
      apiUrl: this.apiUrl
    };
  }
}

// Instance singleton
const authService = new AuthService();

export default authService;