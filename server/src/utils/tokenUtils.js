const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('./logger');

/**
 * Password Reset Token Security Utilities
 *
 * SECURITY FEATURES:
 * - Cryptographically secure token generation
 * - bcrypt hashing with salt rounds 12
 * - Constant-time comparison protection
 * - Single-use enforcement
 * - Automatic cleanup of expired tokens
 */

/**
 * Generates a cryptographically secure random token
 * @returns {string} 32-character hex token
 */
const generateSecureToken = () => {
  // Generate 16 random bytes (128 bits) and convert to hex
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Hash a token using bcrypt with salt rounds 12
 * @param {string} token - Plain text token to hash
 * @returns {Promise<string>} Hashed token
 */
const hashToken = async (token) => {
  try {
    const saltRounds = 12;
    const hashedToken = await bcrypt.hash(token, saltRounds);

    // Never log the raw token - only log that hashing occurred
    logger.debug('Token hashed successfully');

    return hashedToken;
  } catch (error) {
    logger.error('Error hashing token:', error);
    throw new Error('Token hashing failed');
  }
};

/**
 * Verify a plain token against its hash using constant-time comparison
 * @param {string} plainToken - Plain text token from user
 * @param {string} hashedToken - Stored hash from database
 * @returns {Promise<boolean>} True if tokens match
 */
const verifyToken = async (plainToken, hashedToken) => {
  try {
    // bcrypt.compare uses constant-time comparison internally
    const isValid = await bcrypt.compare(plainToken, hashedToken);

    // Log verification attempt without exposing token values
    logger.debug(`Token verification: ${isValid ? 'valid' : 'invalid'}`);

    return isValid;
  } catch (error) {
    logger.error('Error verifying token:', error);
    return false; // Fail secure - reject on error
  }
};

/**
 * Create a new password reset token (generates, hashes, and stores)
 * @param {string} userId - User ID for the reset request
 * @param {string} ipAddress - Request IP address for security tracking
 * @param {string} userAgent - Request user agent for security tracking
 * @returns {Promise<{token: string, resetId: string}>} Plain token (for email) and reset ID
 */
const createPasswordResetToken = async (userId, ipAddress = null, userAgent = null) => {
  const transaction = prisma.$transaction(async (prisma) => {
    try {
      // Generate a cryptographically secure token
      const plainToken = generateSecureToken();

      // Hash the token before storing
      const tokenHash = await hashToken(plainToken);

      // Set expiration to 1 hour from now
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Clean up any existing unused tokens for this user
      await prisma.passwordReset.deleteMany({
        where: {
          userId: userId,
          OR: [
            { used: false, expiresAt: { lt: new Date() } }, // Expired tokens
            { used: true, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Used tokens older than 24h
          ]
        }
      });

      // Create new password reset record
      const passwordReset = await prisma.passwordReset.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
          ipAddress,
          userAgent
        }
      });

      // Log security event (no sensitive data)
      logger.info(`Password reset token created for user ${userId} from IP ${ipAddress}`);

      // Return plain token (for email) and reset ID (for tracking)
      return {
        token: plainToken,
        resetId: passwordReset.id
      };

    } catch (error) {
      logger.error(`Error creating password reset token for user ${userId}:`, error);
      throw error;
    }
  }, {
    timeout: 10000 // 10 second timeout
  });

  return await transaction;
};

/**
 * Verify and consume a password reset token (single-use)
 * @param {string} plainToken - Token from user (from email link)
 * @param {string} ipAddress - Request IP for security tracking
 * @param {string} userAgent - Request user agent for security tracking
 * @returns {Promise<{valid: boolean, userId?: string, resetId?: string}>} Verification result
 */
const verifyPasswordResetToken = async (plainToken, ipAddress = null, userAgent = null) => {
  const transaction = prisma.$transaction(async (prisma) => {
    try {
      // Find all non-expired, unused password reset tokens
      const activeResets = await prisma.passwordReset.findMany({
        where: {
          used: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: { id: true, email: true, status: true }
          }
        }
      });

      // Check each token hash against the provided plain token
      for (const reset of activeResets) {
        const isValid = await verifyToken(plainToken, reset.tokenHash);

        if (isValid) {
          // Ensure user account is still active
          if (reset.user.status !== 'active') {
            logger.warn(`Password reset attempted for inactive user ${reset.userId} from IP ${ipAddress}`);
            return { valid: false };
          }

          // Mark token as used (single-use enforcement)
          await prisma.passwordReset.update({
            where: { id: reset.id },
            data: {
              used: true,
              usedAt: new Date()
            }
          });

          // Log successful verification
          logger.info(`Password reset token verified and consumed for user ${reset.userId} from IP ${ipAddress}`);

          return {
            valid: true,
            userId: reset.userId,
            resetId: reset.id
          };
        }
      }

      // No valid token found - log potential attack
      logger.warn(`Invalid password reset token attempted from IP ${ipAddress}`);

      return { valid: false };

    } catch (error) {
      logger.error('Error verifying password reset token:', error);
      return { valid: false }; // Fail secure
    }
  }, {
    timeout: 10000 // 10 second timeout
  });

  return await transaction;
};

/**
 * Clean up expired password reset tokens (maintenance function)
 * @returns {Promise<number>} Number of tokens cleaned up
 */
const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expired tokens
          { used: true, usedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Used tokens older than 7 days
        ]
      }
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired password reset tokens`);
    }

    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};

/**
 * Get password reset statistics (for monitoring)
 * @param {string} userId - Optional user ID to filter by
 * @returns {Promise<Object>} Reset statistics
 */
const getPasswordResetStats = async (userId = null) => {
  try {
    const where = userId ? { userId } : {};

    const [active, expired, used] = await Promise.all([
      prisma.passwordReset.count({
        where: { ...where, used: false, expiresAt: { gt: new Date() } }
      }),
      prisma.passwordReset.count({
        where: { ...where, used: false, expiresAt: { lt: new Date() } }
      }),
      prisma.passwordReset.count({
        where: { ...where, used: true }
      })
    ]);

    return { active, expired, used, total: active + expired + used };
  } catch (error) {
    logger.error('Error getting password reset stats:', error);
    return { active: 0, expired: 0, used: 0, total: 0 };
  }
};

module.exports = {
  generateSecureToken,
  hashToken,
  verifyToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  cleanupExpiredTokens,
  getPasswordResetStats
};