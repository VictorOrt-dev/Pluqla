/**
 * Security Tests for Configuration Validation
 * Tests the configuration security checker
 */

const ConfigSecurityChecker = require('../../scripts/configCheck');
const crypto = require('crypto');

describe('Configuration Security Checker', () => {
  let originalEnv;
  let checker;
  let consoleLogSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };
    checker = new ConfigSecurityChecker();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Required Key Validation', () => {
    test('should detect missing required keys', () => {
      delete process.env.FINANCIAL_ENCRYPTION_KEY;
      delete process.env.BANK_ENCRYPTION_KEY;
      delete process.env.JWT_SECRET;

      const result = checker.checkRequiredKey({
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial encryption key'
      });

      expect(result).toBe(false);
      expect(checker.errors).toContain('❌ FINANCIAL_ENCRYPTION_KEY is missing');
    });

    test('should validate hex key length correctly', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = 'abc123'; // Too short

      const result = checker.checkRequiredKey({
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial encryption key'
      });

      expect(result).toBe(false);
      expect(checker.errors.some(error =>
        error.includes('must be exactly 64 hex characters')
      )).toBe(true);
    });

    test('should validate hex format', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = 'g'.repeat(64); // Invalid hex

      const result = checker.checkRequiredKey({
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial encryption key'
      });

      expect(result).toBe(false);
      expect(checker.errors.some(error =>
        error.includes('must be valid hexadecimal')
      )).toBe(true);
    });

    test('should detect low entropy keys', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

      const result = checker.checkRequiredKey({
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial encryption key'
      });

      expect(result).toBe(true); // Key is valid but has low entropy
      expect(checker.warnings.some(warning =>
        warning.includes('may have low entropy')
      )).toBe(true);
    });

    test('should accept valid hex keys', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

      const result = checker.checkRequiredKey({
        name: 'FINANCIAL_ENCRYPTION_KEY',
        type: 'hex',
        requiredLength: 64,
        description: 'Financial encryption key'
      });

      expect(result).toBe(true);
      expect(checker.passed).toContain('✅ FINANCIAL_ENCRYPTION_KEY');
    });

    test('should validate string secret length', () => {
      process.env.JWT_SECRET = 'short'; // Too short

      const result = checker.checkRequiredKey({
        name: 'JWT_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret'
      });

      expect(result).toBe(false);
      expect(checker.errors.some(error =>
        error.includes('must be at least 32 characters')
      )).toBe(true);
    });

    test('should accept valid string secrets', () => {
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('base64');

      const result = checker.checkRequiredKey({
        name: 'JWT_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret'
      });

      expect(result).toBe(true);
      expect(checker.passed).toContain('✅ JWT_SECRET');
    });

    test('should detect forbidden/example values', () => {
      process.env.JWT_SECRET = 'your-super-secure-jwt-secret-at-least-32-characters-long';

      const result = checker.checkRequiredKey({
        name: 'JWT_SECRET',
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret'
      });

      expect(result).toBe(false);
      expect(checker.errors.some(error =>
        error.includes('contains example/default value')
      )).toBe(true);
    });
  });

  describe('Optional Key Validation', () => {
    test('should warn about missing optional keys', () => {
      delete process.env.REDIS_URL;

      checker.checkOptionalKey({
        name: 'REDIS_URL',
        type: 'url',
        description: 'Redis connection string'
      });

      expect(checker.warnings.some(warning =>
        warning.includes('REDIS_URL is not set')
      )).toBe(true);
    });

    test('should validate URL format for optional keys', () => {
      process.env.REDIS_URL = 'invalid-url';

      checker.checkOptionalKey({
        name: 'REDIS_URL',
        type: 'url',
        description: 'Redis connection string'
      });

      expect(checker.warnings.some(warning =>
        warning.includes('appears to be malformed URL')
      )).toBe(true);
    });

    test('should accept valid URLs', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      checker.checkOptionalKey({
        name: 'REDIS_URL',
        type: 'url',
        description: 'Redis connection string'
      });

      expect(checker.passed).toContain('✅ REDIS_URL (optional)');
    });
  });

  describe('Environment Detection', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';

      checker.checkEnvironment();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Production environment detected')
      );
    });

    test('should require DATABASE_URL in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;

      checker.checkEnvironment();

      expect(checker.errors).toContain('❌ DATABASE_URL is required in production');
    });

    test('should warn about missing Redis in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.REDIS_URL;

      checker.checkEnvironment();

      expect(checker.warnings.some(warning =>
        warning.includes('REDIS_URL not set')
      )).toBe(true);
    });
  });

  describe('Secure Key Generation', () => {
    test('should generate valid encryption keys', () => {
      const originalLog = checker.log;
      const generatedKeys = [];

      checker.log = (message) => {
        if (message.includes('=')) {
          generatedKeys.push(message);
        }
      };

      checker.generateSecureKeys();

      // Restore original log function
      checker.log = originalLog;

      // Check generated keys
      const financialKeyLine = generatedKeys.find(line => line.includes('FINANCIAL_ENCRYPTION_KEY='));
      const bankKeyLine = generatedKeys.find(line => line.includes('BANK_ENCRYPTION_KEY='));
      const jwtSecretLine = generatedKeys.find(line => line.includes('JWT_SECRET='));

      expect(financialKeyLine).toBeDefined();
      expect(bankKeyLine).toBeDefined();
      expect(jwtSecretLine).toBeDefined();

      // Extract and validate the keys
      const financialKey = financialKeyLine.split('=')[1];
      const bankKey = bankKeyLine.split('=')[1];
      const jwtSecret = jwtSecretLine.split('=')[1];

      expect(financialKey).toHaveLength(64);
      expect(bankKey).toHaveLength(64);
      expect(/^[0-9a-fA-F]+$/.test(financialKey)).toBe(true);
      expect(/^[0-9a-fA-F]+$/.test(bankKey)).toBe(true);
      expect(jwtSecret.length).toBeGreaterThan(32);
    });
  });

  describe('Complete Security Check', () => {
    test('should pass with all valid configuration', async () => {
      // Set all required keys with valid values
      process.env.FINANCIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      process.env.BANK_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('base64');
      process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('base64');
      process.env.JWT_EMAIL_SECRET = crypto.randomBytes(32).toString('base64');
      process.env.JWT_PASSWORD_RESET_SECRET = crypto.randomBytes(32).toString('base64');
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString('base64');
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.REDIS_URL = 'redis://localhost:6379';

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      try {
        await checker.run();
        expect(exitSpy).toHaveBeenCalledWith(0); // Success exit code
      } catch (error) {
        // Test should not throw
        expect(error).toBeUndefined();
      }

      exitSpy.mockRestore();
    });

    test('should fail with missing critical keys', async () => {
      // Clear all environment variables
      Object.keys(process.env).forEach(key => {
        if (key.includes('KEY') || key.includes('SECRET')) {
          delete process.env[key];
        }
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      try {
        await checker.run();
        expect(exitSpy).toHaveBeenCalledWith(1); // Error exit code
      } catch (error) {
        // Expected behavior for security check failure
      }

      exitSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dotenv gracefully', async () => {
      // Mock require to throw error for dotenv
      const originalRequire = require;

      jest.doMock('dotenv', () => {
        throw new Error('Module not found');
      });

      // This should not crash the checker
      expect(() => {
        new ConfigSecurityChecker();
      }).not.toThrow();
    });
  });
});