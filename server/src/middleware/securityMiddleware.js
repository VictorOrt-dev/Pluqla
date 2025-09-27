const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../utils/logger');

/**
 * Enhanced Security Middleware for Financial Data Protection
 * Implements GDPR, PSD2 and banking-grade security standards
 */

/**
 * AES-256-GCM Encryption Service for sensitive financial data
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 12;
    this.saltLength = 64;
    this.tagLength = 16;

    // Master key from environment (must be 32 bytes)
    const envKey = process.env.FINANCIAL_ENCRYPTION_KEY;
    if (envKey) {
      // Convert hex string to Buffer
      this.masterKey = Buffer.from(envKey, 'hex');
      if (this.masterKey.length !== this.keyLength) {
        throw new Error('FINANCIAL_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
      }
    } else {
      this.masterKey = this.generateKey();
    }
  }

  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt sensitive financial data with authenticated encryption
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);

      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha512');

      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine salt + iv + authTag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive financial data with authentication verification
   */
  decrypt(encryptedData) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = combined.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);

      // Derive key using same parameters
      const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha512');

      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(data) {
    const salt = crypto.randomBytes(32);
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hashedData) {
    try {
      const [salt, hash] = hashedData.split(':');
      const hashVerify = crypto.pbkdf2Sync(data, Buffer.from(salt, 'hex'), 100000, 64, 'sha512');
      return hash === hashVerify.toString('hex');
    } catch (error) {
      return false;
    }
  }
}

/**
 * Advanced Rate Limiting for Financial APIs
 */
const createFinancialRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Advanced features for financial security
    keyGenerator: (req) => {
      // Use both IP and user ID for rate limiting
      return req.user?.id ? `${req.ip}:${req.user.id}` : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/status';
    },
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(options.statusCode).json(options.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Security headers middleware specifically for financial data
 */
const financialSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.bridgeapi.io", "https://api.budget-insight.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow external financial APIs
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

/**
 * Input validation and sanitization for financial data
 */
const validateFinancialInput = (req, res, next) => {
  try {
    // Sanitize and validate financial amounts
    if (req.body.amount !== undefined) {
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount < 0 || amount > 1000000000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount: must be between 0 and 1,000,000,000',
          error: 'INVALID_AMOUNT'
        });
      }
      req.body.amount = amount;
    }

    // Validate account numbers (basic format check)
    if (req.body.accountNumber) {
      const accountNumber = req.body.accountNumber.toString().replace(/\s/g, '');
      if (!/^[A-Z0-9]{8,34}$/.test(accountNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account number format',
          error: 'INVALID_ACCOUNT_NUMBER'
        });
      }
      req.body.accountNumber = accountNumber;
    }

    // Validate IBAN if provided
    if (req.body.iban) {
      const iban = req.body.iban.replace(/\s/g, '').toUpperCase();
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(iban)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IBAN format',
          error: 'INVALID_IBAN'
        });
      }
      req.body.iban = iban;
    }

    // Sanitize text inputs
    ['name', 'description', 'category'].forEach(field => {
      if (req.body[field]) {
        req.body[field] = req.body[field].toString().trim().slice(0, 255);
      }
    });

    next();
  } catch (error) {
    logger.error('Input validation error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input data',
      error: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Financial transaction monitoring for suspicious activity
 */
const monitorSuspiciousActivity = async (req, res, next) => {
  try {
    if (req.method === 'POST' && req.body.amount) {
      const amount = parseFloat(req.body.amount);
      const userId = req.user?.id;

      // Large transaction alert (>€10,000)
      if (amount > 10000) {
        logger.warn('Large transaction detected', {
          userId,
          amount,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        // Could trigger additional verification here
        // For now, just log and continue
      }

      // Rapid transaction detection
      const cacheKey = `transaction_count_${userId}`;
      const redis = req.app.locals.redis;

      if (redis) {
        const transactionCount = await redis.incr(cacheKey);
        await redis.expire(cacheKey, 300); // 5 minutes window

        if (transactionCount > 20) { // More than 20 transactions in 5 minutes
          logger.warn('Rapid transaction activity detected', {
            userId,
            count: transactionCount,
            ip: req.ip
          });

          return res.status(429).json({
            success: false,
            message: 'Too many transactions in a short period. Please wait before making more transactions.',
            error: 'RATE_LIMITED'
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity monitoring error:', error);
    next(); // Continue processing even if monitoring fails
  }
};

/**
 * GDPR compliance middleware
 */
const gdprCompliance = (req, res, next) => {
  // Add GDPR headers
  res.set({
    'X-Data-Protection': 'GDPR-Compliant',
    'X-Privacy-Policy': '/privacy-policy',
    'X-Data-Controller': 'PlusClair Financial Services'
  });

  // Log data access for GDPR audit trail
  if (req.user?.id && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    logger.info('Data access', {
      userId: req.user.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      gdprCompliant: true
    });
  }

  next();
};

/**
 * API versioning and deprecation handling
 */
const apiVersioning = (req, res, next) => {
  const apiVersion = req.headers['api-version'] || '1.0';

  // Set current API version
  req.apiVersion = apiVersion;
  res.set('API-Version', apiVersion);

  // Handle deprecated endpoints
  if (req.path.includes('/v1/') && apiVersion === '2.0') {
    res.set('Deprecation', 'true');
    res.set('Sunset', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());

    logger.warn('Deprecated API endpoint accessed', {
      path: req.path,
      version: apiVersion,
      ip: req.ip
    });
  }

  next();
};

// Create encryption service instance
const encryptionService = new EncryptionService();

module.exports = {
  EncryptionService,
  encryptionService,
  createFinancialRateLimit,
  financialSecurityHeaders,
  validateFinancialInput,
  monitorSuspiciousActivity,
  gdprCompliance,
  apiVersioning
};