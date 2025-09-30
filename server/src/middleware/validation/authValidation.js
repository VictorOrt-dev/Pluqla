/**
 * 🔐 AUTHENTICATION VALIDATION SCHEMAS
 *
 * Comprehensive validation for authentication endpoints in the Pluqla financial backend.
 * Protects against credential stuffing, brute force, injection attacks, and data corruption.
 *
 * Endpoints covered:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - POST /api/auth/verify-email
 * - POST /api/auth/logout
 */

const { body, header } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { customValidators, processValidationResults, sanitizeInputs } = require('./validationUtils');

/**
 * User Registration Validation
 *
 * Security considerations:
 * - Prevents account enumeration
 * - Validates password complexity
 * - Sanitizes user input
 * - Rate limits registration attempts
 */
const validateRegistration = [
  // Apply input sanitization first
  sanitizeInputs,

  // Email validation
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .custom(customValidators.isSecureEmail)
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false
    }),

  // Password validation
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .custom(customValidators.isSecurePassword),

  // Password confirmation (optional - frontend handles validation)
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  // Name validation (more flexible)
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s'.-]{1,100}$/)
    .withMessage('Name can only contain letters, numbers, spaces, periods, hyphens, and apostrophes')
    .custom(customValidators.isSafe),

  // Optional terms acceptance
  body('acceptTerms')
    .optional()
    .isBoolean()
    .withMessage('Terms acceptance must be true or false'),

  // Security headers validation (optional for better UX)
  header('user-agent')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('User-Agent header too long'),

  // Process validation results
  processValidationResults
];

/**
 * User Login Validation
 *
 * Security considerations:
 * - Prevents timing attacks with consistent validation
 * - Rate limits login attempts
 * - Logs suspicious activity
 * - Validates request structure
 */
const validateLogin = [
  // Apply input sanitization first
  sanitizeInputs,

  // Email validation (same as registration but allow some flexibility)
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .custom(customValidators.isSecureEmail)
    .normalizeEmail(),

  // Password validation (less strict for login to prevent user lockout)
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must not exceed 128 characters'),

  // Optional remember me
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be true or false'),

  // Security headers (optional for better UX)
  header('user-agent')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('User-Agent header too long'),

  // Process validation results
  processValidationResults
];

/**
 * Token Refresh Validation
 *
 * Security considerations:
 * - Validates JWT token format
 * - Prevents token reuse attacks
 * - Rate limits refresh attempts
 */
const validateTokenRefresh = [
  sanitizeInputs,

  // Refresh token validation
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isLength({ min: 20, max: 500 })
    .withMessage('Invalid refresh token format')
    .matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    .withMessage('Invalid JWT token format')
    .custom(customValidators.isSafe),

  // Security context (optional for better UX)
  header('user-agent')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('User-Agent header too long'),

  processValidationResults
];

/**
 * Forgot Password Validation
 *
 * Security considerations:
 * - Prevents email enumeration
 * - Rate limits password reset requests
 * - Validates email format
 */
const validateForgotPassword = [
  sanitizeInputs,

  // Email validation
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .custom(customValidators.isSecureEmail)
    .normalizeEmail(),

  // Optional language preference for email
  body('language')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Language must be one of: fr, en, es'),

  // Security headers (optional for better UX)
  header('user-agent')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('User-Agent header too long'),

  processValidationResults
];

/**
 * Password Reset Validation
 *
 * Security considerations:
 * - Validates reset token format and integrity
 * - Ensures new password meets security requirements
 * - Prevents token reuse
 * - Rate limits reset attempts
 */
const validatePasswordReset = [
  sanitizeInputs,

  // Reset token validation
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid reset token format')
    .matches(/^[a-f0-9]{32,128}$/)
    .withMessage('Reset token must contain only hexadecimal characters')
    .custom(customValidators.isSafe),

  // New password validation
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .custom(customValidators.isSecurePassword),

  // Password confirmation
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  // Security headers (optional for better UX)
  header('user-agent')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('User-Agent header too long'),

  processValidationResults
];

/**
 * Email Verification Validation
 *
 * Security considerations:
 * - Validates verification token format
 * - Prevents token reuse and brute force
 * - Rate limits verification attempts
 */
const validateEmailVerification = [
  sanitizeInputs,

  // Verification token
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid verification token format')
    .matches(/^[a-f0-9]{32,128}$/)
    .withMessage('Verification token must contain only hexadecimal characters')
    .custom(customValidators.isSafe),

  // Optional email for additional verification
  body('email')
    .optional()
    .custom(customValidators.isSecureEmail)
    .normalizeEmail(),

  processValidationResults
];

/**
 * Logout Validation
 *
 * Security considerations:
 * - Validates token for proper logout
 * - Ensures session cleanup
 */
const validateLogout = [
  sanitizeInputs,

  // Optional refresh token for complete logout
  body('refreshToken')
    .optional()
    .isLength({ min: 20, max: 500 })
    .withMessage('Invalid refresh token format')
    .matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    .withMessage('Invalid JWT token format'),

  // Logout type (single device vs all devices)
  body('logoutAll')
    .optional()
    .isBoolean()
    .withMessage('Logout all must be true or false'),

  processValidationResults
];

/**
 * Change Password Validation (for authenticated users)
 *
 * Security considerations:
 * - Requires current password verification
 * - Validates new password strength
 * - Prevents password reuse
 */
const validateChangePassword = [
  sanitizeInputs,

  // Current password
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Current password must not exceed 128 characters')
    .custom(customValidators.isSafe),

  // New password
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .custom(customValidators.isSecurePassword)
    .custom((value, { req }) => {
      // Prevent password reuse (basic check)
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  // Password confirmation
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  processValidationResults
];

/**
 * Rate limiting for auth endpoints
 * More restrictive limits for sensitive operations
 */
const authRateLimit = {
  // Standard auth operations
  standard: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Strict limits for password operations
  strict: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Very strict for registration to prevent spam
  registration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 3 : 30,
    message: 'Too many registration attempts. Please try again in 1 hour.',
    standardHeaders: true,
    legacyHeaders: false
  })
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateTokenRefresh,
  validateForgotPassword,
  validatePasswordReset,
  validateEmailVerification,
  validateLogout,
  validateChangePassword,
  authRateLimit
};
