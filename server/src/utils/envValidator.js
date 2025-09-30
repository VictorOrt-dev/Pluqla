/**
 * Environment Variables Security Validator
 * Validates all critical environment variables on startup
 */

const logger = require('./logger');

/**
 * List of critical environment variables that must be present
 */
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EMAIL_SECRET',
  'JWT_PASSWORD_RESET_SECRET',
  'FINANCIAL_ENCRYPTION_KEY',
  'BANK_ENCRYPTION_KEY',
  'DATABASE_URL'
];

/**
 * List of variables that should not contain default/example values
 */
const INSECURE_VALUES = [
  'your-super-secure',
  'CHANGE_ME',
  'example',
  'test',
  'dummy',
  'replace-me',
  '1234567890abcdef',
  'fedcba0987654321'
];

/**
 * Validate that environment variable exists and is secure
 */
function validateEnvVar(name, value) {
  const errors = [];

  // Check if variable exists
  if (!value) {
    errors.push(`❌ ${name} is missing or empty`);
    return errors;
  }

  // Check minimum length for security keys
  const minLengths = {
    JWT_SECRET: 32,
    JWT_REFRESH_SECRET: 32,
    JWT_EMAIL_SECRET: 32,
    JWT_PASSWORD_RESET_SECRET: 32,
    FINANCIAL_ENCRYPTION_KEY: 64,
    BANK_ENCRYPTION_KEY: 64
  };

  if (minLengths[name] && value.length < minLengths[name]) {
    errors.push(`❌ ${name} too short (${value.length} chars, need ${minLengths[name]}+)`);
  }

  // Check for insecure default values
  const lowerValue = value.toLowerCase();
  for (const insecureValue of INSECURE_VALUES) {
    if (lowerValue.includes(insecureValue.toLowerCase())) {
      errors.push(`❌ ${name} contains insecure default value: "${insecureValue}"`);
    }
  }

  // Check for hex format for encryption keys
  if (name.includes('ENCRYPTION_KEY')) {
    if (!/^[a-fA-F0-9]+$/.test(value)) {
      errors.push(`❌ ${name} must be valid hexadecimal (a-f, A-F, 0-9 only)`);
    }
  }

  return errors;
}

/**
 * Validate all environment variables
 */
function validateEnvironment() {
  console.log('🔒 Validating environment variables...');

  const allErrors = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    const errors = validateEnvVar(varName, value);
    allErrors.push(...errors);
  }

  // Additional validations
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('file:')) {
      allErrors.push('❌ Production should use PostgreSQL, not SQLite');
    }

    // COOKIE_DOMAIN is required in production for secure cookie handling
    if (!process.env.COOKIE_DOMAIN || process.env.COOKIE_DOMAIN.trim() === '') {
      allErrors.push('❌ COOKIE_DOMAIN is required in production (e.g., "pluqla.com" or ".pluqla.com")');
    }
  }

  // Report results
  if (allErrors.length === 0) {
    console.log('✅ All environment variables are secure');
    return true;
  }
  console.log('\n🚨 ENVIRONMENT SECURITY ISSUES FOUND:');
  allErrors.forEach((error) => console.log(`  ${error}`));
  console.log('\n💡 To fix:');
  console.log('  1. Generate secure keys: openssl rand -hex 32');
  console.log('  2. Update your .env file with real values');
  console.log('  3. Never commit .env to git');
  console.log('');

  if (process.env.NODE_ENV === 'production') {
    console.log('🛑 PRODUCTION DEPLOYMENT BLOCKED - Fix security issues first');
    process.exit(1);
  } else {
    console.log('⚠️  Development mode - Fix these before deploying');
    return false;
  }
}

/**
 * Generate secure environment template
 */
function generateSecureEnv() {
  console.log('🔑 Generating secure environment variables:');
  console.log('');
  console.log('# Add these to your .env file:');

  const crypto = require('crypto');

  const secureVars = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_EMAIL_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_PASSWORD_RESET_SECRET: crypto.randomBytes(32).toString('hex'),
    FINANCIAL_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    BANK_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
  };

  for (const [key, value] of Object.entries(secureVars)) {
    console.log(`${key}="${value}"`);
  }
  console.log('');
}

module.exports = {
  validateEnvironment,
  generateSecureEnv,
  validateEnvVar
};
