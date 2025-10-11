#!/usr/bin/env node

/**
 * Environment Variables Security Validation Script
 *
 * Validates that all required environment variables are set
 * and meet minimum security requirements
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Load environment variables
require('dotenv').config();

// Validation results
const results = {
  passed: [],
  warnings: [],
  failed: [],
  critical: [],
};

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

/**
 * Check if variable exists
 */
function checkExists(varName, required = true) {
  const value = process.env[varName];

  if (!value || value.trim() === '') {
    if (required) {
      results.failed.push(`${varName} is not set`);
      return false;
    } else {
      results.warnings.push(`${varName} is not set (optional)`);
      return false;
    }
  }

  return true;
}

/**
 * Check minimum length
 */
function checkMinLength(varName, minLength, critical = false) {
  if (!checkExists(varName)) return false;

  const value = process.env[varName];

  if (value.length < minLength) {
    const message = `${varName} is too short (${value.length} < ${minLength} characters)`;

    if (critical) {
      results.critical.push(message);
    } else {
      results.failed.push(message);
    }

    return false;
  }

  results.passed.push(`${varName} meets minimum length requirement`);
  return true;
}

/**
 * Check if hex string
 */
function checkIsHex(varName) {
  if (!checkExists(varName)) return false;

  const value = process.env[varName];
  const hexRegex = /^[0-9a-fA-F]+$/;

  if (!hexRegex.test(value)) {
    results.warnings.push(`${varName} should be a hexadecimal string`);
    return false;
  }

  results.passed.push(`${varName} is valid hex format`);
  return true;
}

/**
 * Check JWT secret security
 */
function checkJWTSecret(varName) {
  if (!checkExists(varName)) return false;

  const value = process.env[varName];

  // Check length (minimum 32 characters for HS256)
  if (value.length < 32) {
    results.critical.push(`${varName} is too short for secure JWT signing (${value.length} < 32 bytes)`);
    return false;
  }

  // Check entropy
  const entropy = calculateEntropy(value);
  if (entropy < 3.5) {
    results.warnings.push(`${varName} has low entropy (${entropy.toFixed(2)}). Consider using a more random secret.`);
  }

  // Check for common weak patterns
  const weakPatterns = [
    /^(123|abc|password|secret|test)/i,
    /^(.)\1+$/,  // Same character repeated
    /^(012|123|234|345|456|567|678|789|890)+$/,  // Sequential numbers
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(value)) {
      results.critical.push(`${varName} contains weak/predictable patterns`);
      return false;
    }
  }

  results.passed.push(`${varName} meets security requirements`);
  return true;
}

/**
 * Calculate Shannon entropy
 */
function calculateEntropy(str) {
  const len = str.length;
  const frequencies = {};

  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Check database URL
 */
function checkDatabaseURL(varName) {
  if (!checkExists(varName)) return false;

  const value = process.env[varName];

  // Check if it's a valid PostgreSQL URL
  const postgresRegex = /^postgresql:\/\/.+/i;

  if (!postgresRegex.test(value)) {
    results.failed.push(`${varName} is not a valid PostgreSQL URL`);
    return false;
  }

  // Warn if using default/weak credentials
  if (value.includes('postgres:postgres@') || value.includes('password@')) {
    results.warnings.push(`${varName} may contain default/weak credentials`);
  }

  // Warn if using localhost in production
  if (process.env.NODE_ENV === 'production' && value.includes('localhost')) {
    results.warnings.push(`${varName} uses localhost in production environment`);
  }

  results.passed.push(`${varName} format is valid`);
  return true;
}

/**
 * Check Redis URL
 */
function checkRedisURL(varName, required = false) {
  if (!checkExists(varName, required)) return false;

  const value = process.env[varName];
  const redisRegex = /^redis:\/\/.+/i;

  if (!redisRegex.test(value)) {
    results.failed.push(`${varName} is not a valid Redis URL`);
    return false;
  }

  results.passed.push(`${varName} format is valid`);
  return true;
}

/**
 * Check email configuration
 */
function checkEmailConfig() {
  const emailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  let allPresent = true;

  emailVars.forEach(varName => {
    if (!checkExists(varName, false)) {
      allPresent = false;
    }
  });

  if (!allPresent) {
    results.warnings.push('Email configuration incomplete (email features may not work)');
  } else {
    results.passed.push('Email configuration is complete');
  }
}

/**
 * Check AI provider API keys
 */
function checkAIProviders() {
  const providers = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_AI_API_KEY'
  ];

  let anyConfigured = false;

  providers.forEach(provider => {
    if (checkExists(provider, false)) {
      anyConfigured = true;

      // Check API key format
      const value = process.env[provider];

      if (provider === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
        results.warnings.push(`${provider} should start with 'sk-'`);
      }

      if (provider === 'ANTHROPIC_API_KEY' && !value.startsWith('sk-ant-')) {
        results.warnings.push(`${provider} should start with 'sk-ant-'`);
      }
    }
  });

  if (!anyConfigured) {
    results.warnings.push('No AI provider API keys configured (AI features will not work)');
  }
}

/**
 * Check session configuration
 */
function checkSessionConfig() {
  checkExists('SESSION_SECRET', true);
  checkMinLength('SESSION_SECRET', 32, true);

  // Check session limits
  const maxSessions = process.env.MAX_CONCURRENT_SESSIONS;
  if (maxSessions) {
    const num = parseInt(maxSessions, 10);
    if (isNaN(num) || num < 1) {
      results.failed.push('MAX_CONCURRENT_SESSIONS must be a positive integer');
    } else if (num > 100) {
      results.warnings.push('MAX_CONCURRENT_SESSIONS is very high (>100). Consider lowering for security.');
    } else {
      results.passed.push('MAX_CONCURRENT_SESSIONS is valid');
    }
  }

  // Check session policy
  const sessionPolicy = process.env.SESSION_POLICY;
  if (sessionPolicy) {
    const validPolicies = ['reject', 'drop-oldest'];
    if (!validPolicies.includes(sessionPolicy)) {
      results.failed.push(`SESSION_POLICY must be one of: ${validPolicies.join(', ')}`);
    } else {
      results.passed.push('SESSION_POLICY is valid');
    }
  }
}

/**
 * Check rate limiting
 */
function checkRateLimiting() {
  const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED;

  if (rateLimitEnabled === 'false') {
    results.warnings.push('Rate limiting is disabled (not recommended for production)');
  } else {
    results.passed.push('Rate limiting is enabled');
  }

  // Check rate limit window
  const windowMs = process.env.RATE_LIMIT_WINDOW_MS;
  if (windowMs) {
    const num = parseInt(windowMs, 10);
    if (isNaN(num) || num < 1000) {
      results.failed.push('RATE_LIMIT_WINDOW_MS should be at least 1000ms');
    }
  }
}

/**
 * Main validation
 */
function main() {
  log('\n🔒 Environment Variables Security Validation\n', 'cyan');
  log('='.repeat(60), 'cyan');

  // Core security checks
  log('\n🔐 JWT Security:', 'blue');
  checkJWTSecret('JWT_SECRET');
  checkJWTSecret('JWT_REFRESH_SECRET');

  // Additional JWT secrets (optional but recommended)
  if (checkExists('JWT_EMAIL_SECRET', false)) {
    checkJWTSecret('JWT_EMAIL_SECRET');
  }
  if (checkExists('JWT_PASSWORD_RESET_SECRET', false)) {
    checkJWTSecret('JWT_PASSWORD_RESET_SECRET');
  }

  // Database
  log('\n💾 Database Configuration:', 'blue');
  checkDatabaseURL('DATABASE_URL');

  if (process.env.NODE_ENV !== 'production') {
    checkDatabaseURL('DATABASE_URL_TEST');
  }

  // Redis (optional but recommended)
  log('\n🔴 Cache Configuration:', 'blue');
  checkRedisURL('REDIS_URL', false);

  // Email
  log('\n📧 Email Configuration:', 'blue');
  checkEmailConfig();

  // AI Providers
  log('\n🤖 AI Configuration:', 'blue');
  checkAIProviders();

  // Session management
  log('\n🔑 Session Configuration:', 'blue');
  checkSessionConfig();

  // Rate limiting
  log('\n⏱️  Rate Limiting:', 'blue');
  checkRateLimiting();

  // Node environment
  log('\n🌍 Environment:', 'blue');
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    results.warnings.push('NODE_ENV is not set (defaulting to development)');
  } else if (nodeEnv === 'production') {
    log(`   NODE_ENV: ${nodeEnv} ✅`, 'green');

    // Production-specific checks
    if (process.env.CLEANUP_ENABLED === 'false') {
      results.warnings.push('Session cleanup is disabled in production');
    }
  } else {
    log(`   NODE_ENV: ${nodeEnv}`, 'yellow');
  }

  // Display results
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 VALIDATION RESULTS:\n', 'cyan');

  // Critical issues
  if (results.critical.length > 0) {
    log(`\n❌ CRITICAL ISSUES (${results.critical.length}):`, 'red');
    results.critical.forEach(issue => log(`   • ${issue}`, 'red'));
  }

  // Failures
  if (results.failed.length > 0) {
    log(`\n❌ FAILED (${results.failed.length}):`, 'red');
    results.failed.forEach(issue => log(`   • ${issue}`, 'red'));
  }

  // Warnings
  if (results.warnings.length > 0) {
    log(`\n⚠️  WARNINGS (${results.warnings.length}):`, 'yellow');
    results.warnings.forEach(issue => log(`   • ${issue}`, 'yellow'));
  }

  // Passed checks
  if (results.passed.length > 0) {
    log(`\n✅ PASSED (${results.passed.length}):`, 'green');
    results.passed.forEach(issue => log(`   • ${issue}`, 'green'));
  }

  // Final summary
  log('\n' + '='.repeat(60), 'cyan');

  const totalIssues = results.critical.length + results.failed.length;

  if (totalIssues > 0) {
    log('\n❌ VALIDATION FAILED', 'red');
    log(`   Critical: ${results.critical.length}`, 'red');
    log(`   Failed: ${results.failed.length}`, 'red');
    log(`   Warnings: ${results.warnings.length}`, 'yellow');
    log('\nPlease fix the issues above before deploying to production.\n', 'red');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    log('\n⚠️  VALIDATION PASSED WITH WARNINGS', 'yellow');
    log(`   Warnings: ${results.warnings.length}`, 'yellow');
    log('\nConsider addressing warnings for better security.\n', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ ALL VALIDATIONS PASSED', 'green');
    log('\nYour environment is properly configured for production.\n', 'green');
    process.exit(0);
  }
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = { checkJWTSecret, checkDatabaseURL, calculateEntropy };
