import request from 'supertest';
import express, { Express } from 'express';
import exampleRouter from '../src/routes/example.js';
import { registerMetricsEndpoint, getRegister } from '../src/middleware/metrics.js';
import errorHandler from '../src/middleware/errorHandler.js';

describe('Metrics Middleware', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(exampleRouter);
    app.get('/metrics', registerMetricsEndpoint);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Clear metrics between tests
    getRegister().clear();
  });

  it('should increment http_requests_total counter', async () => {
    await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    const metrics = await getRegister().metrics();
    expect(metrics).toContain('http_requests_total');
  });

  it('should record histogram buckets for latency', async () => {
    await request(app).post('/transaction').send({
      amount: 50,
      currency: 'USD',
    });

    const metricsJSON = await getRegister().getMetricsAsJSON();
    const histogram = metricsJSON.find((m) => m.name === 'http_request_duration_seconds');

    expect(histogram).toBeDefined();
    expect(histogram?.type).toBe('histogram');
    expect(histogram?.values).toBeDefined();
  });

  it('should increment ai_calls_total and ai_cost_cents_total', async () => {
    await request(app).post('/ai/prompt').send({
      prompt: 'Test prompt',
      model: 'gpt-4',
    });

    const metricsJSON = await getRegister().getMetricsAsJSON();
    const aiCalls = metricsJSON.find((m) => m.name === 'ai_calls_total');
    const aiCost = metricsJSON.find((m) => m.name === 'ai_cost_cents_total');

    expect(aiCalls).toBeDefined();
    expect(aiCost).toBeDefined();
    expect(aiCalls?.values.length).toBeGreaterThan(0);
  });

  it('should expose metrics endpoint', async () => {
    await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
