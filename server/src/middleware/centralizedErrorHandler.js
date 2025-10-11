/**
 * Centralized Error Handler
 *
 * Global error handling middleware that catches all errors and returns
 * consistent JSON responses. Handles validation errors, authentication errors,
 * database errors, and unexpected server errors.
 *
 * Response Format:
 * {
 *   success: false,
 *   error: {
 *     code: 'ERROR_CODE',
 *     message: 'Human-readable error message',
 *     details: [] // Additional error details (optional)
 *   }
 * }
 *
 * Security:
 * - No stack traces in production
 * - No sensitive data leaked
 * - Proper error codes for client handling
 *
 * @module middleware/centralizedErrorHandler
 */

const logger = require('../utils/logger');
const { ValidationError } = require('./validationMiddleware');
const { Prisma } = require('@prisma/client');

/**
 * Application Error Class
 *
 * Base class for application-specific errors with status codes.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguish from programming errors

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Specific Error Classes
 */

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Handle Validation Errors
 *
 * Formats validation errors from our ValidationError class.
 */
function handleValidationError(error) {
  return {
    statusCode: error.statusCode || 400,
    response: {
      success: false,
      error: {
        code: error.code || 'VALIDATION_ERROR',
        message: error.message || 'Validation failed',
        details: error.errors || []
      }
    }
  };
}

/**
 * Handle Prisma Errors
 *
 * Maps Prisma database errors to user-friendly messages.
 */
function handlePrismaError(error) {
  logger.error('Prisma error', {
    code: error.code,
    message: error.message,
    meta: error.meta
  });

  // Unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return {
        statusCode: 409,
        response: {
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
            details: {
              field,
              constraint: error.meta?.target
            }
          }
        }
      };
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return {
        statusCode: 400,
        response: {
          success: false,
          error: {
            code: 'INVALID_REFERENCE',
            message: 'Invalid reference to related resource',
            details: {
              field: error.meta?.field_name
            }
          }
        }
      };
    }

    // Record not found
    if (error.code === 'P2025') {
      return {
        statusCode: 404,
        response: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        }
      };
    }

    // Record required but not found
    if (error.code === 'P2018') {
      return {
        statusCode: 404,
        response: {
          success: false,
          error: {
            code: 'REQUIRED_RECORD_NOT_FOUND',
            message: 'Required record not found'
          }
        }
      };
    }
  }

  // Validation error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      response: {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Invalid data provided'
        }
      }
    };
  }

  // Generic database error (don't expose details)
  return {
    statusCode: 500,
    response: {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed'
      }
    }
  };
}

/**
 * Handle JWT Errors
 *
 * Maps JWT authentication errors to user-friendly messages.
 */
function handleJWTError(error) {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      response: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      }
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      response: {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      }
    };
  }

  return {
    statusCode: 401,
    response: {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      }
    }
  };
}

/**
 * Handle Application Errors
 *
 * Formats custom AppError instances.
 */
function handleAppError(error) {
  return {
    statusCode: error.statusCode || 500,
    response: {
      success: false,
      error: {
        code: error.code || 'APPLICATION_ERROR',
        message: error.message,
        ...(error.details && { details: error.details })
      }
    }
  };
}

/**
 * Handle Unknown Errors
 *
 * Catches unexpected errors and returns safe response.
 * Logs full error for debugging.
 */
function handleUnknownError(error, req) {
  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });

  // SECURITY: Never expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : error.message;

  return {
    statusCode: 500,
    response: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack
        })
      }
    }
  };
}

/**
 * Centralized Error Handler Middleware
 *
 * Express error handling middleware (must have 4 parameters).
 * Catches all errors and returns consistent JSON responses.
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
function centralizedErrorHandler(err, req, res, next) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An error occurred'
    }
  };

  // Handle different error types
  if (err instanceof ValidationError) {
    ({ statusCode, response } = handleValidationError(err));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError ||
             err instanceof Prisma.PrismaClientValidationError) {
    ({ statusCode, response } = handlePrismaError(err));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    ({ statusCode, response } = handleJWTError(err));
  } else if (err instanceof AppError) {
    ({ statusCode, response } = handleAppError(err));
  } else {
    // Unknown/unexpected errors
    ({ statusCode, response } = handleUnknownError(err, req));
  }

  // Log error (INFO for client errors, ERROR for server errors)
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Error handled', {
    code: response.error.code,
    message: response.error.message,
    statusCode,
    path: req.path,
    method: req.method
  });

  // Send JSON response
  res.status(statusCode).json(response);
}

/**
 * 404 Not Found Handler
 *
 * Catches requests to undefined routes.
 * Should be placed AFTER all route definitions.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: [
        '/health',
        '/api/auth',
        '/api/users',
        '/api/transactions',
        '/api/ai'
      ]
    }
  });
}

module.exports = {
  // Main error handler
  centralizedErrorHandler,
  notFoundHandler,

  // Error classes
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  RateLimitError,
  ServiceUnavailableError,

  // Error handlers
  handleValidationError,
  handlePrismaError,
  handleJWTError,
  handleAppError
};
