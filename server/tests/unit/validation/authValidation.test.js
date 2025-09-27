/**
 * 🧪 AUTHENTICATION VALIDATION UNIT TESTS
 *
 * Comprehensive test suite for authentication validation middleware in Pluqla backend.
 * Tests critical security validations for user registration, login, and password operations.
 *
 * Test Categories:
 * - User registration validation
 * - Login validation
 * - Token refresh validation
 * - Password reset validation
 * - Email verification validation
 * - Security attack prevention
 * - Edge cases and error handling
 */

const request = require('supertest');
const express = require('express');
const {
  validateRegistration,
  validateLogin,
  validateTokenRefresh,
  validateForgotPassword,
  validatePasswordReset,
  validateEmailVerification,
  validateLogout,
  validateChangePassword
} = require('../../../src/middleware/validation/authValidation');

// Mock response helper
jest.mock('../../../src/utils/responseHelper', () => ({
  sendValidationError: jest.fn((res, errors, message) => {
    return res.status(400).json({ success: false, errors, message });
  })
}));

// Helper function to create test app
const createTestApp = (validation) => {
  const app = express();
  app.use(express.json());
  app.post('/test', validation, (req, res) => {
    res.json({ success: true, data: req.body });
  });
  return app;
};

describe('Authentication Validation Middleware', () => {

  describe('validateRegistration', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateRegistration);
    });

    test('should accept valid registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        name: 'John Doe'
      };

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double@domain.com',
        '.user@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({
            email,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
            name: 'John Doe'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        'short',
        'password',
        '12345678',
        'Password', // Missing number and special char
        'password123', // Missing uppercase and special char
        'Password123' // Missing special char
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({
            email: 'test@example.com',
            password,
            confirmPassword: password,
            name: 'John Doe'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject password mismatch', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'DifferentPass123!',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject invalid names', async () => {
      const invalidNames = [
        '', // Empty
        'A', // Too short
        'A'.repeat(101), // Too long
        'John123', // Contains numbers
        'John@Doe', // Contains special chars
        '<script>alert("xss")</script>' // XSS attempt
      ];

      for (const name of invalidNames) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
            name
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should require User-Agent header', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          name: '  <script>alert("xss")</script>John Doe  '
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('John Doe'); // Should be sanitized
    });
  });

  describe('validateLogin', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateLogin);
    });

    test('should accept valid login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'invalid-email',
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require password', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should accept remember me option', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          password: 'password',
          rememberMe: true
        });

      expect(response.status).toBe(200);
      expect(response.body.data.rememberMe).toBe(true);
    });
  });

  describe('validateTokenRefresh', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateTokenRefresh);
    });

    test('should accept valid JWT refresh token', async () => {
      const validData = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      };

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid JWT format', async () => {
      const invalidTokens = [
        'invalid-token',
        'just.two.parts',
        'too.many.parts.here.invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Missing parts
        ''
      ];

      for (const refreshToken of invalidTokens) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({ refreshToken });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should require User-Agent header', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateForgotPassword', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateForgotPassword);
    });

    test('should accept valid email', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          language: 'fr'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should accept valid language codes', async () => {
      const validLanguages = ['fr', 'en', 'es'];

      for (const language of validLanguages) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({
            email: 'test@example.com',
            language
          });

        expect(response.status).toBe(200);
      }
    });

    test('should reject invalid language codes', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          language: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validatePasswordReset', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validatePasswordReset);
    });

    test('should accept valid password reset data', async () => {
      const validData = {
        token: 'a'.repeat(32), // Valid hex token
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!'
      };

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid token formats', async () => {
      const invalidTokens = [
        'short', // Too short
        'G'.repeat(32), // Invalid hex characters
        'a'.repeat(31), // Wrong length
        'invalid-token-format'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/test')
          .set('User-Agent', 'test-agent')
          .send({
            token,
            newPassword: 'NewSecurePass123!',
            confirmPassword: 'NewSecurePass123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject password mismatch', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          token: 'a'.repeat(32),
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'DifferentPass123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          token: 'a'.repeat(32),
          newPassword: 'weak',
          confirmPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateEmailVerification', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateEmailVerification);
    });

    test('should accept valid verification token', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          token: 'a'.repeat(64), // Valid hex token
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid token formats', async () => {
      const invalidTokens = [
        'short',
        'G'.repeat(32), // Invalid hex
        'invalid-format'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/test')
          .send({ token });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('validateChangePassword', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateChangePassword);
    });

    test('should accept valid password change data', async () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject same old and new password', async () => {
      const samePassword = 'SamePassword123!';
      const response = await request(app)
        .post('/test')
        .send({
          currentPassword: samePassword,
          newPassword: samePassword,
          confirmPassword: samePassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject password confirmation mismatch', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'weak',
          confirmPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Attack Prevention', () => {
    test('should prevent SQL injection in registration', async () => {
      const app = createTestApp(validateRegistration);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: "'; DROP TABLE users; --@example.com",
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          name: "'; DELETE FROM accounts; --"
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should prevent XSS in registration', async () => {
      const app = createTestApp(validateRegistration);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          name: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle very long inputs gracefully', async () => {
      const app = createTestApp(validateRegistration);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: 'A'.repeat(1000) + '@example.com',
          password: 'A'.repeat(500),
          confirmPassword: 'A'.repeat(500),
          name: 'A'.repeat(1000)
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should prevent header injection', async () => {
      const app = createTestApp(validateLogin);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test\r\nInjected-Header: malicious')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      expect(response.status).toBe(200); // User-Agent is sanitized
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty request body', async () => {
      const app = createTestApp(validateRegistration);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle null and undefined values', async () => {
      const app = createTestApp(validateLogin);

      const response = await request(app)
        .post('/test')
        .set('User-Agent', 'test-agent')
        .send({
          email: null,
          password: undefined
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle malformed JSON gracefully', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', validateLogin, (req, res) => {
        res.json({ success: true });
      });

      // This will be handled by express.json() middleware error handler
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'test-agent')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});