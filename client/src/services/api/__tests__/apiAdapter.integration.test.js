/**
 * API Adapter Integration Tests
 * Tests for enhanced API adapter with Phase 2 improvements
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import { apiAdapter, ERROR_CATEGORIES } from '../apiAdapter';
import secureLogger from '../../../utils/secureLogger';

// Mock dependencies
jest.mock('../../../utils/secureLogger');

// Mock fetch
global.fetch = jest.fn();

describe('API Adapter Integration Tests', () => {
  const mockAuthContext = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    refreshAuthToken: jest.fn(),
    logout: jest.fn()
  };

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    apiAdapter.init(mockAuthContext);
  });

  describe('Universal Response Format Handling', () => {
    it('should handle v2.0.0 success response format', async () => {
      const mockResponse = {
        success: true,
        data: { user: { id: 1, name: 'Test User' } },
        meta: {
          timestamp: '2024-01-01T00:00:00.000Z',
          executionTime: '50ms',
          requestId: 'req-123',
          apiVersion: '2.0.0'
        },
        errors: []
      };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'application/json'],
          ['x-request-id', 'req-123']
        ]),
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiAdapter.get('/users/profile');

      expect(result).toEqual({
        data: { user: { id: 1, name: 'Test User' } },
        status: 200,
        headers: expect.any(Map),
        meta: {
          timestamp: '2024-01-01T00:00:00.000Z',
          executionTime: '50ms',
          requestId: 'req-123',
          apiVersion: '2.0.0'
        }
      });
    });

    it('should handle legacy response format for backward compatibility', async () => {
      const legacyResponse = {
        user: { id: 1, name: 'Test User' }
      };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue(legacyResponse)
      });

      const result = await apiAdapter.get('/users/profile');

      expect(result).toEqual({
        data: legacyResponse,
        status: 200,
        headers: expect.any(Map),
        meta: {
          apiVersion: 'legacy',
          backwardCompatibility: true
        }
      });
    });

    it('should handle v2.0.0 error response format', async () => {
      const mockErrorResponse = {
        success: false,
        data: null,
        meta: {
          timestamp: '2024-01-01T00:00:00.000Z',
          executionTime: '25ms',
          requestId: 'req-error-123',
          apiVersion: '2.0.0'
        },
        errors: [
          { message: 'Validation failed', field: 'email' },
          { message: 'Password too short', field: 'password' }
        ]
      };

      fetch.mockResolvedValue({
        ok: false,
        status: 422,
        headers: new Map([
          ['content-type', 'application/json'],
          ['x-request-id', 'req-error-123']
        ]),
        json: jest.fn().mockResolvedValue(mockErrorResponse)
      });

      try {
        await apiAdapter.post('/auth/register', { email: 'invalid', password: '123' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('API Error');
        expect(error.status).toBe(422);
        expect(error.details).toEqual([
          { message: 'Validation failed', field: 'email' },
          { message: 'Password too short', field: 'password' }
        ]);
        expect(error.meta).toEqual({
          timestamp: '2024-01-01T00:00:00.000Z',
          executionTime: '25ms',
          requestId: 'req-error-123',
          apiVersion: '2.0.0'
        });
      }
    });
  });

  describe('Authentication and Token Management', () => {
    it('should include authorization header for authenticated requests', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: {} })
      });

      await apiAdapter.get('/protected-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/protected-endpoint`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
    });

    it('should handle token refresh on 401 error', async () => {
      // First call fails with 401
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [{ message: 'Token expired' }]
        })
      });

      // Token refresh succeeds
      mockAuthContext.refreshAuthToken.mockResolvedValue('new-access-token');

      // Retry succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: { result: 'success' } })
      });

      const result = await apiAdapter.get('/protected-endpoint');

      expect(mockAuthContext.refreshAuthToken).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ result: 'success' });
      expect(secureLogger.info).toHaveBeenCalledWith('Token refreshed, retrying request');
    });

    it('should prevent race conditions during token refresh', async () => {
      // Mock two simultaneous requests that both get 401
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Map(),
          json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Token expired' }] })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Map(),
          json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Token expired' }] })
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map(),
          json: jest.fn().mockResolvedValue({ success: true, data: { result: 'success' } })
        });

      mockAuthContext.refreshAuthToken.mockResolvedValue('new-token');

      // Make two simultaneous requests
      const [result1, result2] = await Promise.all([
        apiAdapter.get('/endpoint1'),
        apiAdapter.get('/endpoint2')
      ]);

      // Token refresh should only be called once
      expect(mockAuthContext.refreshAuthToken).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual({ result: 'success' });
      expect(result2.data).toEqual({ result: 'success' });
      expect(secureLogger.debug).toHaveBeenCalledWith('Token refresh already in progress, waiting...');
    });

    it('should logout user after token refresh failure', async () => {
      // First call fails with 401
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Token expired' }] })
      });

      // Token refresh fails
      mockAuthContext.refreshAuthToken.mockRejectedValue(new Error('Refresh failed'));

      try {
        await apiAdapter.get('/protected-endpoint');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION_ERROR);
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(secureLogger.error).toHaveBeenCalledWith('Token refresh failed, logging out user');
      }
    });
  });

  describe('Error Categorization', () => {
    it('should categorize 401 errors correctly', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Unauthorized' }] })
      });

      mockAuthContext.refreshAuthToken.mockRejectedValue(new Error('Refresh failed'));

      try {
        await apiAdapter.get('/protected');
        fail('Should have thrown');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION_ERROR);
      }
    });

    it('should categorize 429 errors correctly', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '60']]),
        json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Rate limited' }] })
      });

      try {
        await apiAdapter.get('/api-endpoint');
        fail('Should have thrown');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.RATE_LIMIT);
        expect(error.retryAfter).toBe(60);
      }
    });

    it('should categorize 5xx errors correctly', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: false, errors: [{ message: 'Internal server error' }] })
      });

      try {
        await apiAdapter.get('/api-endpoint');
        fail('Should have thrown');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.SERVER_ERROR);
      }
    });

    it('should categorize network errors correctly', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      try {
        await apiAdapter.get('/api-endpoint');
        fail('Should have thrown');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.NETWORK_ERROR);
        expect(error.message).toBe('Network error');
      }
    });

    it('should categorize timeout errors correctly', async () => {
      // Mock a timeout
      jest.useFakeTimers();

      const fetchPromise = new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ data: 'success' })
        }), 35000); // Longer than timeout
      });

      fetch.mockReturnValue(fetchPromise);

      const requestPromise = apiAdapter.get('/slow-endpoint');

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(30000);

      try {
        await requestPromise;
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.TIMEOUT_ERROR);
        expect(error.message).toContain('Request timeout');
      }

      jest.useRealTimers();
    });
  });

  describe('Request Configuration', () => {
    it('should send POST requests with correct content type and body', async () => {
      const requestData = { name: 'Test', email: 'test@example.com' };

      fetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: { id: 1, ...requestData } })
      });

      await apiAdapter.post('/users', requestData);

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/users`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token'
          }),
          body: JSON.stringify(requestData)
        })
      );
    });

    it('should send PUT requests correctly', async () => {
      const updateData = { name: 'Updated Name' };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: updateData })
      });

      await apiAdapter.put('/users/1', updateData);

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/users/1`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should send DELETE requests correctly', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: { deleted: true } })
      });

      await apiAdapter.delete('/users/1');

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/users/1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
    });

    it('should handle query parameters correctly', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: [] })
      });

      await apiAdapter.get('/users', { limit: 10, offset: 0, sort: 'name' });

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/users?limit=10&offset=0&sort=name`,
        expect.any(Object)
      );
    });

    it('should handle array query parameters correctly', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: [] })
      });

      await apiAdapter.get('/users', {
        categories: ['finance', 'food'],
        tags: ['urgent', 'personal']
      });

      const expectedUrl = `${API_BASE_URL}/users?categories=finance%2Cfood&tags=urgent%2Cpersonal`;
      expect(fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      // Reset stats
      apiAdapter.clearPendingRequests();
    });

    it('should track request statistics', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: true, data: {} })
      });

      await apiAdapter.get('/endpoint1');
      await apiAdapter.post('/endpoint2', {});

      // Force an error
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ success: false, errors: [] })
      });

      try {
        await apiAdapter.get('/error-endpoint');
      } catch (error) {
        // Expected error
      }

      const stats = apiAdapter.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.activeRequests).toBe(0);
    });

    it('should clear pending requests', async () => {
      // Create a slow request
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true, data: {} })
        }), 1000);
      });

      fetch.mockReturnValue(slowPromise);

      // Start request but don't wait
      const requestPromise = apiAdapter.get('/slow-endpoint');

      // Check that there's an active request
      expect(apiAdapter.getStats().activeRequests).toBe(1);

      // Clear pending requests
      apiAdapter.clearPendingRequests();

      // The request should be aborted
      try {
        await requestPromise;
        fail('Request should have been aborted');
      } catch (error) {
        expect(error.name).toBe('AbortError');
      }

      expect(apiAdapter.getStats().activeRequests).toBe(0);
    });
  });

  describe('Response Processing', () => {
    it('should handle non-JSON responses gracefully', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/html']]),
        json: jest.fn().mockRejectedValue(new Error('Not JSON')),
        text: jest.fn().mockResolvedValue('<html><body>Server Error</body></html>')
      });

      try {
        await apiAdapter.get('/broken-endpoint');
        fail('Should have thrown');
      } catch (error) {
        expect(error.category).toBe(ERROR_CATEGORIES.SERVER_ERROR);
        expect(error.message).toBe('API Error');
      }
    });

    it('should handle empty responses', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 204, // No Content
        headers: new Map(),
        json: jest.fn().mockRejectedValue(new Error('No content'))
      });

      const result = await apiAdapter.delete('/users/1');

      expect(result).toEqual({
        data: null,
        status: 204,
        headers: expect.any(Map),
        meta: {
          apiVersion: 'legacy',
          backwardCompatibility: true
        }
      });
    });

    it('should preserve response headers', async () => {
      const mockHeaders = new Map([
        ['x-request-id', 'req-123'],
        ['x-rate-limit-remaining', '99'],
        ['content-type', 'application/json']
      ]);

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: jest.fn().mockResolvedValue({ success: true, data: { test: 'data' } })
      });

      const result = await apiAdapter.get('/test-endpoint');

      expect(result.headers).toBe(mockHeaders);
      expect(result.headers.get('x-request-id')).toBe('req-123');
      expect(result.headers.get('x-rate-limit-remaining')).toBe('99');
    });
  });
});