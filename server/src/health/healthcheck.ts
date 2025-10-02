import { Router, Request, Response } from 'express';

const router = Router();
const checkTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '2000', 10);

// Import dependencies
const prisma = require('../lib/prismaClient');

// Redis client (if configured)
let redisClient: any = null;
if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch((err: Error) => {
      console.error('Redis health check client connection failed:', err.message);
      redisClient = null;
    });
  } catch (error) {
    console.error('Redis client initialization failed:', error);
    redisClient = null;
  }
}

/**
 * Check database connectivity
 * Performs a simple SELECT 1 query with timeout
 */
export async function checkDb(): Promise<'ok' | 'fail' | 'unknown'> {
  try {
    // Real DB query with timeout
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as health`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB health check timeout')), 1000)
      ),
    ]);

    // Verify result
    if (result && Array.isArray(result) && result.length > 0) {
      return 'ok';
    }

    return 'fail';
  } catch (error) {
    console.error('DB health check failed:', error);
    return 'fail';
  }
}

/**
 * Check Redis cache connectivity
 * Performs PING command if Redis is configured
 */
export async function checkCache(): Promise<'ok' | 'fail' | 'unknown'> {
  // If Redis not configured, return unknown (not an error)
  if (!redisClient || !process.env.REDIS_URL) {
    return 'unknown';
  }

  try {
    // Real Redis PING with timeout
    const result = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis health check timeout')), 1000)
      ),
    ]);

    if (result === 'PONG') {
      return 'ok';
    }

    return 'fail';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return 'fail';
  }
}

/**
 * Check AI service availability
 * Lightweight check - only if AI provider is critical
 */
export async function checkAi(): Promise<'ok' | 'fail' | 'unknown'> {
  // AI services are optional dependencies
  // Return 'unknown' if not configured (not critical for readiness)
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return 'unknown';
  }

  try {
    // Lightweight check: verify API key format only
    // Don't make actual API call to avoid costs/rate limits
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return 'ok';
    }

    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      return 'ok';
    }

    return 'unknown';
  } catch (error) {
    console.error('AI health check failed:', error);
    return 'unknown'; // Non-critical, don't fail readiness
  }
}

/**
 * Generic check runner with timeout
 */
async function runCheck(
  name: string,
  fn: () => Promise<string>,
  timeoutMs: number
): Promise<'ok' | 'fail' | 'unknown'> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<'fail'>((resolve) => setTimeout(() => resolve('fail'), timeoutMs)),
    ]);
    return result as 'ok' | 'fail' | 'unknown';
  } catch (error) {
    console.error(`Health check '${name}' error:`, error);
    return 'fail';
  }
}

/**
 * GET /health - Liveness probe
 * Always returns 200 to indicate process is alive
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    nodeVersion: process.version,
  });
});

/**
 * GET /ready - Readiness probe
 * Returns 200 only if critical dependencies are healthy
 * Returns 503 if any critical dependency fails
 *
 * Critical dependencies:
 * - Database (must be 'ok')
 * - Redis cache (optional - 'unknown' is acceptable)
 * - AI services (optional - 'unknown' is acceptable)
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    db: await runCheck('db', checkDb, checkTimeout),
    cache: await runCheck('cache', checkCache, checkTimeout),
    ai: await runCheck('ai', checkAi, checkTimeout),
  };

  // Database is CRITICAL - must be 'ok'
  const dbOk = checks.db === 'ok';

  // Cache and AI are optional - 'unknown' is acceptable
  const cacheOk = checks.cache === 'ok' || checks.cache === 'unknown';
  const aiOk = checks.ai === 'ok' || checks.ai === 'unknown';

  const allCriticalOk = dbOk && cacheOk && aiOk;

  // Log failures
  if (!allCriticalOk) {
    console.warn('Readiness check failed:', {
      db: checks.db,
      cache: checks.cache,
      ai: checks.ai,
      dbOk,
      cacheOk,
      aiOk,
    });
  }

  res.status(allCriticalOk ? 200 : 503).json({
    status: allCriticalOk ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
