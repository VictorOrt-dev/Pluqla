/**
 * Strong Customer Authentication (SCA) Validation Middleware
 *
 * Validates SCA challenge verification requests to ensure
 * proper format and security requirements are met.
 */

const { body, validationResult } = require('express-validator');
const logger = require('../../utils/logger');

/**
 * Validation rules for SCA verification
 */
const validateSCAVerification = [
  // Challenge ID validation
  body('challengeId')
    .isUUID()
    .withMessage('Challenge ID must be a valid UUID')
    .notEmpty()
    .withMessage('Challenge ID is required'),

  // Authentication method validation
  body('method')
    .isIn(['sms', 'totp', 'biometric', 'push'])
    .withMessage('Invalid authentication method')
    .notEmpty()
    .withMessage('Authentication method is required'),

  // Response validation (method-specific)
  body('response')
    .isLength({ min: 1, max: 500 })
    .withMessage('Authentication response must be between 1 and 500 characters')
    .notEmpty()
    .withMessage('Authentication response is required'),

  // Custom validation based on method
  body().custom((value, { req }) => {
    const { method, response } = req.body;

    switch (method) {
      case 'sms':
        // SMS codes should be 6 digits
        if (!/^\d{6}$/.test(response)) {
          throw new Error('SMS code must be exactly 6 digits');
        }
        break;

      case 'totp':
        // TOTP codes should be 6 digits
        if (!/^\d{6}$/.test(response)) {
          throw new Error('TOTP code must be exactly 6 digits');
        }
        break;

      case 'biometric':
        // Biometric response should be a valid hash
        if (!/^[a-f0-9]{64}$/.test(response)) {
          throw new Error('Invalid biometric response format');
        }
        break;

      case 'push':
        // Push token should be alphanumeric
        if (!/^[a-zA-Z0-9]{16,64}$/.test(response)) {
          throw new Error('Invalid push token format');
        }
        break;
    }

    return true;
  }),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('SCA verification validation failed', {
        userId: req.user?.id,
        errors: errors.array(),
        challengeId: req.body.challengeId
      });

      return res.status(400).json({
        error: 'SCA_VALIDATION_ERROR',
        message: 'Invalid SCA verification data',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validation for financial transactions requiring SCA
 */
const validateSCATransaction = [
  // Amount validation
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Transaction amount must be between €0.01 and €1,000,000')
    .notEmpty()
    .withMessage('Transaction amount is required'),

  // Transaction type validation
  body('type')
    .isIn(['transfer', 'payment', 'withdrawal', 'investment'])
    .withMessage('Invalid transaction type')
    .optional(),

  // Target account validation (if applicable)
  body('targetAccount')
    .isLength({ min: 1, max: 100 })
    .withMessage('Target account must be between 1 and 100 characters')
    .optional(),

  // Currency validation
  body('currency')
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Unsupported currency')
    .optional(),

  // Description validation
  body('description')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .optional(),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('SCA transaction validation failed', {
        userId: req.user?.id,
        errors: errors.array(),
        amount: req.body.amount
      });

      return res.status(400).json({
        error: 'TRANSACTION_VALIDATION_ERROR',
        message: 'Invalid transaction data for SCA',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Device trust validation
 */
const validateDeviceTrust = [
  // Device ID validation
  body('deviceId')
    .isUUID()
    .withMessage('Device ID must be a valid UUID')
    .notEmpty()
    .withMessage('Device ID is required')
    .optional(),

  // Trust action validation
  body('action')
    .isIn(['trust', 'untrust'])
    .withMessage('Action must be either "trust" or "untrust"')
    .optional(),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'DEVICE_VALIDATION_ERROR',
        message: 'Invalid device trust data',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Rate limiting specifically for SCA operations
 */
const scaRateLimit = {
  // Strict rate limiting for SCA verification attempts
  verification: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    keyGenerator: (req) => `sca_verify_${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    message: {
      error: 'SCA_RATE_LIMIT',
      message: 'Too many SCA verification attempts. Please try again later.',
      retryAfter: 15 * 60 // 15 minutes
    }
  },

  // Moderate rate limiting for SCA status checks
  status: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 requests per window
    keyGenerator: (req) => `sca_status_${req.user?.id || req.ip}`,
    message: {
      error: 'SCA_STATUS_RATE_LIMIT',
      message: 'Too many SCA status requests. Please slow down.'
    }
  },

  // Conservative rate limiting for device management
  devices: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // 20 requests per window
    keyGenerator: (req) => `sca_devices_${req.user?.id || req.ip}`,
    message: {
      error: 'SCA_DEVICES_RATE_LIMIT',
      message: 'Too many device management requests.'
    }
  }
};

/**
 * Security headers for SCA endpoints
 */
const scaSecurityHeaders = (req, res, next) => {
  // Add SCA-specific security headers
  res.set({
    'X-SCA-Protected': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
  });

  // Log SCA endpoint access
  logger.info('SCA endpoint accessed', {
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next();
};

/**
 * CSRF protection for SCA operations
 */
const scaCSRFProtection = (req, res, next) => {
  // Check for valid CSRF token in SCA operations
  const csrfToken = req.get('X-CSRF-Token') || req.body.csrfToken;

  if (!csrfToken && req.method !== 'GET') {
    logger.warn('SCA CSRF token missing', {
      userId: req.user?.id,
      endpoint: req.path,
      method: req.method
    });

    return res.status(403).json({
      error: 'SCA_CSRF_ERROR',
      message: 'CSRF token required for SCA operations'
    });
  }

  // In production, validate the CSRF token here
  // For now, we'll accept any non-empty token
  if (csrfToken && csrfToken.length < 8) {
    return res.status(403).json({
      error: 'SCA_CSRF_INVALID',
      message: 'Invalid CSRF token format'
    });
  }

  next();
};

module.exports = {
  validateSCAVerification,
  validateSCATransaction,
  validateDeviceTrust,
  scaRateLimit,
  scaSecurityHeaders,
  scaCSRFProtection
};