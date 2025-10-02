/**
 * 🔒 PII LEAK DETECTION TESTS
 *
 * Automated security tests to ensure logs and responses don't leak PII.
 * Critical for GDPR compliance and user privacy.
 *
 * PII Checks:
 * - JWT tokens → masked or redacted
 * - Database connection strings → credentials hidden
 * - User emails → partially masked (te***@pluqla.com)
 * - Passwords → never logged
 * - Credit card numbers → never logged
 * - API keys → never logged
 *
 * Test Strategy:
 * - Intercept logger calls
 * - Parse log output
 * - Detect PII patterns with regex
 * - Verify sanitization functions
 */

const logger = require('../../src/utils/logger');
const { sanitizePII } = require('../../src/utils/logger');

describe('PII Leak Detection - Logging Security', () => {
  let logSpy;
  let capturedLogs = [];

  beforeEach(() => {
    capturedLogs = [];

    // Spy on logger methods to capture all log output
    logSpy = jest.spyOn(logger, 'info').mockImplementation((...args) => {
      capturedLogs.push({ level: 'info', args });
    });
    jest.spyOn(logger, 'warn').mockImplementation((...args) => {
      capturedLogs.push({ level: 'warn', args });
    });
    jest.spyOn(logger, 'error').mockImplementation((...args) => {
      capturedLogs.push({ level: 'error', args });
    });
    jest.spyOn(logger, 'debug').mockImplementation((...args) => {
      capturedLogs.push({ level: 'debug', args });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('JWT Token Sanitization', () => {
    const jwtPatterns = [
      /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT format
      /Bearer\s+eyJ[A-Za-z0-9_-]+/, // Authorization header
      /accessToken['":\s]+eyJ[A-Za-z0-9_-]+/, // JSON key
      /refreshToken['":\s]+eyJ[A-Za-z0-9_-]+/ // JSON key
    ];

    it('should never log full JWT tokens', () => {
      const testJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      // Attempt to log JWT (should be sanitized)
      logger.info('User login', { token: testJWT });

      // Check captured logs
      const allLogs = JSON.stringify(capturedLogs);

      jwtPatterns.forEach(pattern => {
        expect(allLogs).not.toMatch(pattern);
      });
    });

    it('should mask JWT tokens in error logs', () => {
      const error = new Error('Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYifQ.test');

      logger.error('Auth error', { error: error.message });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    });

    it('should handle multiple JWT tokens in same log', () => {
      const data = {
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123',
        refreshToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.xyz789'
      };

      logger.info('Tokens issued', data);

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    });
  });

  describe('Database Connection String Sanitization', () => {
    const dbPatterns = [
      /postgresql:\/\/[^:]+:[^@]+@/, // PostgreSQL with credentials
      /mongodb:\/\/[^:]+:[^@]+@/, // MongoDB with credentials
      /mysql:\/\/[^:]+:[^@]+@/, // MySQL with credentials
      /password=[^&\s]+/, // Password parameter
      /pwd=[^&\s]+/ // Short password param
    ];

    it('should never log database passwords', () => {
      const connectionString = 'postgresql://admin:SuperSecret123@localhost:5432/pluqla';

      logger.info('DB connection', { url: connectionString });

      const allLogs = JSON.stringify(capturedLogs);

      dbPatterns.forEach(pattern => {
        expect(allLogs).not.toMatch(pattern);
      });
      expect(allLogs).not.toContain('SuperSecret123');
    });

    it('should mask connection strings in error messages', () => {
      const error = new Error('Connection failed: postgresql://user:pass123@db.example.com:5432/mydb');

      logger.error('Database error', { message: error.message });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('pass123');
      expect(allLogs).not.toMatch(/:[^@]+@/); // :password@ pattern
    });

    it('should handle DATABASE_URL from env vars', () => {
      const envData = {
        DATABASE_URL: 'postgresql://prod_user:Pr0d_P@ssw0rd@prod-db.pluqla.com:5432/pluqla_prod'
      };

      logger.info('Environment loaded', envData);

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('Pr0d_P@ssw0rd');
      expect(allLogs).not.toContain('prod_user:');
    });
  });

  describe('Email Address Sanitization', () => {
    it('should partially mask user emails', () => {
      const email = 'john.doe@pluqla.com';

      logger.info('User action', { email });

      const allLogs = JSON.stringify(capturedLogs);

      // Should not contain full email
      expect(allLogs).not.toContain('john.doe@pluqla.com');

      // Should contain masked version (e.g., jo***@pluqla.com or j***e@pluqla.com)
      expect(allLogs).toMatch(/[a-z]{1,2}\*{3,}@pluqla\.com|[a-z]\*+[a-z]@pluqla\.com/);
    });

    it('should mask emails in arrays', () => {
      const users = [
        { email: 'alice@test.com' },
        { email: 'bob@test.com' }
      ];

      logger.info('Users loaded', { users });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('alice@test.com');
      expect(allLogs).not.toContain('bob@test.com');
    });

    it('should preserve domain for support debugging', () => {
      const email = 'support@pluqla.com';

      logger.info('Email sent', { to: email });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).toContain('@pluqla.com'); // Domain preserved
      expect(allLogs).not.toContain('support@pluqla.com'); // Full email masked
    });
  });

  describe('Password Sanitization', () => {
    it('should never log passwords', () => {
      const loginData = {
        email: 'user@test.com',
        password: 'MySecurePassword123!'
      };

      logger.info('Login attempt', loginData);

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('MySecurePassword123!');
      expect(allLogs).not.toContain('"password"');
    });

    it('should sanitize password in nested objects', () => {
      const request = {
        body: {
          credentials: {
            email: 'user@test.com',
            password: 'Secret123',
            confirmPassword: 'Secret123'
          }
        }
      };

      logger.info('Request received', request);

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('Secret123');
    });

    it('should handle password reset tokens', () => {
      const resetToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

      logger.info('Password reset', { token: resetToken });

      const allLogs = JSON.stringify(capturedLogs);
      // Token should be truncated or masked
      expect(allLogs).not.toContain(resetToken);
    });
  });

  describe('API Key and Secret Sanitization', () => {
    it('should never log API keys', () => {
      const apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';

      logger.info('API request', { apiKey });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain(apiKey);
      expect(allLogs).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    });

    it('should mask OpenAI API keys', () => {
      process.env.OPENAI_API_KEY = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';

      logger.info('AI config', { openAIKey: process.env.OPENAI_API_KEY });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('sk-proj-1234567890');
    });

    it('should mask Stripe secret keys', () => {
      const stripeKey = 'sk_test_FAKE1234567890TEST_KEY_FOR_TESTING_ONLY';

      logger.info('Payment config', { stripeSecret: stripeKey });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain(stripeKey);
      expect(allLogs).not.toMatch(/sk_(live|test)_[A-Za-z0-9]{20,}/);
    });
  });

  describe('Sanitization Utility Function', () => {
    it('should provide a working sanitizePII function', () => {
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.test',
        apiKey: 'sk-1234567890',
        dbUrl: 'postgresql://admin:pass@localhost/db'
      };

      const sanitized = sanitizePII(sensitiveData);

      // Email should be masked
      expect(sanitized.email).toMatch(/\*+@example\.com/);

      // Password should be removed or masked
      expect(sanitized.password).toMatch(/\[REDACTED\]|\*+/);

      // Tokens should be truncated
      expect(sanitized.accessToken).not.toContain('eyJ');
      expect(sanitized.accessToken).toMatch(/\[JWT\]|\*+/);

      // API keys should be masked
      expect(sanitized.apiKey).toMatch(/sk-\*+|\[REDACTED\]/);

      // DB URL should hide credentials
      expect(sanitized.dbUrl).not.toContain('pass');
      expect(sanitized.dbUrl).toMatch(/\[REDACTED\]|\*+/);
    });

    it('should handle null and undefined values', () => {
      const data = {
        email: null,
        password: undefined,
        token: ''
      };

      const sanitized = sanitizePII(data);

      expect(sanitized.email).toBeNull();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.token).toBe('');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        userId: '123',
        action: 'login',
        timestamp: '2024-01-01',
        ipAddress: '192.168.1.1'
      };

      const sanitized = sanitizePII(data);

      expect(sanitized.userId).toBe('123');
      expect(sanitized.action).toBe('login');
      expect(sanitized.timestamp).toBe('2024-01-01');
      expect(sanitized.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('Credit Card Number Sanitization', () => {
    it('should mask credit card numbers', () => {
      const ccNumber = '4532-1234-5678-9010';

      logger.info('Payment info', { cardNumber: ccNumber });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('4532-1234-5678-9010');
      expect(allLogs).not.toMatch(/\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/);
    });

    it('should mask CVV codes', () => {
      const paymentData = {
        cvv: '123',
        cvc: '456'
      };

      logger.info('Card validation', paymentData);

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('"cvv":"123"');
      expect(allLogs).not.toContain('"cvc":"456"');
    });
  });

  describe('Production Log Compliance', () => {
    it('should enforce GDPR-compliant logging', () => {
      const userData = {
        id: 'user-123',
        email: 'gdpr@example.com',
        name: 'John Doe',
        phone: '+33612345678',
        address: '123 Main St, Paris',
        ssn: '123-45-6789'
      };

      logger.info('User profile', userData);

      const allLogs = JSON.stringify(capturedLogs);

      // PII should be masked
      expect(allLogs).not.toContain('gdpr@example.com');
      expect(allLogs).not.toContain('John Doe');
      expect(allLogs).not.toContain('+33612345678');
      expect(allLogs).not.toContain('123 Main St, Paris');
      expect(allLogs).not.toContain('123-45-6789');

      // ID should be preserved (non-PII identifier)
      expect(allLogs).toContain('user-123');
    });

    it('should sanitize error stack traces containing PII', () => {
      const error = new Error('Login failed for user@example.com with token eyJhbGci...');
      error.stack = `Error: Login failed for user@example.com
        at AuthController.login (auth.js:42)
        at process._tickCallback (internal/process/next_tick.js:68)`;

      logger.error('Auth error', { error: error.message, stack: error.stack });

      const allLogs = JSON.stringify(capturedLogs);
      expect(allLogs).not.toContain('user@example.com');
      expect(allLogs).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    });
  });
});
