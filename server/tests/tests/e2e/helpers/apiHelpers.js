const { test, expect } = require('@playwright/test');

/**
 * API TESTING HELPERS FOR E2E TESTS
 *
 * Common utilities for testing Pluqla API endpoints with:
 * - Authentication handling
 * - Response validation
 * - Security assertions
 * - Error handling
 */

class APIHelpers {
  constructor(request, baseURL) {
    this.request = request;
    this.baseURL = baseURL || 'http://localhost:3004';
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(method, endpoint, options = {}) {
    const { token, ...requestOptions } = options;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(requestOptions.headers || {})
    };

    return await this.request[method.toLowerCase()](`${this.baseURL}${endpoint}`, {
      ...requestOptions,
      headers
    });
  }

  /**
   * POST request helper
   */
  async post(endpoint, data = {}, options = {}) {
    return await this.authenticatedRequest('POST', endpoint, {
      data,
      ...options
    });
  }

  /**
   * GET request helper
   */
  async get(endpoint, options = {}) {
    return await this.authenticatedRequest('GET', endpoint, options);
  }

  /**
   * PUT request helper
   */
  async put(endpoint, data = {}, options = {}) {
    return await this.authenticatedRequest('PUT', endpoint, {
      data,
      ...options
    });
  }

  /**
   * DELETE request helper
   */
  async delete(endpoint, options = {}) {
    return await this.authenticatedRequest('DELETE', endpoint, options);
  }

  /**
   * Register new user
   */
  async registerUser(userData) {
    const response = await this.post('/api/auth/register', userData);

    // Validate response structure
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Validate registration response
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('user');
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('refreshToken');

    // Security assertions
    expect(data.data.user).not.toHaveProperty('password');
    expect(data.data.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*$/);

    return {
      user: data.data.user,
      accessToken: data.data.token,
      refreshToken: data.data.refreshToken
    };
  }

  /**
   * Login user
   */
  async loginUser(email, password) {
    const response = await this.post('/api/auth/login', { email, password });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Validate login response
    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('user');
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('refreshToken');

    // Security assertions
    expect(data.data.user).not.toHaveProperty('password');

    return {
      user: data.data.user,
      accessToken: data.data.token,
      refreshToken: data.data.refreshToken
    };
  }

  /**
   * Validate token
   */
  async validateToken(token) {
    const response = await this.get('/api/auth/verify', { token });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data).toHaveProperty('message', 'Token valide');
    expect(data).toHaveProperty('user');
    expect(data.user).not.toHaveProperty('password');

    return data.user;
  }

  /**
   * Logout user
   */
  async logoutUser(refreshToken) {
    const response = await this.post('/api/auth/logout', { refreshToken });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('success', true);

    return data;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const response = await this.post('/api/auth/forgot-password', { email });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Should always return success for security (no email enumeration)
    expect(data).toHaveProperty('success', true);
    expect(data.message).toContain('réinitialisation');

    return data;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const response = await this.post('/api/auth/reset-password', {
      token,
      password: newPassword
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data.message).toContain('réinitialisé');

    return data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await this.post('/api/auth/refresh', { refreshToken });

    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${response.status()} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('tokens');
    expect(data.data.tokens).toHaveProperty('accessToken');
    expect(data.data.tokens).toHaveProperty('refreshToken');

    return data.data.tokens;
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(token, limit = 50) {
    const response = await this.get(`/api/transactions?limit=${limit}`, { token });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data).toBeInstanceOf(Array);

    return data.data;
  }

  /**
   * Create transaction
   */
  async createTransaction(token, transactionData) {
    const response = await this.post('/api/transactions', transactionData, { token });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('id');

    return data.data;
  }

  /**
   * Assert API error response
   */
  async assertErrorResponse(response, expectedStatus, expectedErrorCode = null) {
    expect(response.status()).toBe(expectedStatus);

    const data = await response.json();

    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');

    if (expectedErrorCode) {
      expect(data).toHaveProperty('code', expectedErrorCode);
    }

    // Security assertion: no sensitive data in error
    const errorString = JSON.stringify(data).toLowerCase();
    expect(errorString).not.toMatch(/password|token|secret|key/);

    return data;
  }

  /**
   * Assert response time is acceptable
   */
  assertResponseTime(startTime, maxMs = 1000) {
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(maxMs);
    return duration;
  }

  /**
   * Generate unique test user data
   */
  generateTestUser(prefix = 'e2e') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);

    return {
      email: `${prefix}-${timestamp}-${random}@e2etest.com`,
      password: 'TestPassword123!',
      name: `Test User ${timestamp}`
    };
  }

  /**
   * Generate test transaction data
   */
  generateTestTransaction() {
    const categories = ['alimentation', 'transport', 'loisirs', 'habits'];
    const types = ['saving', 'expense'];

    return {
      amount: Math.floor(Math.random() * 100) + 10,
      category: categories[Math.floor(Math.random() * categories.length)],
      type: types[Math.floor(Math.random() * types.length)],
      description: `E2E Test Transaction ${Date.now()}`
    };
  }

  /**
   * Wait for condition with timeout
   */
  async waitFor(condition, timeoutMs = 5000, intervalMs = 100) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = await condition();
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Measure API performance
   */
  async measurePerformance(apiCall) {
    const startTime = Date.now();
    const result = await apiCall();
    const duration = Date.now() - startTime;

    return {
      result,
      duration,
      isAcceptable: duration < 1000 // < 1 second is acceptable
    };
  }
}

/**
 * Create API helper instance for test
 */
function createAPIHelper(request, baseURL) {
  return new APIHelpers(request, baseURL);
}

module.exports = {
  APIHelpers,
  createAPIHelper
};