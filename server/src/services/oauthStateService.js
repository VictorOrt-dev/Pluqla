const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * OAuth State Persistence Service
 * Handles secure storage of OAuth states and PKCE verifiers
 * Supports both Redis and SQL database storage
 */
class OAuthStateService {
  constructor() {
    this.defaultTTL = 5 * 60; // 5 minutes in seconds
    this.redisClient = null;
    this.prisma = null;

    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Try Redis first if available
      if (process.env.REDIS_URL) {
        const redis = require('redis');
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (times) => Math.min(times * 50, 2000)
        });

        await this.redisClient.connect();
        logger.info('OAuth state service using Redis storage');
      } else {
        // Fallback to database storage
        const { prisma } = require('../lib/prisma');
        this.prisma = prisma;
        logger.info('OAuth state service using database storage');
      }
    } catch (error) {
      logger.error('Failed to initialize OAuth state storage:', error);
      // Fall back to database
      if (!this.prisma) {
        const { prisma } = require('../lib/prisma');
        this.prisma = prisma;
        logger.warn('Using database storage as fallback for OAuth states');
      }
    }
  }

  /**
   * Store OAuth state and PKCE verifier
   */
  async storeState(state, data, ttlSeconds = this.defaultTTL) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const serializedData = JSON.stringify({
        ...data,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      if (this.redisClient) {
        // Use Redis storage
        await this.redisClient.setEx(`oauth_state:${state}`, ttlSeconds, serializedData);
      } else {
        // Use database storage
        await this.prisma.oauthState.upsert({
          where: { state },
          update: {
            data: serializedData,
            expiresAt
          },
          create: {
            state,
            data: serializedData,
            expiresAt
          }
        });
      }

      logger.debug('OAuth state stored', { state: `${state.substring(0, 8)}...`, storage: this.redisClient ? 'redis' : 'database' });
      return true;
    } catch (error) {
      logger.error('Failed to store OAuth state:', error);
      throw new Error('Failed to store OAuth state');
    }
  }

  /**
   * Retrieve OAuth state data
   */
  async getState(state) {
    try {
      let serializedData = null;

      if (this.redisClient) {
        // Get from Redis
        serializedData = await this.redisClient.get(`oauth_state:${state}`);
      } else {
        // Get from database
        const record = await this.prisma.oauthState.findUnique({
          where: { state }
        });

        if (record && record.expiresAt > new Date()) {
          serializedData = record.data;
        } else if (record) {
          // Expired record, clean it up
          await this.deleteState(state);
        }
      }

      if (!serializedData) {
        return null;
      }

      const data = JSON.parse(serializedData);

      // Check expiration
      if (new Date(data.expiresAt) <= new Date()) {
        await this.deleteState(state);
        return null;
      }

      logger.debug('OAuth state retrieved', { state: `${state.substring(0, 8)}...`, storage: this.redisClient ? 'redis' : 'database' });
      return data;
    } catch (error) {
      logger.error('Failed to retrieve OAuth state:', error);
      return null;
    }
  }

  /**
   * Delete OAuth state
   */
  async deleteState(state) {
    try {
      if (this.redisClient) {
        await this.redisClient.del(`oauth_state:${state}`);
      } else {
        await this.prisma.oauthState.delete({
          where: { state }
        }).catch(() => {}); // Ignore if already deleted
      }

      logger.debug('OAuth state deleted', { state: `${state.substring(0, 8)}...`, storage: this.redisClient ? 'redis' : 'database' });
      return true;
    } catch (error) {
      logger.error('Failed to delete OAuth state:', error);
      return false;
    }
  }

  /**
   * Store PKCE verifier with state
   */
  async storePKCEVerifier(state, codeVerifier, additionalData = {}) {
    return await this.storeState(state, {
      codeVerifier,
      type: 'pkce',
      ...additionalData
    });
  }

  /**
   * Retrieve PKCE verifier
   */
  async getPKCEVerifier(state) {
    const data = await this.getState(state);
    return data?.codeVerifier || null;
  }

  /**
   * Store user ID with state for callback validation
   */
  async storeUserState(state, userId, provider, additionalData = {}) {
    return await this.storeState(state, {
      userId,
      provider,
      type: 'user_auth',
      ...additionalData
    });
  }

  /**
   * Retrieve user ID from state
   */
  async getUserFromState(state) {
    const data = await this.getState(state);
    if (data?.type === 'user_auth') {
      return {
        userId: data.userId,
        provider: data.provider,
        additionalData: data
      };
    }
    return null;
  }

  /**
   * Clean up expired states (for database storage)
   */
  async cleanupExpiredStates() {
    if (!this.prisma) return 0;

    try {
      const result = await this.prisma.oauthState.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired OAuth states`);
      }

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired OAuth states:', error);
      return 0;
    }
  }

  /**
   * Generate secure random state
   */
  generateSecureState(prefix = 'oauth') {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  /**
   * Validate state format
   */
  isValidStateFormat(state) {
    // Basic validation - adjust based on your state format
    return /^[a-zA-Z0-9_-]+$/.test(state) && state.length >= 20 && state.length <= 100;
  }

  /**
   * Health check for storage systems
   */
  async healthCheck() {
    try {
      const testState = this.generateSecureState('health');
      const testData = { test: true, timestamp: Date.now() };

      // Test store
      await this.storeState(testState, testData, 10);

      // Test retrieve
      const retrieved = await this.getState(testState);

      // Test delete
      await this.deleteState(testState);

      const isHealthy = retrieved && retrieved.test === true;

      return {
        healthy: isHealthy,
        storage: this.redisClient ? 'redis' : 'database',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OAuth state service health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        storage: this.redisClient ? 'redis' : 'database',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    try {
      const stats = {
        storage: this.redisClient ? 'redis' : 'database',
        timestamp: new Date().toISOString()
      };

      if (this.redisClient) {
        const keys = await this.redisClient.keys('oauth_state:*');
        stats.activeStates = keys.length;
      } else {
        const count = await this.prisma.oauthState.count({
          where: {
            expiresAt: {
              gt: new Date()
            }
          }
        });
        stats.activeStates = count;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get OAuth state stats:', error);
      return {
        storage: this.redisClient ? 'redis' : 'database',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OAuthStateService();
