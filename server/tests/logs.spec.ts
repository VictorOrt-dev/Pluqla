import request from 'supertest';
import express, { Express } from 'express';
import { PassThrough } from 'stream';
import pino from 'pino';
import exampleRouter from '../src/routes/example.js';
import { redactPII, requestLogger } from '../src/middleware/logger.js';
import errorHandler from '../src/middleware/errorHandler.js';

describe('Logger PII Redaction', () => {
  let app: Express;
  let stream: PassThrough;
  let logs: string[];

  beforeAll(() => {
    // Capture logs to in-memory stream
    stream = new PassThrough();
    logs = [];
    stream.on('data', (chunk) => {
      logs.push(chunk.toString());
    });

    // Override global logger
    const testLogger = pino(stream);
    (global as any).logger = testLogger;

    app = express();
    app.use(express.json());
    app.use(requestLogger);
    app.use(exampleRouter);
    app.use(errorHandler);
  });

  beforeEach(() => {
    logs = [];
  });

  it('should redact password fields', () => {
    const redacted = redactPII({ email: 'user@example.com', password: 'secret123' });
    expect(redacted.password).toBe('***REDACTED***');
  });

  it('should mask email local part', () => {
    const redacted = redactPII({ email: 'john.doe@example.com' });
    expect(redacted.email).toMatch(/^j\*\*\*@example\.com$/);
  });

  it('should redact tokens', () => {
    const redacted = redactPII({ authorization: 'Bearer xyz123' });
    expect(redacted.authorization).toBe('***REDACTED***');
  });

  it('should not log raw email or password in requests', async (done) => {
    await request(app).post('/auth/login').send({
      email: 'sensitive@example.com',
      password: 'mySecretPassword',
    });

    setTimeout(() => {
      const allLogs = logs.join('');
      expect(allLogs).not.toContain('sensitive@example.com');
      expect(allLogs).not.toContain('mySecretPassword');
      done();
    }, 100);
  });

  it('should recursively redact nested objects', () => {
    const data = {
      user: {
        email: 'nested@example.com',
        credentials: {
          password: 'nested-secret',
          token: 'abc123',
        },
      },
    };

    const redacted = redactPII(data);
    expect(redacted.user.credentials.password).toBe('***REDACTED***');
    expect(redacted.user.credentials.token).toBe('***REDACTED***');
  });
});
