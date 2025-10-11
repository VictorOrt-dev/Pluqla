import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convert any error to public-safe format
function toPublicError(err: any) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  if (err instanceof AppError) {
    return {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return {
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    };
  }

  // Default internal error
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  };
}

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = (global as any).logger;
  if (logger) {
    logger.error('Error caught', { error: err.message, stack: err.stack, url: req.url });
  }

  const { status, code, message, details } = toPublicError(err);

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}
