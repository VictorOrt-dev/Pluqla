/**
 * 🛡️ SECURITY VALIDATION UTILITIES
 *
 * Production-grade validation utilities for the Pluqla financial backend.
 * Protects against injection attacks, XSS, data corruption, and malformed requests.
 *
 * Security Features:
 * - SQL/NoSQL injection prevention
 * - XSS attack mitigation
 * - Input sanitization and normalization
 * - Type safety validation
 * - Length and format constraints
 * - Regex DoS protection
 */

const {
  body, param, query, validationResult
} = require('express-validator');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');
const { sendValidationError } = require('../../utils/responseHelper');
const logger = require('../../utils/logger');

/**
 * Secure regex patterns to prevent ReDoS attacks
 * All patterns are tested for performance and safety
 */
const SECURE_PATTERNS = {
  // Email: RFC 5322 compliant but safe from ReDoS
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // UUID v4: Strict format validation
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Password: 8-128 chars, flexible complexity (2 of 3: letter, number, special char)
  password: /^(?=.*[A-Za-z])(?=.*\d)|(?=.*[A-Za-z])(?=.*[@$!%*#?&.,:;(){}[\]\\/"'\-_+=~`|<>^])|(?=.*\d)(?=.*[@$!%*#?&.,:;(){}[\]\\/"'\-_+=~`|<>^]).{8,128}$/,

  // Name: Letters, spaces, hyphens, apostrophes (no numbers/special chars)
  name: /^[a-zA-ZÀ-ÿ\s'-]{1,100}$/,

  // Category: Predefined financial categories
  category: /^(alimentation|habits|activite|deplacement|autres)$/,

  // JWT Token: Base64 URL-safe format
  jwtToken: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,

  // SQL Injection patterns (for detection and blocking)
  sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';]|--|\*|\|)/i,

  // XSS patterns (for detection and blocking)
  xssPatterns: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i
};

/**
 * Enhanced HTML sanitization configuration
 * Removes all potentially harmful content while preserving safe formatting
 */
const SANITIZE_CONFIG = {
  // Allow only safe HTML tags
  allowedTags: [],

  // Remove all attributes to prevent attribute-based XSS
  allowedAttributes: {},

  // Remove all schemas to prevent javascript: and data: URLs
  allowedSchemes: [],

  // Additional security options
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: [],
  allowProtocolRelative: false,
  enforceHtmlBoundary: false
};

/**
 * Core Validation Helper Functions
 */
class ValidationUtils {
  /**
   * Sanitize string input against XSS and injection attacks
   * @param {string} input - Raw input string
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized string
   */
  static sanitizeString(input, options = {}) {
    if (typeof input !== 'string') return '';

    // Step 1: HTML sanitization
    let sanitized = sanitizeHtml(input, SANITIZE_CONFIG);

    // Step 2: Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Step 3: Normalize Unicode to prevent bypass attempts
    sanitized = sanitized.normalize('NFC');

    // Step 4: Trim whitespace
    sanitized = sanitized.trim();

    // Step 5: Apply length limits
    const maxLength = options.maxLength || 1000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Detect potentially malicious input patterns
   * @param {string} input - Input to check
   * @returns {Object} Detection results
   */
  static detectMaliciousPatterns(input) {
    if (typeof input !== 'string') return { safe: true };

    const results = {
      safe: true,
      threats: []
    };

    // Check for SQL injection patterns
    if (SECURE_PATTERNS.sqlInjection.test(input)) {
      results.safe = false;
      results.threats.push('sql_injection');
    }

    // Check for XSS patterns
    if (SECURE_PATTERNS.xssPatterns.test(input)) {
      results.safe = false;
      results.threats.push('xss_attempt');
    }

    // Check for excessive length (potential DoS)
    if (input.length > 10000) {
      results.safe = false;
      results.threats.push('excessive_length');
    }

    return results;
  }

  /**
   * Validate email format with enhanced security
   * @param {string} email - Email to validate
   * @returns {boolean} Valid email
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;

    // Length check (RFC 5321 limit)
    if (email.length > 254) return false;

    // Basic pattern check
    if (!SECURE_PATTERNS.email.test(email)) return false;

    // Additional validation using validator library
    return validator.isEmail(email, {
      allow_utf8_local_part: false,
      require_tld: true,
      ignore_max_length: false
    });
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with details
   */
  static validatePassword(password) {
    const result = {
      valid: false,
      errors: []
    };

    if (!password || typeof password !== 'string') {
      result.errors.push('Password is required');
      return result;
    }

    // Length checks
    if (password.length < 8) {
      result.errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      result.errors.push('Password must not exceed 128 characters');
    }

    // Simplified complexity checks - more user-friendly
    let complexityScore = 0;

    if (/[A-Za-z]/.test(password)) {
      complexityScore++;
    }

    if (/\d/.test(password)) {
      complexityScore++;
    }

    if (/[@$!%*#?&.,:;(){}[\]\\/"'\-_+=~`|<>^]/.test(password)) {
      complexityScore++;
    }

    // Require at least 2 out of 3 complexity criteria (more flexible)
    if (complexityScore < 2) {
      result.errors.push('Password must contain at least 2 of the following: letters, numbers, or special characters');
    }

    // Common password checks
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
      result.errors.push('Password contains common patterns that are not secure');
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean} Valid UUID
   */
  static isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    return SECURE_PATTERNS.uuid.test(uuid);
  }

  /**
   * Validate financial amount
   * @param {number|string} amount - Amount to validate
   * @returns {Object} Validation result
   */
  static validateAmount(amount) {
    const result = {
      valid: false,
      value: null,
      errors: []
    };

    // Convert to number
    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
      result.errors.push('Amount must be a valid number');
      return result;
    }

    if (numAmount < 0) {
      result.errors.push('Amount cannot be negative');
      return result;
    }

    if (numAmount > 1000000000) {
      result.errors.push('Amount cannot exceed 1 billion');
      return result;
    }

    // Check for reasonable decimal places (max 2 for currency)
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      result.errors.push('Amount cannot have more than 2 decimal places');
      return result;
    }

    result.valid = result.errors.length === 0;
    result.value = Math.round(numAmount * 100) / 100; // Round to 2 decimal places

    return result;
  }

  /**
   * Validate date format and range
   * @param {string} date - Date to validate
   * @returns {Object} Validation result
   */
  static validateDate(date) {
    const result = {
      valid: false,
      value: null,
      errors: []
    };

    if (!date) {
      result.errors.push('Date is required');
      return result;
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      result.errors.push('Date must be in valid format');
      return result;
    }

    // Check reasonable date range (1900 to 50 years in future)
    const minDate = new Date('1900-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 50);

    if (dateObj < minDate || dateObj > maxDate) {
      result.errors.push('Date must be between 1900 and 50 years in the future');
      return result;
    }

    result.valid = true;
    result.value = dateObj.toISOString();

    return result;
  }
}

/**
 * Express-validator custom validators
 */
const customValidators = {

  /**
   * Custom email validator with enhanced security
   */
  isSecureEmail: (value) => {
    const isValid = ValidationUtils.isValidEmail(value);
    if (!isValid) {
      throw new Error('Please provide a valid email address');
    }
    return true;
  },

  /**
   * Custom password validator
   */
  isSecurePassword: (value) => {
    const validation = ValidationUtils.validatePassword(value);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  },

  /**
   * Custom UUID validator
   */
  isSecureUUID: (value) => {
    if (!ValidationUtils.isValidUUID(value)) {
      throw new Error('Must be a valid UUID format');
    }
    return true;
  },

  /**
   * Custom amount validator
   */
  isSecureAmount: (value) => {
    const validation = ValidationUtils.validateAmount(value);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  },

  /**
   * Custom date validator
   */
  isSecureDate: (value) => {
    const validation = ValidationUtils.validateDate(value);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  },

  /**
   * Custom threat detection validator
   */
  isSafe: (value) => {
    const detection = ValidationUtils.detectMaliciousPatterns(value);
    if (!detection.safe) {
      logger.warn('Malicious input detected', {
        threats: detection.threats,
        input: value ? `${value.substring(0, 100)}...` : 'null'
      });
      throw new Error('Input contains potentially harmful content');
    }
    return true;
  }
};

/**
 * Validation result processor middleware
 * Handles validation errors and returns standardized responses
 */
const processValidationResults = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();

    // Log security-relevant validation failures
    if (errorArray.some((err) => err.msg && (err.msg.includes('harmful') || err.msg.includes('injection')))) {
      logger.warn('Security validation failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        errors: errorArray.map((err) => ({ field: err.param, message: err.msg }))
      });
    }

    // Format errors for client response (without exposing sensitive details)
    const formattedErrors = errorArray.map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value ? '[REDACTED]' : undefined
    }));

    return sendValidationError(res, formattedErrors, 'Validation failed');
  }

  next();
};

/**
 * Sanitization middleware to clean all string inputs
 */
const sanitizeInputs = (req, res, next) => {
  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = ValidationUtils.sanitizeString(value);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = ValidationUtils.sanitizeString(value);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = ValidationUtils.sanitizeString(value);
      }
    }
  }

  next();
};

module.exports = {
  ValidationUtils,
  customValidators,
  processValidationResults,
  sanitizeInputs,
  SECURE_PATTERNS,
  SANITIZE_CONFIG
};
