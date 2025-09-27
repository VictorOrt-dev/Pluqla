/**
 * 🧪 USER VALIDATION UNIT TESTS
 *
 * Comprehensive test suite for user profile validation middleware in Pluqla backend.
 * Tests user profile management, preferences, and data operations validation.
 */

const request = require('supertest');
const express = require('express');
const {
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateStatsQuery,
  validateAccountDeletion,
  validateDataExport,
  validateQuestionnaireSubmission
} = require('../../../src/middleware/validation/userValidation');

// Mock response helper
jest.mock('../../../src/utils/responseHelper', () => ({
  sendValidationError: jest.fn((res, errors, message) => {
    return res.status(400).json({ success: false, errors, message });
  })
}));

const createTestApp = (validation) => {
  const app = express();
  app.use(express.json());
  app.post('/test', validation, (req, res) => {
    res.json({ success: true, data: req.body });
  });
  app.get('/test', validation, (req, res) => {
    res.json({ success: true, data: req.query });
  });
  return app;
};

describe('User Validation Middleware', () => {

  describe('validateProfileUpdate', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateProfileUpdate);
    });

    test('should accept valid profile updates', async () => {
      const validData = {
        name: 'John Doe',
        email: 'newemail@example.com',
        phone: '+33123456789',
        dateOfBirth: '1990-01-01',
        language: 'fr',
        currency: 'EUR',
        timezone: 'Europe/Paris'
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid names', async () => {
      const invalidNames = [
        'A', // Too short
        'A'.repeat(101), // Too long
        'John123', // Contains numbers
        '<script>alert("xss")</script>' // XSS attempt
      ];

      for (const name of invalidNames) {
        const response = await request(app)
          .post('/test')
          .send({ name });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject invalid age (COPPA compliance)', async () => {
      const tooYoung = new Date();
      tooYoung.setFullYear(tooYoung.getFullYear() - 12); // 12 years old

      const response = await request(app)
        .post('/test')
        .send({ dateOfBirth: tooYoung.toISOString() });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject unrealistic age', async () => {
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 125); // 125 years old

      const response = await request(app)
        .post('/test')
        .send({ dateOfBirth: tooOld.toISOString() });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate phone numbers', async () => {
      const validPhones = ['+33123456789', '+1234567890', '+34123456789'];
      const invalidPhones = ['123', 'invalid', '++33123'];

      for (const phone of validPhones) {
        const response = await request(app)
          .post('/test')
          .send({ phone });

        expect(response.status).toBe(200);
      }

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/test')
          .send({ phone });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('validatePreferencesUpdate', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validatePreferencesUpdate);
    });

    test('should accept valid preferences', async () => {
      const validData = {
        notifications: {
          email: true,
          push: false,
          sms: true
        },
        privacy: {
          shareData: false,
          analytics: true
        },
        dashboard: {
          defaultView: 'overview',
          showTips: true
        },
        ai: {
          enableSuggestions: true,
          personalizedContent: false
        }
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid preference values', async () => {
      const invalidData = {
        notifications: {
          email: 'invalid', // Should be boolean
          push: null
        },
        dashboard: {
          defaultView: 'invalid_view' // Not in allowed values
        }
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateAccountDeletion', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateAccountDeletion);
    });

    test('should require proper confirmation', async () => {
      const validData = {
        password: 'UserCurrentPassword123!',
        confirmDeletion: 'DELETE_MY_ACCOUNT',
        reason: 'No longer needed'
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject without proper confirmation text', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          password: 'UserCurrentPassword123!',
          confirmDeletion: 'DELETE ACCOUNT' // Wrong text
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require password', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          confirmDeletion: 'DELETE_MY_ACCOUNT'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateQuestionnaireSubmission', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateQuestionnaireSubmission);
    });

    test('should accept valid questionnaire data', async () => {
      const validData = {
        answers: [
          { questionId: 'q1_savings_goal', answer: 'Travel fund' },
          { questionId: 'q2_risk_tolerance', answer: 'Medium' },
          { questionId: 'q3_monthly_income', answer: '3000' }
        ],
        metadata: {
          completedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid answer structure', async () => {
      const invalidData = {
        answers: [
          { questionId: 'q1', answer: 'Valid answer' },
          { questionId: '', answer: 'Invalid - empty ID' }, // Invalid
          { answer: 'Missing question ID' }, // Invalid
          { questionId: 'q4', answer: '' } // Invalid - empty answer
        ]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject too many answers', async () => {
      const tooManyAnswers = Array(60).fill(null).map((_, i) => ({
        questionId: `question_${i}`,
        answer: 'Answer'
      }));

      const response = await request(app)
        .post('/test')
        .send({ answers: tooManyAnswers });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject malicious content in answers', async () => {
      const maliciousData = {
        answers: [
          { questionId: 'q1', answer: '<script>alert("xss")</script>' },
          { questionId: 'q2', answer: "'; DROP TABLE users; --" }
        ]
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateDataExport', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(validateDataExport);
    });

    test('should accept valid export parameters', async () => {
      const response = await request(app)
        .get('/test')
        .query({
          format: 'json',
          dataTypes: 'profile,transactions',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid export format', async () => {
      const response = await request(app)
        .get('/test')
        .query({
          format: 'xml' // Not supported
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject invalid data types', async () => {
      const response = await request(app)
        .get('/test')
        .query({
          dataTypes: 'profile,invalid_type,transactions'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('should prevent XSS in profile updates', async () => {
      const app = createTestApp(validateProfileUpdate);

      const response = await request(app)
        .post('/test')
        .send({
          name: '<img src=x onerror=alert("xss")>',
          email: 'javascript:alert("xss")@evil.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle extremely long inputs', async () => {
      const app = createTestApp(validateQuestionnaireSubmission);

      const response = await request(app)
        .post('/test')
        .send({
          answers: [{
            questionId: 'q1',
            answer: 'A'.repeat(2000) // Too long
          }]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should sanitize input data', async () => {
      const app = createTestApp(validateProfileUpdate);

      const response = await request(app)
        .post('/test')
        .send({
          name: '  <b>John Doe</b>  ' // Should be sanitized
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('John Doe');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays gracefully', async () => {
      const app = createTestApp(validateQuestionnaireSubmission);

      const response = await request(app)
        .post('/test')
        .send({ answers: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle missing optional fields', async () => {
      const app = createTestApp(validateProfileUpdate);

      const response = await request(app)
        .post('/test')
        .send({}); // All fields are optional for profile update

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should validate date boundaries properly', async () => {
      const app = createTestApp(validateDataExport);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .get('/test')
        .query({
          startDate: '2024-01-01',
          endDate: futureDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(200); // Future dates allowed for export
    });
  });
});