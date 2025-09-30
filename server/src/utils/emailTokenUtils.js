/**
 * Secure Email Verification Token Utilities
 * Handles hashing and verification of email tokens
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate and hash email verification token
 * @returns {Object} { plainToken, hashedToken }
 */
function generateEmailVerificationToken() {
  // Generate a random token that's safe for URLs
  const plainToken = `${uuidv4()}-${crypto.randomBytes(16).toString('hex')}`;

  // Hash the token before storing in database
  const hashedToken = crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex');

  return {
    plainToken, // Send this in email
    hashedToken // Store this in database
  };
}

/**
 * Hash a plain token for database lookup
 * @param {string} plainToken - The plain token from email link
 * @returns {string} The hashed token for database query
 */
function hashEmailToken(plainToken) {
  return crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex');
}

/**
 * Generate secure password reset token
 * @returns {Object} { plainToken, hashedToken }
 */
function generatePasswordResetToken() {
  // Generate a longer, more secure token for password resets
  const plainToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex');

  return {
    plainToken,
    hashedToken
  };
}

module.exports = {
  generateEmailVerificationToken,
  hashEmailToken,
  generatePasswordResetToken
};
