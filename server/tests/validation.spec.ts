import request from 'supertest';
import express, { Express } from 'express';
import exampleRouter from '../src/routes/example.js';
import errorHandler from '../src/middleware/errorHandler.js';

describe('Validation Middleware', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(exampleRouter);
    app.use(errorHandler);
  });

  it('should return 400 with validation details for invalid login', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'invalid-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect(res.body.error.details[0]).toHaveProperty('field');
    expect(res.body.error.details[0]).toHaveProperty('message');
  });

  it('should return 400 for invalid transaction', async () => {
    const res = await request(app).post('/transaction').send({
      amount: -100,
      currency: 'TOOLONG',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });

  it('should accept valid login', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should accept valid transaction', async () => {
    const res = await request(app).post('/transaction').send({
      amount: 100.5,
      currency: 'USD',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction).toBeDefined();
  });
});
