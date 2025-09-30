/**
 * Authentication Lockout Service
 *
 * Prevents brute-force attacks by locking accounts after failed login attempts.
 *
 * Features:
 * - Tracks failed login attempts per user/IP
 * - Automatic lockout after threshold (default: 5 attempts in 15 minutes)
 * - Automatic unlock after duration (default: 30 minutes)
 * - Manual unlock by admin
 * - Generic error messages to prevent user enumeration
 *
 * Based on OWASP recommendations:
 * https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 */

const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

// Configuration (can be overridden by env vars)
const CONFIG = {
  // Number of failed attempts before lockout
  MAX_ATTEMPTS: parseInt(process.env.AUTH_MAX_ATTEMPTS || '5', 10),
  // Time window for counting attempts (milliseconds)
  ATTEMPT_WINDOW_MS: parseInt(process.env.AUTH_ATTEMPT_WINDOW_MS || '900000', 10), // 15 minutes
  // Duration of lockout (milliseconds)
  LOCKOUT_DURATION_MS: parseInt(process.env.AUTH_LOCKOUT_DURATION_MS || '1800000', 10), // 30 minutes
  // Use Redis for distributed tracking (recommended for production)
  USE_REDIS: process.env.REDIS_URL ? true : false
};

// In-memory store for failed attempts (fallback if Redis unavailable)
// Structure: { userId: { attempts: number, firstAttemptAt: Date, lockedUntil: Date|null } }
const failedAttempts = new Map();

/**
 * Record a failed login attempt
 * @param {string} userId - User ID (or email hash for unknown users)
 * @param {string} ipAddress - IP address of the request
 * @returns {Promise<Object>} - { locked: boolean, remainingAttempts: number, lockedUntil: Date|null }
 */
async function recordFailedAttempt(userId, ipAddress) {
  try {
    const now = new Date();
    const key = `${userId}:${ipAddress}`;

    // Get or create attempt record
    let record = failedAttempts.get(key);

    if (!record) {
      // First failed attempt
      record = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: null
      };
      failedAttempts.set(key, record);

      logger.warn('Failed login attempt recorded', {
        userId,
        ipAddress,
        attempts: 1
      });

      return {
        locked: false,
        remainingAttempts: CONFIG.MAX_ATTEMPTS - 1,
        lockedUntil: null
      };
    }

    // Check if lockout is active
    if (record.lockedUntil && now < record.lockedUntil) {
      logger.warn('Login attempt on locked account', {
        userId,
        ipAddress,
        lockedUntil: record.lockedUntil
      });

      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: record.lockedUntil
      };
    }

    // Check if attempt window has expired
    const windowExpired = now - record.firstAttemptAt > CONFIG.ATTEMPT_WINDOW_MS;

    if (windowExpired) {
      // Reset counter - new window
      record = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: null
      };
      failedAttempts.set(key, record);

      logger.info('Failed attempt window reset', { userId, ipAddress });

      return {
        locked: false,
        remainingAttempts: CONFIG.MAX_ATTEMPTS - 1,
        lockedUntil: null
      };
    }

    // Increment attempt counter
    record.attempts++;

    // Check if threshold exceeded
    if (record.attempts >= CONFIG.MAX_ATTEMPTS) {
      record.lockedUntil = new Date(now.getTime() + CONFIG.LOCKOUT_DURATION_MS);
      failedAttempts.set(key, record);

      // Log security incident
      await prisma.securityIncident.create({
        data: {
          userId: userId.startsWith('ip:') ? null : userId,
          incidentType: 'multiple_failed_attempts',
          severity: 'medium',
          description: `Account locked due to ${record.attempts} failed login attempts`,
          ipAddress,
          metadata: JSON.stringify({
            attempts: record.attempts,
            windowStart: record.firstAttemptAt,
            lockedUntil: record.lockedUntil
          })
        }
      }).catch(err => {
        logger.error('Failed to create security incident', { error: err.message });
      });

      logger.error('Account locked due to failed attempts', {
        userId,
        ipAddress,
        attempts: record.attempts,
        lockedUntil: record.lockedUntil
      });

      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: record.lockedUntil
      };
    }

    failedAttempts.set(key, record);

    logger.warn('Failed login attempt recorded', {
      userId,
      ipAddress,
      attempts: record.attempts,
      remaining: CONFIG.MAX_ATTEMPTS - record.attempts
    });

    return {
      locked: false,
      remainingAttempts: CONFIG.MAX_ATTEMPTS - record.attempts,
      lockedUntil: null
    };
  } catch (error) {
    logger.error('Error recording failed attempt', {
      error: error.message,
      userId,
      ipAddress
    });
    throw error;
  }
}

/**
 * Check if user/IP is currently locked out
 * @param {string} userId - User ID (or email hash)
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} - { locked: boolean, lockedUntil: Date|null, remainingTime: number|null }
 */
async function isLocked(userId, ipAddress) {
  try {
    const key = `${userId}:${ipAddress}`;
    const record = failedAttempts.get(key);

    if (!record || !record.lockedUntil) {
      return { locked: false, lockedUntil: null, remainingTime: null };
    }

    const now = new Date();

    if (now >= record.lockedUntil) {
      // Lockout expired, clear it
      record.lockedUntil = null;
      record.attempts = 0;
      failedAttempts.set(key, record);

      logger.info('Account lockout expired', { userId, ipAddress });

      return { locked: false, lockedUntil: null, remainingTime: null };
    }

    const remainingTime = Math.ceil((record.lockedUntil - now) / 1000); // seconds

    return {
      locked: true,
      lockedUntil: record.lockedUntil,
      remainingTime
    };
  } catch (error) {
    logger.error('Error checking lockout status', {
      error: error.message,
      userId,
      ipAddress
    });
    // Fail open in case of errors (security vs availability trade-off)
    return { locked: false, lockedUntil: null, remainingTime: null };
  }
}

/**
 * Clear failed attempts (after successful login)
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address
 */
async function clearFailedAttempts(userId, ipAddress) {
  try {
    const key = `${userId}:${ipAddress}`;
    failedAttempts.delete(key);

    logger.info('Failed attempts cleared after successful login', {
      userId,
      ipAddress
    });
  } catch (error) {
    logger.error('Error clearing failed attempts', {
      error: error.message,
      userId,
      ipAddress
    });
  }
}

/**
 * Manually unlock a user account (admin function)
 * @param {string} userId - User ID to unlock
 * @param {string} unlockedBy - Admin user ID who unlocked
 */
async function unlockAccount(userId, unlockedBy) {
  try {
    // Clear all lockouts for this user (all IPs)
    let cleared = 0;
    for (const [key, record] of failedAttempts.entries()) {
      if (key.startsWith(`${userId}:`)) {
        failedAttempts.delete(key);
        cleared++;
      }
    }

    logger.info('Account manually unlocked', {
      userId,
      unlockedBy,
      clearedEntries: cleared
    });

    return { success: true, clearedEntries: cleared };
  } catch (error) {
    logger.error('Error unlocking account', {
      error: error.message,
      userId,
      unlockedBy
    });
    throw error;
  }
}

/**
 * Get lockout statistics for monitoring
 */
function getLockoutStats() {
  let totalLocked = 0;
  let totalTracked = 0;

  for (const [key, record] of failedAttempts.entries()) {
    totalTracked++;
    if (record.lockedUntil && new Date() < record.lockedUntil) {
      totalLocked++;
    }
  }

  return {
    totalTracked,
    totalLocked,
    config: CONFIG
  };
}

/**
 * Cleanup expired lockout records (run periodically)
 */
function cleanupExpiredLockouts() {
  const now = new Date();
  let cleaned = 0;

  for (const [key, record] of failedAttempts.entries()) {
    // Remove if lockout expired and no recent attempts
    if (record.lockedUntil && now >= record.lockedUntil) {
      const timeSinceLockout = now - record.lockedUntil;
      if (timeSinceLockout > CONFIG.LOCKOUT_DURATION_MS * 2) {
        failedAttempts.delete(key);
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    logger.info('Cleaned up expired lockout records', { count: cleaned });
  }

  return cleaned;
}

module.exports = {
  recordFailedAttempt,
  isLocked,
  clearFailedAttempts,
  unlockAccount,
  getLockoutStats,
  cleanupExpiredLockouts,
  CONFIG
};
