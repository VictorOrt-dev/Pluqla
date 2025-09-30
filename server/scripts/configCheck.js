#!/usr/bin/env node

/**
 * Pre-flight Configuration Security Check
 * Validates that all required encryption keys and secrets are properly configured
 * Prevents deployment with missing or insecure configurations
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class ConfigSecurityChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.requiredKeys = [
      {
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial data encryption key (32 bytes hex)'
      },
      {
        name: 'BANK_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Bank credentials encryption key (32 bytes hex)'
      },
      {
        name: 'JWT_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret'
      },
      {
        name: 'JWT_REFRESH_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT refresh token secret'
      },
      {
        name: 'JWT_EMAIL_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT email verification secret'
      },
      {
        name: 'JWT_PASSWORD_RESET_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT password reset secret'
      },
      {
        name: 'SESSION_SECRET',
        type: 'string',
        minLength: 32,
        description: 'Session encryption secret'
      }
    ];

    this.optionalKeys = [
      {
        name: 'DATABASE_URL',
        type: 'url',
        description: 'Database connection string'
      },
      {
        name: 'REDIS_URL',
        type: 'url',
        description: 'Redis connection string (optional but recommended for production)'
      }
    ];

    this.forbiddenValues = [
      'your-super-secure-jwt-secret-at-least-32-characters-long',
      'your-super-secure-refresh-secret-at-least-32-characters',
      'your-super-secure-email-secret-at-least-32-characters',
      'your-super-secure-reset-secret-at-least-32-characters',
      'your-super-secure-session-secret-at-least-32-characters',
      'your-32-character-encryption-key-here',
      'test',
      'development',
      'password',
      '12345',
      'secret'
    ];
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logBold(message, color = 'white') {
    console.log(`${colors.bold}${colors[color]}${message}${colors.reset}`);
  }

  checkRequiredKey(keyConfig) {
    const value = process.env[keyConfig.name];

    if (!value) {
      this.errors.push(`❌ ${keyConfig.name} is missing`);
      this.log(`   Required: ${keyConfig.description}`, 'red');
      return false;
    }

    // Check for forbidden values
    if (this.forbiddenValues.some(forbidden => value.includes(forbidden))) {
      this.errors.push(`❌ ${keyConfig.name} contains example/default value`);
      this.log(`   Security Risk: Never use example values in production!`, 'red');
      return false;
    }

    // Check length requirements
    if (keyConfig.type === 'hex') {
      if (value.length !== keyConfig.requiredLength) {
        this.errors.push(`❌ ${keyConfig.name} must be exactly ${keyConfig.requiredLength} hex characters`);
        this.log(`   Current length: ${value.length}, Required: ${keyConfig.requiredLength}`, 'red');
        return false;
      }

      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(value)) {
        this.errors.push(`❌ ${keyConfig.name} must be valid hexadecimal`);
        this.log(`   Contains invalid hex characters`, 'red');
        return false;
      }

      // Check entropy (basic check for repeated patterns)
      const uniqueChars = new Set(value.toLowerCase()).size;
      if (uniqueChars < 8) {
        this.warnings.push(`⚠️  ${keyConfig.name} may have low entropy (${uniqueChars} unique characters)`);
        this.log(`   Consider generating a new random key`, 'yellow');
      }
    }

    if (keyConfig.type === 'string' && keyConfig.minLength) {
      if (value.length < keyConfig.minLength) {
        this.errors.push(`❌ ${keyConfig.name} must be at least ${keyConfig.minLength} characters`);
        this.log(`   Current length: ${value.length}, Minimum: ${keyConfig.minLength}`, 'red');
        return false;
      }
    }

    this.passed.push(`✅ ${keyConfig.name}`);
    return true;
  }

  checkOptionalKey(keyConfig) {
    const value = process.env[keyConfig.name];

    if (!value) {
      this.warnings.push(`⚠️  ${keyConfig.name} is not set`);
      this.log(`   ${keyConfig.description}`, 'yellow');
      return;
    }

    if (keyConfig.type === 'url') {
      try {
        new URL(value);
        this.passed.push(`✅ ${keyConfig.name} (optional)`);
      } catch (error) {
        this.warnings.push(`⚠️  ${keyConfig.name} appears to be malformed URL`);
        this.log(`   ${error.message}`, 'yellow');
      }
    }
  }

  checkEnvironment() {
    const nodeEnv = process.env.NODE_ENV || 'development';

    this.logBold(`\n🔐 Environment: ${nodeEnv.toUpperCase()}`, 'cyan');

    if (nodeEnv === 'production') {
      this.log('Production environment detected - strict security checks enabled', 'green');

      // Additional production checks
      if (!process.env.DATABASE_URL) {
        this.errors.push('❌ DATABASE_URL is required in production');
      }

      if (!process.env.REDIS_URL) {
        this.warnings.push('⚠️  REDIS_URL not set - OAuth state persistence will use database fallback');
      }
    } else {
      this.log('Development environment detected', 'yellow');
    }
  }

  checkFilePermissions() {
    const envFiles = ['.env', '.env.local', '.env.production'];

    for (const envFile of envFiles) {
      const envPath = path.join(process.cwd(), envFile);

      if (fs.existsSync(envPath)) {
        try {
          const stats = fs.statSync(envPath);
          const mode = stats.mode & parseInt('777', 8);

          // Check if file is readable by others (should be 600 or 640 max)
          if (mode & parseInt('044', 8)) {
            this.warnings.push(`⚠️  ${envFile} has permissive permissions (${mode.toString(8)})`);
            this.log(`   Recommendation: chmod 600 ${envFile}`, 'yellow');
          } else {
            this.passed.push(`✅ ${envFile} permissions`);
          }
        } catch (error) {
          this.warnings.push(`⚠️  Could not check permissions for ${envFile}`);
        }
      }
    }
  }

  generateSecureKeys() {
    this.logBold('\n🔑 Secure Key Generation Examples:', 'magenta');
    this.log('Add these to your .env file (NEVER commit to git):\n', 'white');

    // Generate hex keys
    const financialKey = crypto.randomBytes(32).toString('hex');
    const bankKey = crypto.randomBytes(32).toString('hex');

    // Generate base64 secrets
    const jwtSecret = crypto.randomBytes(32).toString('base64');
    const refreshSecret = crypto.randomBytes(32).toString('base64');
    const emailSecret = crypto.randomBytes(32).toString('base64');
    const resetSecret = crypto.randomBytes(32).toString('base64');
    const sessionSecret = crypto.randomBytes(32).toString('base64');

    this.log(`FINANCIAL_ENCRYPTION_KEY=${financialKey}`, 'green');
    this.log(`BANK_ENCRYPTION_KEY=${bankKey}`, 'green');
    this.log(`JWT_SECRET=${jwtSecret}`, 'green');
    this.log(`JWT_REFRESH_SECRET=${refreshSecret}`, 'green');
    this.log(`JWT_EMAIL_SECRET=${emailSecret}`, 'green');
    this.log(`JWT_PASSWORD_RESET_SECRET=${resetSecret}`, 'green');
    this.log(`SESSION_SECRET=${sessionSecret}`, 'green');

    this.log('\n💡 You can also generate keys using:', 'cyan');
    this.log('   Hex keys (64 chars): openssl rand -hex 32', 'cyan');
    this.log('   Base64 secrets: openssl rand -base64 32', 'cyan');
  }

  async run() {
    this.logBold('🔐 PLUQLA SECURITY CONFIGURATION CHECK', 'bold');
    this.log('Validating encryption keys and security configuration...\n');

    // Load environment variables if .env exists
    try {
      require('dotenv').config();
    } catch (error) {
      this.log('Note: dotenv not found, using system environment variables only', 'yellow');
    }

    this.checkEnvironment();

    this.logBold('\n📋 Checking Required Security Keys:', 'blue');
    for (const keyConfig of this.requiredKeys) {
      this.checkRequiredKey(keyConfig);
    }

    this.logBold('\n📋 Checking Optional Configuration:', 'blue');
    for (const keyConfig of this.optionalKeys) {
      this.checkOptionalKey(keyConfig);
    }

    this.logBold('\n🔒 Checking File Security:', 'blue');
    this.checkFilePermissions();

    // Summary
    this.logBold('\n📊 SECURITY CHECK SUMMARY:', 'bold');

    if (this.passed.length > 0) {
      this.logBold(`✅ Passed (${this.passed.length}):`, 'green');
      this.passed.forEach(item => this.log(`   ${item}`, 'green'));
    }

    if (this.warnings.length > 0) {
      this.logBold(`\n⚠️  Warnings (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach(item => this.log(`   ${item}`, 'yellow'));
    }

    if (this.errors.length > 0) {
      this.logBold(`\n❌ Errors (${this.errors.length}):`, 'red');
      this.errors.forEach(item => this.log(`   ${item}`, 'red'));

      this.generateSecureKeys();

      this.logBold('\n🚨 DEPLOYMENT BLOCKED', 'red');
      this.log('Fix the above security issues before deploying to production.', 'red');

      process.exit(1);
    }

    if (this.warnings.length > 0) {
      this.logBold('\n✅ Configuration Valid (with warnings)', 'yellow');
      this.log('Consider addressing the warnings above for optimal security.', 'yellow');
    } else {
      this.logBold('\n🎉 All Security Checks Passed!', 'green');
      this.log('Your configuration meets security standards.', 'green');
    }

    process.exit(0);
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  const checker = new ConfigSecurityChecker();
  checker.run().catch(error => {
    console.error('❌ Configuration check failed:', error);
    process.exit(1);
  });
}

module.exports = ConfigSecurityChecker;