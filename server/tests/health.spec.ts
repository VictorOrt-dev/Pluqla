import request from 'supertest';
import express, { Express } from 'express';
import healthRouter, * as healthModule from '../src/health/healthcheck.js';

describe('Health Check Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(healthRouter);
  });

  it('should return 200 for /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 200 for /ready when all checks pass', async () => {
    // Mock all checks to return 'ok'
    jest.spyOn(healthModule, 'checkDb').mockResolvedValue('ok');
    jest.spyOn(healthModule, 'checkCache').mockResolvedValue('ok');
    jest.spyOn(healthModule, 'checkAi').mockResolvedValue('ok');

    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.db).toBe('ok');
    expect(res.body.checks.cache).toBe('ok');
    expect(res.body.checks.ai).toBe('ok');
  });

  it('should return 503 for /ready when a check fails', async () => {
    // Mock one check to fail
    jest.spyOn(healthModule, 'checkDb').mockResolvedValue('fail');
    jest.spyOn(healthModule, 'checkCache').mockResolvedValue('ok');
    jest.spyOn(healthModule, 'checkAi').mockResolvedValue('ok');

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.db).toBe('fail');
  });

  it('should return 503 for /ready when all checks fail', async () => {
    jest.spyOn(healthModule, 'checkDb').mockResolvedValue('fail');
    jest.spyOn(healthModule, 'checkCache').mockResolvedValue('fail');
    jest.spyOn(healthModule, 'checkAi').mockResolvedValue('fail');

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
  });

  it('should handle unknown check status', async () => {
    jest.spyOn(healthModule, 'checkDb').mockResolvedValue('unknown');
    jest.spyOn(healthModule, 'checkCache').mockResolvedValue('unknown');
    jest.spyOn(healthModule, 'checkAi').mockResolvedValue('unknown');

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.db).toBe('unknown');
  });
});
