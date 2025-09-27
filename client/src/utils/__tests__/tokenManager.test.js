/**
 * Tests unitaires pour TokenManager
 */

import tokenManager, {
  isValidJwtFormat,
  isTokenExpired,
  extractUserFromToken
} from '../tokenManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// JWT tokens de test (générés pour les tests, pas de vrais secrets)
const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.4Z0p7SZFqP4KQ_jRg6p3DjNcJk5aF2xLNyFtQP6zB4o';
const EXPIRED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
const INVALID_JWT = 'invalid.token.format';

describe('TokenManager Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('isValidJwtFormat', () => {
    test('should validate correct JWT format', () => {
      expect(isValidJwtFormat(VALID_JWT)).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(isValidJwtFormat('invalid')).toBe(false);
      expect(isValidJwtFormat('two.parts')).toBe(false);
      expect(isValidJwtFormat('one.two.three.four')).toBe(false);
      expect(isValidJwtFormat('')).toBe(false);
      expect(isValidJwtFormat(null)).toBe(false);
      expect(isValidJwtFormat(undefined)).toBe(false);
    });

    test('should reject malformed base64', () => {
      const malformedToken = 'invalid-base64.invalid-base64.invalid-base64';
      expect(isValidJwtFormat(malformedToken)).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    test('should detect expired tokens', () => {
      expect(isTokenExpired(EXPIRED_JWT)).toBe(true);
    });

    test('should detect non-expired tokens', () => {
      expect(isTokenExpired(VALID_JWT)).toBe(false);
    });

    test('should consider invalid tokens as expired', () => {
      expect(isTokenExpired(INVALID_JWT)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired(null)).toBe(true);
    });

    test('should consider tokens without expiration as expired', () => {
      const noExpToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.invalid';
      expect(isTokenExpired(noExpToken)).toBe(true);
    });
  });

  describe('extractUserFromToken', () => {
    test('should extract user data from valid token', () => {
      const userData = extractUserFromToken(VALID_JWT);

      expect(userData).toEqual({
        id: '1234567890',
        email: 'test@example.com',
        name: 'John Doe',
        exp: 9999999999,
        iat: 1516239022
      });
    });

    test('should return null for invalid tokens', () => {
      expect(extractUserFromToken(INVALID_JWT)).toBeNull();
      expect(extractUserFromToken('')).toBeNull();
      expect(extractUserFromToken(null)).toBeNull();
    });
  });
});

describe('TokenManager Class', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset tokenManager state
    tokenManager.clearAll();
  });

  describe('setAccessToken', () => {
    test('should store valid token', () => {
      const result = tokenManager.setAccessToken(VALID_JWT);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', VALID_JWT);
    });

    test('should reject invalid token format', () => {
      const result = tokenManager.setAccessToken('invalid-token');

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should reject expired tokens', () => {
      const result = tokenManager.setAccessToken(EXPIRED_JWT);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should clear token when null provided', () => {
      tokenManager.setAccessToken(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('getAccessToken', () => {
    test('should return valid token', () => {
      localStorageMock.getItem.mockReturnValue(VALID_JWT);

      const token = tokenManager.getAccessToken();

      expect(token).toBe(VALID_JWT);
    });

    test('should return null for expired token and clear it', () => {
      localStorageMock.getItem.mockReturnValue(EXPIRED_JWT);

      const token = tokenManager.getAccessToken();

      expect(token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });

    test('should return null when no token stored', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const token = tokenManager.getAccessToken();

      expect(token).toBeNull();
    });

    test('should clear invalid token format', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');

      const token = tokenManager.getAccessToken();

      expect(token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('setRefreshToken', () => {
    test('should store refresh token', () => {
      const refreshToken = 'refresh-token-123';
      const result = tokenManager.setRefreshToken(refreshToken);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', refreshToken);
    });

    test('should clear when null provided', () => {
      tokenManager.setRefreshToken(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('getRefreshToken', () => {
    test('should return stored refresh token', () => {
      const refreshToken = 'refresh-token-123';
      localStorageMock.getItem.mockReturnValue(refreshToken);

      const result = tokenManager.getRefreshToken();

      expect(result).toBe(refreshToken);
    });

    test('should return null when not stored', () => {
      const result = tokenManager.getRefreshToken();

      expect(result).toBeNull();
    });
  });

  describe('setUserData', () => {
    test('should store user data as JSON', () => {
      const userData = { id: 1, name: 'John', email: 'john@example.com' };
      const result = tokenManager.setUserData(userData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userData',
        JSON.stringify(userData)
      );
    });

    test('should clear when null provided', () => {
      tokenManager.setUserData(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData');
    });

    test('should reject non-object data', () => {
      const result = tokenManager.setUserData('string-data');

      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData');
    });
  });

  describe('getUserData', () => {
    test('should parse and return user data', () => {
      const userData = { id: 1, name: 'John' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));

      const result = tokenManager.getUserData();

      expect(result).toEqual(userData);
    });

    test('should return null for invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = tokenManager.getUserData();

      expect(result).toBeNull();
    });

    test('should return null when not stored', () => {
      const result = tokenManager.getUserData();

      expect(result).toBeNull();
    });
  });

  describe('clearAll', () => {
    test('should clear all authentication data', () => {
      tokenManager.clearAll();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authMode');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentScreen');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lastManualNavigation');
    });
  });

  describe('isAuthenticated', () => {
    test('should return true for valid token', () => {
      localStorageMock.getItem.mockReturnValue(VALID_JWT);

      const result = tokenManager.isAuthenticated();

      expect(result).toBe(true);
    });

    test('should return false for invalid token', () => {
      localStorageMock.getItem.mockReturnValue(INVALID_JWT);

      const result = tokenManager.isAuthenticated();

      expect(result).toBe(false);
    });

    test('should return false when no token', () => {
      const result = tokenManager.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getAuthState', () => {
    test('should return complete auth state', () => {
      const userData = { id: 1, name: 'John' };

      localStorageMock.getItem.mockImplementation((key) => {
        switch (key) {
          case 'token': return VALID_JWT;
          case 'refreshToken': return 'refresh-123';
          case 'userData': return JSON.stringify(userData);
          default: return null;
        }
      });

      const authState = tokenManager.getAuthState();

      expect(authState).toEqual({
        isAuthenticated: true,
        hasRefreshToken: true,
        hasUserData: true,
        user: userData,
        tokenExpiration: 9999999999
      });
    });

    test('should return empty state when not authenticated', () => {
      const authState = tokenManager.getAuthState();

      expect(authState).toEqual({
        isAuthenticated: false,
        hasRefreshToken: false,
        hasUserData: false,
        user: null,
        tokenExpiration: null
      });
    });
  });

  describe('storeAuthData', () => {
    test('should store complete auth data', () => {
      const authData = {
        token: VALID_JWT,
        refreshToken: 'refresh-123',
        user: { id: 1, name: 'John' }
      };

      const result = tokenManager.storeAuthData(authData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', VALID_JWT);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(authData.user));
    });

    test('should handle accessToken property', () => {
      const authData = {
        accessToken: VALID_JWT,
        refreshToken: 'refresh-123'
      };

      const result = tokenManager.storeAuthData(authData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', VALID_JWT);
    });

    test('should return false for invalid data', () => {
      const result = tokenManager.storeAuthData(null);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    test('should add and notify listeners', () => {
      const listener = jest.fn();
      tokenManager.addListener(listener);

      tokenManager.setAccessToken(VALID_JWT);

      expect(listener).toHaveBeenCalledWith('access_token_set', undefined);
    });

    test('should remove listeners', () => {
      const listener = jest.fn();
      tokenManager.addListener(listener);
      tokenManager.removeListener(listener);

      tokenManager.setAccessToken(VALID_JWT);

      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      tokenManager.addListener(errorListener);

      // Should not throw
      expect(() => {
        tokenManager.setAccessToken(VALID_JWT);
      }).not.toThrow();
    });
  });

  describe('getDebugInfo', () => {
    test('should return debug info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      localStorageMock.getItem.mockReturnValue(VALID_JWT);
      const debugInfo = tokenManager.getDebugInfo();

      expect(debugInfo).toHaveProperty('isAuthenticated', true);
      expect(debugInfo).toHaveProperty('tokenFormat', 'valid');

      process.env.NODE_ENV = originalEnv;
    });

    test('should restrict debug info in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const debugInfo = tokenManager.getDebugInfo();

      expect(debugInfo).toEqual({
        message: 'Debug info only available in development'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});