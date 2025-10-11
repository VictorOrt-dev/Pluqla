import pino from 'pino';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

// Pino logger configuration
export const logger = pino({
  level: logLevel,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

// Store logger globally for access in other modules
(global as any).logger = logger;

// Recursive PII redaction
export function redactPII(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactPII);

  const redacted = { ...obj };
  const sensitiveKeys = ['password', 'token', 'authorization', 'credit_card', 'card_number', 'secret'];

  for (const key in redacted) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'string' && redacted[key].includes('@')) {
      const emailMatch = redacted[key].match(/^([^@]+)@(.+)$/);
      if (emailMatch) {
        const localPart = emailMatch[1];
        const domain = emailMatch[2];
        redacted[key] = localPart.substring(0, 1) + '***@' + domain;
      }
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key]);
    }
  }

  return redacted;
}

// Hash userId for non-PII logging
export function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 12);
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const userId = (req as any).user?.id;

    logger.info({
      msg: 'HTTP request',
      method: req.method,
      route,
      status: res.statusCode,
      duration_ms: duration,
      ...(userId && { userHash: hashUserId(userId) }),
    });
  });

  next();
}
