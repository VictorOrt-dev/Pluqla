/**
 * Gestionnaire sécurisé de tokens JWT pour Pluqla
 * Centralise et sécurise l'accès aux tokens d'authentification
 */

import secureLogger from './secureLogger';
import { safeJsonParse } from './security';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData'
};

/**
 * Validate JWT token format (basic check)
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if token format is valid
 */
const isValidJwtFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    // Try to decode the header and payload (without verification)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Basic structure check
    return header && payload && typeof header === 'object' && typeof payload === 'object';
  } catch (error) {
    return false;
  }
};

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  if (!isValidJwtFormat(token)) {
    return true;
  }

  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));

    if (!payload.exp) {
      // If no expiration, consider it expired for security
      return true;
    }

    // Check if token is expired (with 30 second buffer)
    const currentTime = Math.floor(Date.now() / 1000);
    const bufferTime = 30; // seconds

    return payload.exp < (currentTime + bufferTime);
  } catch (error) {
    secureLogger.warn('Error checking token expiration:', error.message);
    return true;
  }
};

/**
 * Extract user data from JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} User data or null if invalid
 */
const extractUserFromToken = (token) => {
  if (!isValidJwtFormat(token)) {
    return null;
  }

  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));

    return {
      id: payload.sub || payload.userId,
      email: payload.email,
      name: payload.name,
      exp: payload.exp,
      iat: payload.iat
    };
  } catch (error) {
    secureLogger.warn('Error extracting user from token:', error.message);
    return null;
  }
};

/**
 * Secure token storage management
 */
class TokenManager {
  constructor() {
    this.listeners = [];
    this.lastValidation = null;
  }

  /**
   * Store access token securely
   * @param {string} token - JWT access token
   * @returns {boolean} True if stored successfully
   */
  setAccessToken(token) {
    if (!token) {
      this.clearAccessToken();
      return false;
    }

    if (!isValidJwtFormat(token)) {
      secureLogger.warn('Invalid JWT token format provided');
      return false;
    }

    if (isTokenExpired(token)) {
      secureLogger.warn('Attempting to store expired token');
      return false;
    }

    try {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
      this.lastValidation = Date.now();
      this.notifyListeners('access_token_set');

      secureLogger.sensitive('Access token stored');
      return true;
    } catch (error) {
      secureLogger.error('Error storing access token:', error);
      return false;
    }
  }

  /**
   * Get access token if valid
   * @returns {string|null} Valid access token or null
   */
  getAccessToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);

      if (!token) {
        return null;
      }

      if (!isValidJwtFormat(token)) {
        secureLogger.warn('Invalid token format found, clearing');
        this.clearAccessToken();
        return null;
      }

      if (isTokenExpired(token)) {
        secureLogger.info('Access token expired, clearing');
        this.clearAccessToken();
        return null;
      }

      return token;
    } catch (error) {
      secureLogger.error('Error retrieving access token:', error);
      this.clearAccessToken();
      return null;
    }
  }

  /**
   * Store refresh token securely
   * @param {string} refreshToken - Refresh token
   * @returns {boolean} True if stored successfully
   */
  setRefreshToken(refreshToken) {
    if (!refreshToken) {
      this.clearRefreshToken();
      return false;
    }

    try {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      this.notifyListeners('refresh_token_set');

      secureLogger.sensitive('Refresh token stored');
      return true;
    } catch (error) {
      secureLogger.error('Error storing refresh token:', error);
      return false;
    }
  }

  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken() {
    try {
      return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    } catch (error) {
      secureLogger.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  /**
   * Store user data securely
   * @param {Object} userData - User data object
   * @returns {boolean} True if stored successfully
   */
  setUserData(userData) {
    if (!userData || typeof userData !== 'object') {
      this.clearUserData();
      return false;
    }

    try {
      const jsonData = JSON.stringify(userData);
      localStorage.setItem(TOKEN_KEYS.USER_DATA, jsonData);
      this.notifyListeners('user_data_set', userData);

      secureLogger.debug('User data stored');
      return true;
    } catch (error) {
      secureLogger.error('Error storing user data:', error);
      return false;
    }
  }

  /**
   * Get user data
   * @returns {Object|null} User data object or null
   */
  getUserData() {
    try {
      const jsonData = localStorage.getItem(TOKEN_KEYS.USER_DATA);
      return safeJsonParse(jsonData, null);
    } catch (error) {
      secureLogger.error('Error retrieving user data:', error);
      return null;
    }
  }

  /**
   * Clear access token
   */
  clearAccessToken() {
    try {
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      this.notifyListeners('access_token_cleared');
      secureLogger.debug('Access token cleared');
    } catch (error) {
      secureLogger.error('Error clearing access token:', error);
    }
  }

  /**
   * Clear refresh token
   */
  clearRefreshToken() {
    try {
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      this.notifyListeners('refresh_token_cleared');
      secureLogger.debug('Refresh token cleared');
    } catch (error) {
      secureLogger.error('Error clearing refresh token:', error);
    }
  }

  /**
   * Clear user data
   */
  clearUserData() {
    try {
      localStorage.removeItem(TOKEN_KEYS.USER_DATA);
      this.notifyListeners('user_data_cleared');
      secureLogger.debug('User data cleared');
    } catch (error) {
      secureLogger.error('Error clearing user data:', error);
    }
  }

  /**
   * Clear all authentication data
   */
  clearAll() {
    this.clearAccessToken();
    this.clearRefreshToken();
    this.clearUserData();

    // Clear other auth-related data
    const authKeys = ['authMode', 'currentScreen', 'lastManualNavigation'];
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        secureLogger.warn(`Error clearing ${key}:`, error);
      }
    });

    this.notifyListeners('all_cleared');
    secureLogger.info('All authentication data cleared');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    const token = this.getAccessToken();
    return token !== null;
  }

  /**
   * Get authentication state
   * @returns {Object} Authentication state object
   */
  getAuthState() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const userData = this.getUserData();

    return {
      isAuthenticated: accessToken !== null,
      hasRefreshToken: refreshToken !== null,
      hasUserData: userData !== null,
      user: userData,
      tokenExpiration: accessToken ? extractUserFromToken(accessToken)?.exp : null
    };
  }

  /**
   * Store tokens from authentication response
   * @param {Object} authData - Authentication response data
   * @returns {boolean} True if stored successfully
   */
  storeAuthData(authData) {
    if (!authData || typeof authData !== 'object') {
      return false;
    }

    let success = true;

    if (authData.token || authData.accessToken) {
      const token = authData.token || authData.accessToken;
      if (!this.setAccessToken(token)) {
        success = false;
      }
    }

    if (authData.refreshToken) {
      if (!this.setRefreshToken(authData.refreshToken)) {
        success = false;
      }
    }

    if (authData.user) {
      if (!this.setUserData(authData.user)) {
        success = false;
      }
    }

    if (success) {
      secureLogger.success('Authentication data stored successfully');
    } else {
      secureLogger.error('Failed to store some authentication data');
    }

    return success;
  }

  /**
   * Add listener for token events
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of token events
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        secureLogger.error('Error in token listener:', error);
      }
    });
  }

  /**
   * Get debug information (for development)
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    if (process.env.NODE_ENV !== 'development') {
      return { message: 'Debug info only available in development' };
    }

    const authState = this.getAuthState();
    const accessToken = this.getAccessToken();

    return {
      ...authState,
      tokenFormat: accessToken ? 'valid' : 'invalid',
      lastValidation: this.lastValidation,
      listenersCount: this.listeners.length
    };
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

export default tokenManager;
export { TokenManager, isValidJwtFormat, isTokenExpired, extractUserFromToken };