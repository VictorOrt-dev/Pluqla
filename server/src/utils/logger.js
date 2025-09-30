/**
 * SECURE LOGGER PROXY
 *
 * This file now redirects to the secure logger to maintain backward compatibility
 * while ensuring all logging is sanitized to prevent secrets leakage.
 *
 * SECURITY CHANGE: All logging now automatically sanitizes:
 * - API keys (OpenAI, Anthropic, etc.)
 * - JWT tokens (access, refresh, reset, email verification)
 * - Database credentials and connection strings
 * - Email service credentials
 * - Authorization headers and sensitive request data
 * - User PII and other sensitive information
 *
 * No code changes required in existing files - drop-in replacement.
 */

const secureLogger = require('./secureLogger');

// Export the secure logger with all its security features
module.exports = secureLogger;
