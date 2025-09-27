/**
 * Retry Utils Tests
 *
 * Tests for Phase 3 exponential backoff retry functionality:
 * - Exponential backoff with jitter
 * - Retry condition evaluation
 * - Circuit breaker pattern
 * - Retry metrics tracking
 * - Error categorization
 */

import { RetryManager, withRetry, withRetryWrapper } from '../retryUtils';

// Mock performance monitor
jest.mock('../performanceMonitor', () => ({
  frontendPerformanceMonitor: {
    trackUserInteraction: jest.fn()
  }
}));

describe('RetryManager', () => {
  let retryManager;
  let consoleSpy;

  beforeEach(() => {
    retryManager = new RetryManager();
    retryManager.reset();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Basic Retry Logic', () => {
    test('should succeed without retries on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.withRetry(mockOperation, {
        operationId: 'test-success'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(retryManager.metrics.totalAttempts).toBe(1);
      expect(retryManager.metrics.totalRetries).toBe(0);
    });

    test('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({ category: 'NETWORK_ERROR', message: 'Network failed' })
        .mockRejectedValueOnce({ category: 'SERVER_ERROR', message: 'Server error' })
        .mockResolvedValueOnce('success');

      const result = await retryManager.withRetry(mockOperation, {
        operationId: 'test-retry',
        maxRetries: 3
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(retryManager.metrics.totalRetries).toBe(2);
      expect(retryManager.metrics.successAfterRetry).toBe(1);
    });

    test('should not retry on non-retryable errors', async () => {
      const authError = { category: 'AUTHENTICATION', message: 'Unauthorized' };
      const mockOperation = jest.fn().mockRejectedValue(authError);

      await expect(retryManager.withRetry(mockOperation, {
        operationId: 'test-auth-error'
      })).rejects.toEqual(authError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(retryManager.metrics.totalRetries).toBe(0);
    });

    test('should fail after max retries exceeded', async () => {
      const networkError = { category: 'NETWORK_ERROR', message: 'Network failed' };
      const mockOperation = jest.fn().mockRejectedValue(networkError);

      await expect(retryManager.withRetry(mockOperation, {
        operationId: 'test-max-retries',
        maxRetries: 2
      })).rejects.toEqual(networkError);

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(retryManager.metrics.totalRetries).toBe(2);
      expect(retryManager.metrics.finalFailures).toBe(1);
    });
  });

  describe('Exponential Backoff', () => {
    test('should calculate delay with exponential backoff', () => {
      const config = {
        baseDelay: 1000,
        backoffFactor: 2,
        maxDelay: 30000,
        jitterFactor: 0
      };

      const delay1 = retryManager.calculateDelay(1, config);
      const delay2 = retryManager.calculateDelay(2, config);
      const delay3 = retryManager.calculateDelay(3, config);

      expect(delay1).toBe(1000); // 1000 * 2^0
      expect(delay2).toBe(2000); // 1000 * 2^1
      expect(delay3).toBe(4000); // 1000 * 2^2
    });

    test('should respect maximum delay', () => {
      const config = {
        baseDelay: 1000,
        backoffFactor: 2,
        maxDelay: 3000,
        jitterFactor: 0
      };

      const delay4 = retryManager.calculateDelay(4, config); // Would be 8000 without cap

      expect(delay4).toBe(3000);
    });

    test('should apply jitter to prevent thundering herd', () => {
      const config = {
        baseDelay: 1000,
        backoffFactor: 2,
        maxDelay: 30000,
        jitterFactor: 0.1
      };

      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(retryManager.calculateDelay(1, config));
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be within expected range (900-1100ms with 10% jitter)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(900);
        expect(delay).toBeLessThanOrEqual(1100);
      });
    });

    test('should enforce minimum delay', () => {
      const config = {
        baseDelay: 1000,
        backoffFactor: 0.5, // Would result in very small delays
        maxDelay: 30000,
        jitterFactor: 0
      };

      const delay = retryManager.calculateDelay(5, config);

      expect(delay).toBeGreaterThanOrEqual(500); // baseDelay / 2
    });
  });

  describe('Error Classification', () => {
    test('should identify retryable errors by category', () => {
      const retryableErrors = [
        { category: 'NETWORK_ERROR' },
        { category: 'SERVER_ERROR' },
        { category: 'RATE_LIMIT' }
      ];

      const nonRetryableErrors = [
        { category: 'AUTHENTICATION' },
        { category: 'VALIDATION_ERROR' },
        { category: 'NOT_FOUND' }
      ];

      const config = retryManager.defaultConfig;

      retryableErrors.forEach(error => {
        expect(retryManager.isRetryableError(error, config)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(retryManager.isRetryableError(error, config)).toBe(false);
      });
    });

    test('should identify retryable errors by status code', () => {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      const nonRetryableStatusCodes = [400, 401, 403, 404, 422];

      const config = retryManager.defaultConfig;

      retryableStatusCodes.forEach(status => {
        const error = { status };
        expect(retryManager.isRetryableError(error, config)).toBe(true);
      });

      nonRetryableStatusCodes.forEach(status => {
        const error = { status };
        expect(retryManager.isRetryableError(error, config)).toBe(false);
      });
    });

    test('should identify network errors as retryable', () => {
      const networkErrors = [
        { name: 'TypeError', message: 'Failed to fetch' },
        { name: 'TypeError', message: 'Network request failed' }
      ];

      const config = retryManager.defaultConfig;

      networkErrors.forEach(error => {
        expect(retryManager.isRetryableError(error, config)).toBe(true);
      });
    });

    test('should default to non-retryable for unknown errors', () => {
      const unknownError = { message: 'Unknown error' };
      const config = retryManager.defaultConfig;

      expect(retryManager.isRetryableError(unknownError, config)).toBe(false);
    });
  });

  describe('Circuit Breaker', () => {
    test('should trip circuit breaker after threshold failures', async () => {
      const operationId = 'circuit-breaker-test';
      const error = { category: 'NETWORK_ERROR', message: 'Network failed' };
      const mockOperation = jest.fn().mockRejectedValue(error);

      // Configure circuit breaker with low threshold for testing
      const breaker = {
        failures: 0,
        lastFailure: Date.now(),
        state: 'closed',
        cooldownPeriod: 60000,
        failureThreshold: 3
      };
      retryManager.circuitBreakers.set(operationId, breaker);

      // Cause enough failures to trip the breaker
      for (let i = 0; i < 3; i++) {
        try {
          await retryManager.withRetry(mockOperation, {
            operationId,
            maxRetries: 0
          });
        } catch (e) {
          // Expected to fail
        }
      }

      expect(retryManager.circuitBreakers.get(operationId).state).toBe('open');
      expect(retryManager.metrics.circuitBreakerTrips).toBe(1);

      // Next attempt should fail immediately due to open circuit
      await expect(retryManager.withRetry(mockOperation, {
        operationId,
        maxRetries: 1
      })).rejects.toThrow('Circuit breaker is open');
    });

    test('should reset circuit breaker on successful operation', async () => {
      const operationId = 'circuit-reset-test';

      // Set up a circuit breaker in failed state
      retryManager.circuitBreakers.set(operationId, {
        failures: 3,
        lastFailure: Date.now(),
        state: 'closed',
        cooldownPeriod: 60000,
        failureThreshold: 5
      });

      const mockOperation = jest.fn().mockResolvedValue('success');

      await retryManager.withRetry(mockOperation, { operationId });

      const breaker = retryManager.circuitBreakers.get(operationId);
      expect(breaker.failures).toBe(0);
      expect(breaker.state).toBe('closed');
    });

    test('should transition to half-open after cooldown period', () => {
      const operationId = 'half-open-test';
      const pastTime = Date.now() - 70000; // 70 seconds ago

      retryManager.circuitBreakers.set(operationId, {
        failures: 5,
        lastFailure: pastTime,
        state: 'open',
        cooldownPeriod: 60000, // 1 minute
        failureThreshold: 5
      });

      const isOpen = retryManager.isCircuitBreakerOpen(operationId);
      const breaker = retryManager.circuitBreakers.get(operationId);

      expect(isOpen).toBe(false);
      expect(breaker.state).toBe('half-open');
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should track comprehensive metrics', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');
      const retryOperation = jest.fn()
        .mockRejectedValueOnce({ category: 'NETWORK_ERROR' })
        .mockResolvedValueOnce('success');
      const failOperation = jest.fn().mockRejectedValue({ category: 'NETWORK_ERROR' });

      // Successful operation
      await retryManager.withRetry(successOperation, { operationId: 'success' });

      // Operation that succeeds after retry
      await retryManager.withRetry(retryOperation, { operationId: 'retry' });

      // Operation that fails completely
      try {
        await retryManager.withRetry(failOperation, {
          operationId: 'fail',
          maxRetries: 1
        });
      } catch (e) {
        // Expected
      }

      const metrics = retryManager.getMetrics();

      expect(metrics.totalAttempts).toBe(3);
      expect(metrics.totalRetries).toBe(2); // 1 from retryOperation + 1 from failOperation
      expect(metrics.successAfterRetry).toBe(1);
      expect(metrics.finalFailures).toBe(1);
      expect(metrics.retryRate).toBe('66.7%'); // 2/3 * 100
      expect(metrics.successRateAfterRetry).toBe('50.0%'); // 1/2 * 100
    });

    test('should provide circuit breaker status in metrics', () => {
      retryManager.circuitBreakers.set('test1', {
        state: 'open',
        failures: 5,
        lastFailure: Date.now()
      });

      retryManager.circuitBreakers.set('test2', {
        state: 'closed',
        failures: 1,
        lastFailure: Date.now()
      });

      const metrics = retryManager.getMetrics();

      expect(metrics.circuitBreakers).toHaveLength(2);
      expect(metrics.circuitBreakers[0].operationId).toBe('test1');
      expect(metrics.circuitBreakers[0].state).toBe('open');
      expect(metrics.circuitBreakers[1].operationId).toBe('test2');
      expect(metrics.circuitBreakers[1].state).toBe('closed');
    });
  });

  describe('Configuration', () => {
    test('should use custom configuration', async () => {
      const customConfig = {
        maxRetries: 5,
        baseDelay: 500,
        retryableErrors: ['CUSTOM_ERROR'],
        nonRetryableErrors: ['NETWORK_ERROR'] // Override default
      };

      const mockOperation = jest.fn().mockRejectedValue({
        category: 'NETWORK_ERROR',
        message: 'Network failed'
      });

      // Should not retry because NETWORK_ERROR is in nonRetryableErrors
      await expect(retryManager.withRetry(mockOperation, customConfig)).rejects.toEqual({
        category: 'NETWORK_ERROR',
        message: 'Network failed'
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should configure default settings', () => {
      const newDefaults = {
        maxRetries: 5,
        baseDelay: 2000
      };

      retryManager.configure(newDefaults);

      expect(retryManager.defaultConfig.maxRetries).toBe(5);
      expect(retryManager.defaultConfig.baseDelay).toBe(2000);
      // Should preserve other defaults
      expect(retryManager.defaultConfig.backoffFactor).toBe(2);
    });
  });

  describe('Utility Functions', () => {
    test('withRetry function should work as standalone', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(mockOperation, {
        operationId: 'standalone-test'
      });

      expect(result).toBe('success');
    });

    test('withRetryWrapper should create retry-enabled function', async () => {
      const originalFunction = jest.fn()
        .mockRejectedValueOnce({ category: 'NETWORK_ERROR' })
        .mockResolvedValueOnce('wrapped-success');

      const wrappedFunction = withRetryWrapper(originalFunction, {
        operationId: 'wrapped-test',
        maxRetries: 2
      });

      const result = await wrappedFunction('arg1', 'arg2');

      expect(result).toBe('wrapped-success');
      expect(originalFunction).toHaveBeenCalledTimes(2);
      expect(originalFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('sleep utility should wait for specified duration', async () => {
      const start = Date.now();
      await retryManager.sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Edge Cases', () => {
    test('should handle operations that throw non-Error objects', async () => {
      const mockOperation = jest.fn().mockRejectedValue('string error');

      await expect(retryManager.withRetry(mockOperation, {
        operationId: 'string-error'
      })).rejects.toBe('string error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should handle zero max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue({
        category: 'NETWORK_ERROR'
      });

      await expect(retryManager.withRetry(mockOperation, {
        operationId: 'no-retries',
        maxRetries: 0
      })).rejects.toEqual({ category: 'NETWORK_ERROR' });

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should handle negative delays gracefully', () => {
      const config = {
        baseDelay: -1000,
        backoffFactor: 2,
        maxDelay: 30000,
        jitterFactor: 0
      };

      const delay = retryManager.calculateDelay(1, config);

      expect(delay).toBeGreaterThan(0);
    });

    test('should reset all state correctly', () => {
      // Add some state
      retryManager.metrics.totalAttempts = 10;
      retryManager.metrics.totalRetries = 5;
      retryManager.circuitBreakers.set('test', { state: 'open' });

      retryManager.reset();

      expect(retryManager.metrics.totalAttempts).toBe(0);
      expect(retryManager.metrics.totalRetries).toBe(0);
      expect(retryManager.circuitBreakers.size).toBe(0);
    });
  });
});