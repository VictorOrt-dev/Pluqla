/**
 * Exponential Backoff Retry Utility
 *
 * Provides intelligent retry logic with:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Circuit breaker pattern
 * - Retry metrics and logging
 */

import { frontendPerformanceMonitor } from './performanceMonitor';

class RetryManager {
  constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffFactor: 2,
      jitterFactor: 0.1, // 10% jitter
      retryableErrors: ['NETWORK_ERROR', 'SERVER_ERROR', 'RATE_LIMIT'],
      nonRetryableErrors: ['AUTHENTICATION', 'VALIDATION_ERROR', 'NOT_FOUND']
    };

    this.metrics = {
      totalAttempts: 0,
      totalRetries: 0,
      successAfterRetry: 0,
      finalFailures: 0,
      circuitBreakerTrips: 0
    };

    // Circuit breaker state per endpoint
    this.circuitBreakers = new Map();
  }

  /**
   * Main retry function with exponential backoff
   */
  async withRetry(operation, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const operationId = config.operationId || 'unknown';

    this.metrics.totalAttempts++;

    let lastError = null;
    let attempt = 0;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(operationId)) {
      throw new Error(`Circuit breaker is open for operation: ${operationId}`);
    }

    while (attempt <= finalConfig.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Record success
        if (attempt > 0) {
          this.metrics.successAfterRetry++;
          console.info(`✅ Operation succeeded after ${attempt} retries: ${operationId}`, {
            attempts: attempt + 1,
            totalDuration: duration
          });
        }

        // Reset circuit breaker on success
        this.resetCircuitBreaker(operationId);

        // Track performance
        frontendPerformanceMonitor.trackUserInteraction(`retry-${operationId}`, duration);

        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        // Check if error is retryable
        if (!this.isRetryableError(error, finalConfig)) {
          console.debug(`❌ Non-retryable error for ${operationId}:`, error.message);
          this.recordFailure(operationId);
          throw error;
        }

        // If we've exhausted retries
        if (attempt > finalConfig.maxRetries) {
          console.warn(`❌ Max retries exceeded for ${operationId}`, {
            attempts: attempt,
            error: error.message
          });
          this.metrics.finalFailures++;
          this.recordFailure(operationId);
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, finalConfig);

        console.warn(`🔄 Retrying ${operationId} (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}) after ${delay}ms`, {
          error: error.message,
          errorCategory: error.category
        });

        this.metrics.totalRetries++;

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    this.recordFailure(operationId);
    throw lastError;
  }

  /**
   * Check if error is retryable based on configuration
   */
  isRetryableError(error, config) {
    const errorCategory = error.category || 'UNKNOWN';

    // Check non-retryable errors first
    if (config.nonRetryableErrors.includes(errorCategory)) {
      return false;
    }

    // Check retryable errors
    if (config.retryableErrors.includes(errorCategory)) {
      return true;
    }

    // Handle specific error types
    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      return true; // Network errors are retryable
    }

    if (error.status) {
      // Retryable HTTP status codes
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: baseDelay * (backoffFactor ^ attempt)
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);

    // Apply jitter to prevent thundering herd
    const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
    delay += jitter;

    // Cap at maximum delay
    delay = Math.min(delay, config.maxDelay);

    // Ensure minimum delay
    delay = Math.max(delay, config.baseDelay / 2);

    return Math.round(delay);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitBreakerOpen(operationId) {
    const breaker = this.circuitBreakers.get(operationId);
    if (!breaker) return false;

    const now = Date.now();

    // If circuit is open, check if cooldown period has passed
    if (breaker.state === 'open') {
      if (now - breaker.lastFailure > breaker.cooldownPeriod) {
        // Move to half-open state
        breaker.state = 'half-open';
        console.info(`🔌 Circuit breaker half-open for ${operationId}`);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record operation failure for circuit breaker
   */
  recordFailure(operationId) {
    const now = Date.now();
    let breaker = this.circuitBreakers.get(operationId);

    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailure: now,
        state: 'closed',
        cooldownPeriod: 60000, // 1 minute
        failureThreshold: 5
      };
      this.circuitBreakers.set(operationId, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = now;

    // Trip circuit breaker if threshold exceeded
    if (breaker.failures >= breaker.failureThreshold && breaker.state === 'closed') {
      breaker.state = 'open';
      this.metrics.circuitBreakerTrips++;
      console.warn(`🚨 Circuit breaker tripped for ${operationId}`, {
        failures: breaker.failures,
        threshold: breaker.failureThreshold
      });
    }
  }

  /**
   * Reset circuit breaker on successful operation
   */
  resetCircuitBreaker(operationId) {
    const breaker = this.circuitBreakers.get(operationId);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      console.debug(`🔌 Circuit breaker reset for ${operationId}`);
    }
  }

  /**
   * Get retry metrics
   */
  getMetrics() {
    const circuitBreakerInfo = Array.from(this.circuitBreakers.entries()).map(([id, breaker]) => ({
      operationId: id,
      state: breaker.state,
      failures: breaker.failures,
      lastFailure: breaker.lastFailure
    }));

    return {
      ...this.metrics,
      retryRate: this.metrics.totalAttempts > 0
        ? ((this.metrics.totalRetries / this.metrics.totalAttempts) * 100).toFixed(1) + '%'
        : '0%',
      successRateAfterRetry: this.metrics.totalRetries > 0
        ? ((this.metrics.successAfterRetry / this.metrics.totalRetries) * 100).toFixed(1) + '%'
        : '0%',
      circuitBreakers: circuitBreakerInfo
    };
  }

  /**
   * Reset all metrics and circuit breakers
   */
  reset() {
    this.metrics = {
      totalAttempts: 0,
      totalRetries: 0,
      successAfterRetry: 0,
      finalFailures: 0,
      circuitBreakerTrips: 0
    };
    this.circuitBreakers.clear();
  }

  /**
   * Configure default retry settings
   */
  configure(newDefaults) {
    this.defaultConfig = { ...this.defaultConfig, ...newDefaults };
    console.info('Retry manager configuration updated:', newDefaults);
  }
}

// Create singleton instance
export const retryManager = new RetryManager();

/**
 * Convenience function for simple retry operations
 */
export async function withRetry(operation, config = {}) {
  return retryManager.withRetry(operation, config);
}

/**
 * Higher-order function to add retry logic to any function
 */
export function withRetryWrapper(fn, retryConfig = {}) {
  return async function(...args) {
    return retryManager.withRetry(
      () => fn.apply(this, args),
      {
        ...retryConfig,
        operationId: retryConfig.operationId || fn.name || 'wrapped-function'
      }
    );
  };
}

// Make retry manager available globally for debugging
if (typeof window !== 'undefined') {
  window.retryManager = retryManager;
}

export default retryManager;