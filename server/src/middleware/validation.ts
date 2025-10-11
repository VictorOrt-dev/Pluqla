import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { redactPII } from './logger.js';

export type ValidationError = {
  field: string;
  message: string;
};

// Generic middleware factory for Zod schema validation
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      (req as any).validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Log redacted invalid payload for debugging
        const logger = (global as any).logger;
        if (logger && redactPII) {
          logger.warn('Validation failed', { body: redactPII(req.body), details });
        }

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details,
          },
        });
        return;
      }
      next(error);
    }
  };
}

// Extend Express Request type for validated body
declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
    }
  }
}
