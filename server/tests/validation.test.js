/**
 * Validation and Error Handling Tests
 *
 * Tests verify:
 * ✅ Invalid inputs are rejected with proper error format
 * ✅ Valid inputs are accepted
 * ✅ Server doesn't crash on bad input
 * ✅ Error messages are clear and actionable
 * ✅ Centralized error handler returns consistent format
 */

const request = require('supertest');
const express = require('express');
const {
  registerSchema,
  loginSchema,
  createTransactionSchema,
  aiSuggestionSchema
} = require('../src/validation/schemas');
const {
  validate,
  asyncHandler,
  ValidationError
} = require('../src/middleware/validationMiddleware');
const {
  centralizedErrorHandler,
  notFoundHandler,
  AppError,
  NotFoundError,
  UnauthorizedError
} = require('../src/middleware/centralizedErrorHandler');

// Create test app
function createTestApp() {
  const app = express();

  app.use(express.json());

  // Test routes with validation

  // Auth routes
  app.post('/api/auth/register', validate(registerSchema), asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Registration successful',
      data: req.body
    });
  }));

  app.post('/api/auth/login', validate(loginSchema), asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Login successful',
      data: req.body
    });
  }));

  // Transaction routes
  app.post('/api/transactions', validate(createTransactionSchema), asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Transaction created',
      data: req.body
    });
  }));

  // AI routes
  app.post('/api/ai/suggestions', validate(aiSuggestionSchema), asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Suggestions generated',
      data: req.body
    });
  }));

  // Test route that throws errors
  app.get('/api/test/error', asyncHandler(async (req, res) => {
    throw new AppError('Test error', 500, 'TEST_ERROR');
  }));

  app.get('/api/test/not-found', asyncHandler(async (req, res) => {
    throw new NotFoundError('Resource not found');
  }));

  app.get('/api/test/unauthorized', asyncHandler(async (req, res) => {
    throw new UnauthorizedError('Authentication required');
  }));

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(centralizedErrorHandler);

  return app;
}

describe('Input Validation', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Authentication Validation', () => {
    describe('Registration', () => {
      it('should reject registration with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'ValidPass123!',
            name: 'John Doe'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toBe('Validation failed');
        expect(response.body.error.details).toBeInstanceOf(Array);
        expect(response.body.error.details[0].field).toBe('email');
        expect(response.body.error.details[0].message).toContain('required');
      });

      it('should reject registration with invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'not-an-email',
            password: 'ValidPass123!',
            name: 'John Doe'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.details[0].field).toBe('email');
        expect(response.body.error.details[0].message).toContain('Invalid email');
      });

      it('should reject registration with weak password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'weak',
            name: 'John Doe'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.details).toBeInstanceOf(Array);
        const passwordErrors = response.body.error.details.filter(e => e.field === 'password');
        expect(passwordErrors.length).toBeGreaterThan(0);
      });

      it('should reject registration with short name', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'A'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        const nameError = response.body.error.details.find(e => e.field === 'name');
        expect(nameError.message).toContain('at least 2 characters');
      });

      it('should accept valid registration data', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'John Doe'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Registration successful');
        expect(response.body.data.email).toBe('test@example.com');
        expect(response.body.data.name).toBe('John Doe');
      });

      it('should reject unknown fields (strict mode)', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'John Doe',
            unknownField: 'should be rejected'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Login', () => {
      it('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        const passwordError = response.body.error.details.find(e => e.field === 'password');
        expect(passwordError.message).toContain('required');
      });

      it('should accept valid login data', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'anypassword'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login successful');
      });
    });
  });

  describe('Transaction Validation', () => {
    it('should reject transaction with missing amount', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          category: 'food',
          currency: 'EUR'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const amountError = response.body.error.details.find(e => e.field === 'amount');
      expect(amountError.message).toContain('required');
    });

    it('should reject transaction with negative amount', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: -50,
          category: 'food',
          currency: 'EUR'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const amountError = response.body.error.details.find(e => e.field === 'amount');
      expect(amountError.message).toContain('positive');
    });

    it('should reject transaction with invalid type', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'invalid_type',
          amount: 50,
          category: 'food',
          currency: 'EUR'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const typeError = response.body.error.details.find(e => e.field === 'type');
      expect(typeError).toBeDefined();
    });

    it('should reject transaction with invalid currency', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          currency: 'XYZ'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const currencyError = response.body.error.details.find(e => e.field === 'currency');
      expect(currencyError.message).toContain('EUR, USD, GBP, CHF, or CAD');
    });

    it('should accept valid transaction data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: 50.99,
          category: 'food',
          currency: 'EUR',
          description: 'Grocery shopping'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction created');
      expect(response.body.data.amount).toBe(50.99);
    });

    it('should apply default currency if not provided', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: 50,
          category: 'food'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currency).toBe('EUR');
    });
  });

  describe('AI Feature Validation', () => {
    it('should reject AI suggestion with missing category', async () => {
      const response = await request(app)
        .post('/api/ai/suggestions')
        .send({
          context: 'Some context'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const categoryError = response.body.error.details.find(e => e.field === 'category');
      expect(categoryError.message).toContain('required');
    });

    it('should reject AI suggestion with too long context', async () => {
      const response = await request(app)
        .post('/api/ai/suggestions')
        .send({
          category: 'food',
          context: 'a'.repeat(1001)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      const contextError = response.body.error.details.find(e => e.field === 'context');
      expect(contextError.message).toContain('1000 characters');
    });

    it('should accept valid AI suggestion request', async () => {
      const response = await request(app)
        .post('/api/ai/suggestions')
        .send({
          category: 'food',
          context: 'Looking for budget-friendly meal ideas',
          preferences: {
            tone: 'friendly',
            length: 'medium'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Suggestions generated');
    });
  });
});

describe('Centralized Error Handler', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should return consistent format for custom app errors', async () => {
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'TEST_ERROR');
      expect(response.body.error).toHaveProperty('message', 'Test error');
    });

    it('should return consistent format for 404 errors', async () => {
      const response = await request(app)
        .get('/api/test/not-found')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return consistent format for authentication errors', async () => {
      const response = await request(app)
        .get('/api/test/unauthorized')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('/api/nonexistent');
      expect(response.body.error.availableEndpoints).toBeInstanceOf(Array);
    });
  });

  describe('Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      // Errors should not contain sensitive data like database info
      const errorString = JSON.stringify(response.body);
      expect(errorString).not.toContain('database');
      expect(errorString).not.toContain('prisma');
      expect(errorString).not.toContain('SELECT');
    });
  });
});

describe('Server Stability', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should not crash on malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')
      .expect(400);

    // Server should still be running and respond
    const followUp = await request(app)
      .get('/health')
      .expect(404); // 404 because we didn't define /health, but server is running

    expect(followUp.status).toBeDefined();
  });

  it('should handle multiple invalid requests without crashing', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({ invalid: 'data' })
    );

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
