const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');

/**
 * Secure Refresh Token Service
 *
 * SECURITY FEATURES:
 * - All refresh tokens are hashed with bcrypt before storage
 * - JWT ID (jti) tracking for rotation and revocation
 * - Automatic cleanup of expired/revoked tokens
 * - IP and User Agent tracking for security monitoring
 * - Constant-time comparison for token verification
 */

/**
 * Hash a refresh token using bcrypt
 * @param {string} token - Plain text refresh token
 * @returns {Promise<string>} Hashed token
 */
const hashRefreshToken = async (token) => {
  try {
    const saltRounds = 12;
    const hashedToken = await bcrypt.hash(token, saltRounds);
    logger.debug('Refresh token hashed successfully');
    return hashedToken;
  } catch (error) {
    logger.error('Error hashing refresh token:', error);
    throw new Error('Token hashing failed');
  }
};

/**
 * Verify a plain refresh token against its hash
 * @param {string} plainToken - Plain text refresh token
 * @param {string} hashedToken - Stored hash from database
 * @returns {Promise<boolean>} True if tokens match
 */
const verifyRefreshToken = async (plainToken, hashedToken) => {
  try {
    // bcrypt.compare uses constant-time comparison internally
    const isValid = await bcrypt.compare(plainToken, hashedToken);
    logger.debug(`Refresh token verification: ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  } catch (error) {
    logger.error('Error verifying refresh token:', error);
    return false; // Fail secure - reject on error
  }
};

/**
 * Store a new refresh token securely
 * @param {string} refreshToken - The JWT refresh token to store
 * @param {string} userId - User ID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<string>} Token ID for tracking
 */
const storeRefreshToken = async (refreshToken, userId, ipAddress = null, userAgent = null) => {
  const transaction = prisma.$transaction(async (prisma) => {
    try {
      // Decode the JWT to get the jti (JWT ID)
      const decoded = jwt.decode(refreshToken);
      if (!decoded || !decoded.jti) {
        throw new Error('Invalid refresh token: missing jti');
      }

      // Hash the token before storing
      const tokenHash = await hashRefreshToken(refreshToken);

      // Calculate expiration (7 days from now)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Clean up expired tokens for this user
      await prisma.refreshToken.deleteMany({
        where: {
          userId,
          expiresAt: { lt: new Date() }
        }
      });

      // Store the hashed token
      const tokenRecord = await prisma.refreshToken.create({
        data: {
          tokenHash,
          jti: decoded.jti,
          userId,
          expiresAt,
          ipAddress: ipAddress?.substring(0, 45), // Truncate to fit schema
          userAgent: userAgent?.substring(0, 512) // Truncate to fit schema
        }
      });

      logger.info(`Refresh token stored for user ${userId} from IP ${ipAddress}`);
      return tokenRecord.id;
    } catch (error) {
      logger.error(`Error storing refresh token for user ${userId}:`, error);
      throw error;
    }
  }, {
    timeout: 10000 // 10 second timeout
  });

  return await transaction;
};

/**
 * Validate and rotate a refresh token
 * @param {string} refreshToken - The refresh token to validate
 * @param {Function} generateNewTokens - Function to generate new token pair
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<{valid: boolean, tokens?: Object, userId?: string}>}
 */
const rotateRefreshToken = async (refreshToken, generateNewTokens, ipAddress = null, userAgent = null) => {
  const transaction = prisma.$transaction(async (prisma) => {
    try {
      // First verify the JWT signature and structure
      const { JWT_REFRESH_SECRET } = process.env;
      if (!JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET not configured');
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
          issuer: 'plus-clair-app',
          audience: 'plus-clair-users'
        });
      } catch (jwtError) {
        logger.warn(`Invalid JWT refresh token from IP ${ipAddress}: ${jwtError.message}`);
        return { valid: false };
      }

      if (!decoded.jti) {
        logger.warn(`Refresh token missing jti from IP ${ipAddress}`);
        return { valid: false };
      }

      // Find the token record by jti
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          jti: decoded.jti,
          userId: decoded.userId,
          revoked: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: { id: true, status: true }
          }
        }
      });

      if (!tokenRecord) {
        logger.warn(`No valid refresh token found for jti ${decoded.jti} from IP ${ipAddress}`);
        return { valid: false };
      }

      // Verify the token hash
      const isValidHash = await verifyRefreshToken(refreshToken, tokenRecord.tokenHash);
      if (!isValidHash) {
        logger.warn(`Invalid refresh token hash for user ${tokenRecord.userId} from IP ${ipAddress}`);
        return { valid: false };
      }

      // Check user is still active
      if (tokenRecord.user.status !== 'active') {
        logger.warn(`Refresh token used for inactive user ${tokenRecord.userId}`);
        // Revoke all tokens for inactive user
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId },
          data: { revoked: true, revokedAt: new Date() }
        });
        return { valid: false };
      }

      // Generate new token pair
      const newTokens = generateNewTokens(tokenRecord.userId);

      // Revoke the old token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });

      // Store the new refresh token
      await storeRefreshToken(newTokens.refreshToken, tokenRecord.userId, ipAddress, userAgent);

      logger.info(`Refresh token rotated for user ${tokenRecord.userId} from IP ${ipAddress}`);

      return {
        valid: true,
        tokens: newTokens,
        userId: tokenRecord.userId
      };
    } catch (error) {
      logger.error('Error rotating refresh token:', error);
      return { valid: false };
    }
  }, {
    timeout: 15000 // 15 second timeout for rotation
  });

  return await transaction;
};

/**
 * Revoke refresh token by JWT ID
 * @param {string} jti - JWT ID to revoke
 * @param {string} userId - User ID (for security verification)
 * @returns {Promise<boolean>} True if revoked successfully
 */
const revokeRefreshTokenByJti = async (jti, userId) => {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        jti,
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    const revoked = result.count > 0;
    logger.info(`Refresh token revocation: ${revoked ? 'success' : 'not found'} for jti ${jti}, user ${userId}`);
    return revoked;
  } catch (error) {
    logger.error(`Error revoking refresh token jti ${jti} for user ${userId}:`, error);
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
const revokeAllUserTokens = async (userId) => {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    logger.info(`Revoked ${result.count} refresh tokens for user ${userId}`);
    return result.count;
  } catch (error) {
    logger.error(`Error revoking all tokens for user ${userId}:`, error);
    return 0;
  }
};

/**
 * Clean up expired and old revoked tokens
 * @returns {Promise<number>} Number of tokens cleaned up
 */
const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expired tokens
          {
            revoked: true,
            revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          } // Revoked tokens older than 7 days
        ]
      }
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired/old refresh tokens`);
    }

    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};

/**
 * Get refresh token statistics for monitoring
 * @param {string} userId - Optional user ID to filter by
 * @returns {Promise<Object>} Token statistics
 */
const getRefreshTokenStats = async (userId = null) => {
  try {
    const where = userId ? { userId } : {};

    const [active, expired, revoked] = await Promise.all([
      prisma.refreshToken.count({
        where: { ...where, revoked: false, expiresAt: { gt: new Date() } }
      }),
      prisma.refreshToken.count({
        where: { ...where, revoked: false, expiresAt: { lt: new Date() } }
      }),
      prisma.refreshToken.count({
        where: { ...where, revoked: true }
      })
    ]);

    return {
      active, expired, revoked, total: active + expired + revoked
    };
  } catch (error) {
    logger.error('Error getting refresh token stats:', error);
    return {
      active: 0, expired: 0, revoked: 0, total: 0
    };
  }
};

module.exports = {
  hashRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshTokenByJti,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getRefreshTokenStats
};
