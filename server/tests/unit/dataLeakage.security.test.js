/**
 * SECURITY TEST: Data Leakage Prevention
 *
 * Tests that sensitive data is never leaked through:
 * - API responses
 * - Error messages
 * - Logs
 * - Debug information
 */

const request = require('supertest');
const app = require('../../src/app');
const secureLogger = require('../../src/utils/secureLogger');
const { sanitizeObject, sanitizeValue } = secureLogger;

// Mock winston to capture log output
let logCapture = [];
jest.mock('winston', () => ({
  createLogger: () => ({
    error: (message, data) => logCapture.push({ level: 'error', message, data }),
    warn: (message, data) => logCapture.push({ level: 'warn', message, data }),
    info: (message, data) => logCapture.push({ level: 'info', message, data }),
    debug: (message, data) => logCapture.push({ level: 'debug', message, data }),
  }),
  format: {
    combine: () => ({}),
    timestamp: () => ({}),
    colorize: () => ({}),
    printf: () => ({})
  },
  transports: {
    Console: class {},
    File: class {}
  },
  addColors: () => {}
}));

describe('Data Leakage Prevention Security', () => {
  beforeEach(() => {
    logCapture = [];
  });

  describe('Sensitive Data Sanitization', () => {
    test('should mask API keys in log data', () => {
      const testData = {
        openai_key: 'sk-1234567890abcdef1234567890abcdef',
        anthropic_key: 'sk-ant-api03-abcdef1234567890_abcdef1234567890',
        regular_field: 'safe_value'
      };

      const sanitized = sanitizeObject(testData);

      expect(sanitized.openai_key).toMatch(/sk-1\*+ef/); // Masked
      expect(sanitized.anthropic_key).toMatch(/sk-\*+90/); // Masked
      expect(sanitized.regular_field).toBe('safe_value'); // Unchanged
    });

    test('should mask JWT tokens completely', () => {
      const testJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const sanitized = sanitizeValue(testJWT);
      
      expect(sanitized).toMatch(/eyJh\*+w5c/); // Start and end visible, middle masked
      expect(sanitized).not.toBe(testJWT); // Should be different
    });

    test('should mask database connection strings', () => {
      const dbUrl = 'postgresql://user:password123@localhost:5432/pluqla';
      
      const sanitized = sanitizeValue(dbUrl);
      
      expect(sanitized).not.toContain('password123');
      expect(sanitized).toMatch(/post\*+uqla/);
    });

    test('should handle nested object sanitization', () => {
      const complexData = {
        user: {
          email: 'test@example.com',
          password: 'supersecret123'
        },
        api: {
          key: 'sk-1234567890abcdef1234567890abcdef'
        },
        config: {
          database_url: 'postgresql://user:pass@host/db'
        }
      };

      const sanitized = sanitizeObject(complexData);

      expect(sanitized.user.password).toMatch(/su\*+/);
      expect(sanitized.api.key).toMatch(/sk-\*+ef/);
      expect(sanitized.config.database_url).toMatch(/po\*+db/);
      expect(sanitized.user.email).toBe('test@example.com'); // Email should remain
    });

    test('should handle Error objects safely', () => {
      const error = new Error('Database connection failed: postgresql://user:secret@host/db');
      error.stack = 'Error: Database connection failed\n    at /app/database.js:42:13';
      
      const sanitized = sanitizeObject(error);
      
      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).not.toContain('secret');
      expect(sanitized.message).toMatch(/po\*+db/);
    });
  });

  describe('API Response Security', () => {
    test('should never return user passwords in API responses', async () => {
      // Create test user
      const testUser = {
        email: 'leak.test@pluqla.com',
        password: 'TestPassword123!',
        name: 'Leak Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Check registration response
      expect(registerResponse.body.data.user.password).toBeUndefined();
      
      // Login and check response
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(loginResponse.body.data.user.password).toBeUndefined();

      // Verify token and check response
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

      expect(verifyResponse.body.user.password).toBeUndefined();
    });

    test('should not leak sensitive fields in error responses', async () => {
      // Attempt invalid login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      const responseText = JSON.stringify(response.body);
      
      // Should not contain sensitive patterns
      expect(responseText).not.toMatch(/sk-[a-zA-Z0-9]+/);
      expect(responseText).not.toMatch(/eyJ[a-zA-Z0-9\-_]+/);
      expect(responseText).not.toMatch(/postgresql:\/\//);
      expect(responseText).not.toMatch(/\$2b\$/);
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Trigger an error
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.details).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should provide stack traces only in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Trigger an error that gets caught by error handler
      const response = await request(app)
        .post('/api/auth/login')
        .send({}); // Missing required fields

      // In development, some debug info might be available, but still sanitized
      if (response.body.stack) {
        expect(response.body.stack).not.toMatch(/sk-[a-zA-Z0-9]+/);
        expect(response.body.stack).not.toMatch(/eyJ[a-zA-Z0-9\-_]+/);
      }
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Request Header Sanitization', () => {
    test('should sanitize authorization headers in logs', () => {
      const headers = {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        'x-api-key': 'sk-1234567890abcdef1234567890abcdef',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Test Browser)'
      };

      const sanitized = secureLogger.sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
      expect(sanitized['content-type']).toBe('application/json'); // Safe header unchanged
      expect(sanitized['user-agent']).toBe('Mozilla/5.0 (Test Browser)'); // Safe header unchanged
    });
  });

  describe('Database Query Security', () => {
    test('should prevent SQL injection in Prisma queries', async () => {
      // This test ensures Prisma's parameterized queries prevent injection
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: 'anypassword'
        })
        .expect(401); // Should fail authentication, not crash

      expect(response.body.success).toBe(false);
      // Database should still be intact (implicit test - if DROP TABLE worked, subsequent tests would fail)
    });
  });
});
