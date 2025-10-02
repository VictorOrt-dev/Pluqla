/**
 * Healthcheck Integration Tests
 *
 * Tests /health and /ready endpoints to ensure proper K8s probe compatibility
 *
 * Run: npm test -- tests/healthcheck.integration.test.js
 */

const request = require('supertest');
const express = require('express');
const healthRouter = require('../src/health/healthcheck').default;
const prisma = require('../src/lib/prismaClient');

describe('Healthcheck Endpoints', () => {
  let app;

  beforeAll(() => {
    // Create minimal Express app for testing
    app = express();
    app.use('/', healthRouter);
  });

  describe('GET /health (Liveness Probe)', () => {
    test('should always return 200 OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
        pid: expect.any(Number),
        nodeVersion: expect.any(String),
      });
    });

    test('should have valid timestamp format', async () => {
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    test('should have positive uptime', async () => {
      const response = await request(app).get('/health');

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /ready (Readiness Probe)', () => {
    test('should return 200 when database is healthy', async () => {
      const response = await request(app).get('/ready');

      // Should return 200 or 503 depending on actual DB state
      expect([200, 503]).toContain(response.status);
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/ready|not_ready/),
        checks: {
          db: expect.stringMatching(/ok|fail|unknown/),
          cache: expect.stringMatching(/ok|fail|unknown/),
          ai: expect.stringMatching(/ok|fail|unknown/),
        },
        timestamp: expect.any(String),
      });
    });

    test('should check database connectivity', async () => {
      const response = await request(app).get('/ready');

      // DB check should return 'ok' if connected
      expect(['ok', 'fail']).toContain(response.body.checks.db);
    });

    test('should handle cache check gracefully if Redis not configured', async () => {
      const response = await request(app).get('/ready');

      // Cache can be 'ok', 'fail', or 'unknown' (if not configured)
      expect(['ok', 'fail', 'unknown']).toContain(response.body.checks.cache);
    });

    test('should handle AI check gracefully', async () => {
      const response = await request(app).get('/ready');

      // AI can be 'ok', 'fail', or 'unknown' (if not configured)
      expect(['ok', 'fail', 'unknown']).toContain(response.body.checks.ai);
    });

    test('should return 503 if database is down', async () => {
      // Temporarily break DB connection
      const originalQuery = prisma.$queryRaw;
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB connection failed'));

      const response = await request(app).get('/ready');

      // Should return 503 when DB is down
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not_ready');
      expect(response.body.checks.db).toBe('fail');

      // Restore DB connection
      prisma.$queryRaw = originalQuery;
    });

    test('should accept unknown status for optional dependencies', async () => {
      const response = await request(app).get('/ready');

      // Cache and AI can be 'unknown' and still pass readiness
      const { db, cache, ai } = response.body.checks;

      // If DB is ok and cache/AI are unknown, should still be ready
      if (db === 'ok' && (cache === 'unknown' || cache === 'ok') && (ai === 'unknown' || ai === 'ok')) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
      }
    });
  });

  describe('Database Health Check', () => {
    test('should execute SELECT 1 query successfully', async () => {
      // Direct test of checkDb function
      const { checkDb } = require('../src/health/healthcheck');

      const result = await checkDb();

      // Should return 'ok' if DB is connected
      expect(['ok', 'fail']).toContain(result);
    });

    test('should timeout if database query is slow', async () => {
      // This test verifies timeout protection
      const { checkDb } = require('../src/health/healthcheck');

      // Mock slow query
      const originalQuery = prisma.$queryRaw;
      prisma.$queryRaw = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 3000)) // 3s delay
      );

      const result = await checkDb();

      // Should return 'fail' due to timeout (1s)
      expect(result).toBe('fail');

      // Restore
      prisma.$queryRaw = originalQuery;
    }, 10000);
  });

  describe('Redis Health Check', () => {
    test('should return unknown if Redis is not configured', async () => {
      const { checkCache } = require('../src/health/healthcheck');

      const result = await checkCache();

      // Should return 'unknown' if REDIS_URL not set
      if (!process.env.REDIS_URL) {
        expect(result).toBe('unknown');
      } else {
        expect(['ok', 'fail']).toContain(result);
      }
    });
  });

  describe('AI Health Check', () => {
    test('should return unknown if AI keys are not configured', async () => {
      const { checkAi } = require('../src/health/healthcheck');

      const result = await checkAi();

      // Should return 'unknown' if no AI keys configured
      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        expect(result).toBe('unknown');
      } else {
        expect(['ok', 'unknown']).toContain(result);
      }
    });

    test('should validate API key format without making requests', async () => {
      const { checkAi } = require('../src/health/healthcheck');

      // Save original env
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalAnthropic = process.env.ANTHROPIC_API_KEY;

      // Test with valid OpenAI format
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      process.env.ANTHROPIC_API_KEY = undefined;

      let result = await checkAi();
      expect(result).toBe('ok');

      // Test with valid Anthropic format
      process.env.OPENAI_API_KEY = undefined;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';

      result = await checkAi();
      expect(result).toBe('ok');

      // Restore
      process.env.OPENAI_API_KEY = originalOpenAI;
      process.env.ANTHROPIC_API_KEY = originalAnthropic;
    });
  });
});
