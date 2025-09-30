/**
 * Password Policy Middleware
 *
 * Enforces strong password requirements to protect user accounts.
 *
 * Requirements:
 * - Minimum 10 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Not in common password list
 *
 * Based on OWASP password recommendations:
 * https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 */

const logger = require('../utils/logger');

/**
 * List of commonly used passwords to reject
 * Source: Top 100 most common passwords
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '123456789', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
  'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  '654321', 'superman', 'qazwsx', 'michael', 'football', 'welcome', 'jesus',
  'ninja', 'mustang', 'password1', '123qwe', 'admin', 'p@ssw0rd', 'pass123',
  'Pluqla123', 'Welcome123', 'Admin123', 'User1234', 'Test1234'
];

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];

  // Check if password exists
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required']
    };
  }

  // Check minimum length
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for digit
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Check against common passwords (case-insensitive)
  const lowerPassword = password.toLowerCase();
  for (const commonPassword of COMMON_PASSWORDS) {
    if (lowerPassword === commonPassword.toLowerCase() || lowerPassword.includes(commonPassword.toLowerCase())) {
      errors.push('Password is too common. Please choose a more unique password');
      break;
    }
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., abc, 123)');
  }

  // Check for repeated characters (aaa, 111, etc.)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Express middleware to validate password on registration/reset
 * Expects password in req.body.password
 */
function enforcePasswordPolicy(req, res, next) {
  const { password } = req.body;

  // Validate password
  const validation = validatePassword(password);

  if (!validation.valid) {
    logger.warn('Password policy violation', {
      userId: req.user?.id,
      ip: req.ip,
      errors: validation.errors
    });

    return res.status(400).json({
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'Password does not meet security requirements',
      details: validation.errors
    });
  }

  // Password is valid, continue
  next();
}

/**
 * Check password strength score (0-4)
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
 */
function getPasswordStrength(password) {
  if (!password) return 0;

  let score = 0;

  // Length check
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;

  // Complexity checks
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;

  // Penalty for common patterns
  if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    score = Math.max(0, score - 2);
  }

  return Math.min(4, score);
}

/**
 * Middleware to check password match (password confirmation)
 */
function enforcePasswordMatch(req, res, next) {
  const { password, confirmPassword } = req.body;

  if (!confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_CONFIRMATION',
      message: 'Password confirmation is required'
    });
  }

  if (password !== confirmPassword) {
    logger.warn('Password confirmation mismatch', {
      userId: req.user?.id,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'PASSWORD_MISMATCH',
      message: 'Passwords do not match'
    });
  }

  next();
}

module.exports = {
  validatePassword,
  enforcePasswordPolicy,
  getPasswordStrength,
  enforcePasswordMatch
};
