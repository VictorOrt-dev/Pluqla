/**
 * Cache Service Tests
 *
 * Tests for Phase 3 frontend caching functionality:
 * - Cache hit/miss scenarios
 * - TTL-based expiration
 * - LRU eviction policy
 * - Cache invalidation strategies
 * - Background refresh functionality
 * - Performance metrics
 */

import { CacheService } from '../cacheService';

// Mock performance monitor
jest.mock('../../utils/performanceMonitor', () => ({
  frontendPerformanceMonitor: {
    trackApiCall: jest.fn()
  }
}));

describe('CacheService', () => {
  let cacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    cacheService.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cacheService.stopCleanup();
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve cache entries', () => {
      const endpoint = '/users/me';
      const params = { lang: 'fr' };
      const data = { id: 1, name: 'Test User' };

      cacheService.set(endpoint, params, data);
      const cached = cacheService.get(endpoint, params);

      expect(cached).toEqual(data);
      expect(cacheService.metrics.hits).toBe(1);
      expect(cacheService.metrics.misses).toBe(0);
    });

    test('should return null for cache miss', () => {
      const cached = cacheService.get('/non-existent', {});

      expect(cached).toBeNull();
      expect(cacheService.metrics.hits).toBe(0);
      expect(cacheService.metrics.misses).toBe(1);
    });

    test('should generate correct cache keys', () => {
      const endpoint = '/api/test';
      const params1 = { a: 1, b: 2 };
      const params2 = { b: 2, a: 1 }; // Different order, same content

      const key1 = cacheService.generateKey(endpoint, params1);
      const key2 = cacheService.generateKey(endpoint, params2);

      expect(key1).toBe(key2); // Should be same regardless of param order
      expect(key1).toBe('/api/test?a=1&b=2');
    });

    test('should clone data to prevent mutations', () => {
      const endpoint = '/test';
      const originalData = { value: 1, nested: { count: 5 } };

      cacheService.set(endpoint, {}, originalData);
      const cached = cacheService.get(endpoint, {});

      // Mutate the cached data
      cached.value = 999;
      cached.nested.count = 999;

      // Original should be unchanged
      const cachedAgain = cacheService.get(endpoint, {});
      expect(cachedAgain.value).toBe(1);
      expect(cachedAgain.nested.count).toBe(5);
    });
  });

  describe('TTL and Expiration', () => {
    test('should respect custom TTL', async () => {
      const endpoint = '/short-lived';
      const data = { test: true };
      const shortTTL = 100; // 100ms

      cacheService.set(endpoint, {}, data, shortTTL);

      // Should be available immediately
      expect(cacheService.get(endpoint, {})).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(cacheService.get(endpoint, {})).toBeNull();
    });

    test('should use endpoint-specific TTL configuration', () => {
      const financialEndpoint = '/financial/summary';
      const userEndpoint = '/users/profile';

      cacheService.set(financialEndpoint, {}, { test: 'financial' });
      cacheService.set(userEndpoint, {}, { test: 'user' });

      const financialEntry = cacheService.cache.get(financialEndpoint);
      const userEntry = cacheService.cache.get(userEndpoint);

      // Financial should have 2 minute TTL (120000ms)
      expect(financialEntry.ttl).toBe(2 * 60 * 1000);

      // User should have 10 minute TTL (600000ms)
      expect(userEntry.ttl).toBe(10 * 60 * 1000);
    });

    test('should handle stale data with grace period', async () => {
      const endpoint = '/test-stale';
      const data = { test: 'stale' };
      const shortTTL = 50;

      cacheService.set(endpoint, {}, data, shortTTL);

      // Wait for expiration but within grace period
      await new Promise(resolve => setTimeout(resolve, 60));

      const cached = cacheService.get(endpoint, {});

      // Should still return data but marked as stale
      expect(cached).toEqual({ ...data, _isStale: true });
    });
  });

  describe('LRU Eviction', () => {
    test('should evict oldest entries when cache is full', () => {
      // Set small cache size for testing
      cacheService.maxSize = 3;

      // Fill cache to capacity
      cacheService.set('/item1', {}, { id: 1 });
      cacheService.set('/item2', {}, { id: 2 });
      cacheService.set('/item3', {}, { id: 3 });

      expect(cacheService.cache.size).toBe(3);

      // Add one more item, should evict oldest
      cacheService.set('/item4', {}, { id: 4 });

      expect(cacheService.cache.size).toBe(3);
      expect(cacheService.get('/item1', {})).toBeNull(); // Should be evicted
      expect(cacheService.get('/item4', {})).toEqual({ id: 4 }); // Should be present
      expect(cacheService.metrics.evictions).toBe(1);
    });

    test('should update access time on cache hit', () => {
      cacheService.maxSize = 2;

      cacheService.set('/item1', {}, { id: 1 });
      cacheService.set('/item2', {}, { id: 2 });

      // Access item1 to update its access time
      cacheService.get('/item1', {});

      // Add item3, should evict item2 (least recently used)
      cacheService.set('/item3', {}, { id: 3 });

      expect(cacheService.get('/item1', {})).toEqual({ id: 1 }); // Should still be there
      expect(cacheService.get('/item2', {})).toBeNull(); // Should be evicted
      expect(cacheService.get('/item3', {})).toEqual({ id: 3 });
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate entries by pattern', () => {
      cacheService.set('/financial/summary', {}, { type: 'financial' });
      cacheService.set('/financial/dashboard', {}, { type: 'dashboard' });
      cacheService.set('/users/profile', {}, { type: 'user' });
      cacheService.set('/users/settings', {}, { type: 'settings' });

      const deletedCount = cacheService.invalidate('/financial/');

      expect(deletedCount).toBe(2);
      expect(cacheService.get('/financial/summary', {})).toBeNull();
      expect(cacheService.get('/financial/dashboard', {})).toBeNull();
      expect(cacheService.get('/users/profile', {})).toEqual({ type: 'user' });
      expect(cacheService.get('/users/settings', {})).toEqual({ type: 'settings' });
    });

    test('should clear specific endpoint cache', () => {
      cacheService.set('/test/endpoint', { param: 'a' }, { id: 1 });
      cacheService.set('/test/endpoint', { param: 'b' }, { id: 2 });
      cacheService.set('/other/endpoint', {}, { id: 3 });

      const deletedCount = cacheService.clearEndpoint('/test/endpoint');

      expect(deletedCount).toBe(2);
      expect(cacheService.get('/test/endpoint', { param: 'a' })).toBeNull();
      expect(cacheService.get('/test/endpoint', { param: 'b' })).toBeNull();
      expect(cacheService.get('/other/endpoint', {})).toEqual({ id: 3 });
    });

    test('should clear all cache', () => {
      cacheService.set('/item1', {}, { id: 1 });
      cacheService.set('/item2', {}, { id: 2 });
      cacheService.metrics.hits = 10;
      cacheService.metrics.misses = 5;

      cacheService.clear();

      expect(cacheService.cache.size).toBe(0);
      expect(cacheService.metrics.hits).toBe(0);
      expect(cacheService.metrics.misses).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should track hit rate correctly', () => {
      const endpoint = '/test';
      const data = { test: true };

      cacheService.set(endpoint, {}, data);

      // 3 hits, 2 misses
      cacheService.get(endpoint, {}); // hit
      cacheService.get(endpoint, {}); // hit
      cacheService.get(endpoint, {}); // hit
      cacheService.get('/missing1', {}); // miss
      cacheService.get('/missing2', {}); // miss

      const stats = cacheService.getStats();

      expect(stats.hitRate).toBe('60.0%'); // 3/(3+2) * 100
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(5);
    });

    test('should estimate memory usage', () => {
      cacheService.set('/test', {}, { largeData: 'x'.repeat(1000) });

      const stats = cacheService.getStats();

      expect(stats.memoryUsage.bytes).toBeGreaterThan(1000);
      expect(stats.memoryUsage.kb).toBeDefined();
      expect(stats.memoryUsage.mb).toBeDefined();
    });

    test('should provide entries summary', () => {
      cacheService.set('/recent', {}, { id: 1 });

      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        cacheService.set('/older', {}, { id: 2 });
      }, 10);

      const entries = cacheService.getEntriesSummary();

      expect(entries).toHaveLength(2);
      expect(entries[0].key).toBe('/recent'); // Should be first (most recent)
      expect(entries[0].isValid).toBe(true);
      expect(entries[0].dataSize).toBeGreaterThan(0);
    });
  });

  describe('Background Cleanup', () => {
    test('should cleanup expired entries', async () => {
      const shortTTL = 50;
      cacheService.set('/expired1', {}, { id: 1 }, shortTTL);
      cacheService.set('/expired2', {}, { id: 2 }, shortTTL);
      cacheService.set('/valid', {}, { id: 3 }, 10000); // Long TTL

      expect(cacheService.cache.size).toBe(3);

      // Wait for expiration + grace period
      await new Promise(resolve => setTimeout(resolve, 100));

      const cleanedCount = cacheService.cleanup();

      expect(cleanedCount).toBe(2);
      expect(cacheService.cache.size).toBe(1);
      expect(cacheService.get('/valid', {})).toEqual({ id: 3 });
    });

    test('should start and stop periodic cleanup', () => {
      expect(cacheService.cleanupInterval).toBeUndefined();

      cacheService.startCleanup();
      expect(cacheService.cleanupInterval).toBeDefined();

      cacheService.stopCleanup();
      expect(cacheService.cleanupInterval).toBeNull();
    });
  });

  describe('Preloading', () => {
    test('should preload multiple endpoints', async () => {
      const mockApiFetch = jest.fn()
        .mockResolvedValueOnce({ data: 'user' })
        .mockResolvedValueOnce({ data: 'financial' });

      const endpoints = [
        { endpoint: '/users/me' },
        { endpoint: '/financial/summary', params: { period: 'monthly' } }
      ];

      await cacheService.preload(endpoints, mockApiFetch);

      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(cacheService.get('/users/me', {})).toEqual({ data: 'user' });
      expect(cacheService.get('/financial/summary', { period: 'monthly' })).toEqual({ data: 'financial' });
    });

    test('should handle preload failures gracefully', async () => {
      const mockApiFetch = jest.fn()
        .mockResolvedValueOnce({ data: 'success' })
        .mockRejectedValueOnce(new Error('Network error'));

      const endpoints = [
        { endpoint: '/success' },
        { endpoint: '/failure' }
      ];

      await expect(cacheService.preload(endpoints, mockApiFetch)).resolves.not.toThrow();

      expect(cacheService.get('/success', {})).toEqual({ data: 'success' });
      expect(cacheService.get('/failure', {})).toBeNull();
    });
  });

  describe('Configuration', () => {
    test('should apply correct cache configuration for different endpoints', () => {
      const testCases = [
        { endpoint: '/financial/summary', expectedTTL: 2 * 60 * 1000, backgroundRefresh: true },
        { endpoint: '/users/profile', expectedTTL: 10 * 60 * 1000, backgroundRefresh: false },
        { endpoint: '/categories', expectedTTL: 30 * 60 * 1000, backgroundRefresh: false },
        { endpoint: '/strikes/current', expectedTTL: 30 * 1000, backgroundRefresh: true },
        { endpoint: '/unknown/endpoint', expectedTTL: 5 * 60 * 1000, backgroundRefresh: false }
      ];

      testCases.forEach(({ endpoint, expectedTTL, backgroundRefresh }) => {
        const config = cacheService.getCacheConfig(endpoint);
        expect(config.ttl).toBe(expectedTTL);
        expect(config.backgroundRefresh).toBe(backgroundRefresh);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined data gracefully', () => {
      expect(() => {
        cacheService.set('/null-data', {}, null);
        cacheService.set('/undefined-data', {}, undefined);
      }).not.toThrow();

      expect(cacheService.get('/null-data', {})).toBeNull();
      expect(cacheService.get('/undefined-data', {})).toBeUndefined();
    });

    test('should handle empty endpoint names', () => {
      expect(() => {
        cacheService.set('', {}, { test: true });
        cacheService.set(null, {}, { test: true });
      }).not.toThrow();
    });

    test('should handle circular references in data', () => {
      const circularData = { test: true };
      circularData.self = circularData;

      expect(() => {
        cacheService.set('/circular', {}, circularData);
      }).not.toThrow();
    });

    test('should handle zero or negative TTL', () => {
      cacheService.set('/zero-ttl', {}, { test: true }, 0);
      cacheService.set('/negative-ttl', {}, { test: true }, -1000);

      // Should be immediately expired
      expect(cacheService.get('/zero-ttl', {})).toBeNull();
      expect(cacheService.get('/negative-ttl', {})).toBeNull();
    });
  });
});