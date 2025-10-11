/**
 * Validation Middleware
 *
 * Provides middleware for validating request inputs using Zod schemas.
 * Validates body, query, and params before reaching route handlers.
 *
 * Features:
 * - Type-safe validation with Zod
 * - Clear, actionable error messages
 * - Multiple validation targets (body, query, params)
 * - Automatic error formatting
 * - No business logic execution on invalid input
 *
 * @module middleware/validationMiddleware
 */

const { ZodError } = require('zod');
const logger = require('../utils/logger');

/**
 * Validation Error Class
 *
 * Custom error class for validation failures.
 * Extends Error to maintain stack trace and error handling compatibility.
 */
class ValidationError extends Error {
  constructor(message, errors = [], statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = 'VALIDATION_ERROR';

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Format Zod validation errors into user-friendly format
 *
 * Transforms Zod's error format into a consistent structure:
 * {
 *   field: 'email',
 *   message: 'Invalid email format',
 *   code: 'invalid_string'
 * }
 *
 * @param {ZodError} zodError - Zod validation error object
 * @returns {Array} Array of formatted error objects
 */
function formatZodErrors(zodError) {
  return zodError.errors.map((error) => {
    const field = error.path.join('.');
    const message = error.message;
    const code = error.code;

    return {
      field: field || 'unknown',
      message,
      code,
      ...(error.received && { received: error.received }),
      ...(error.expected && { expected: error.expected })
    };
  });
}

/**
 * Validate Request Middleware Factory
 *
 * Creates a validation middleware for a specific Zod schema.
 * Can validate body, query, or params depending on target.
 *
 * @param {Object} schema - Zod schema for validation
 * @param {string} target - What to validate: 'body', 'query', 'params', or 'all'
 * @returns {Function} Express middleware function
 *
 * @example
 * // Validate request body
 * router.post('/register', validate(registerSchema), authController.register);
 *
 * @example
 * // Validate query parameters
 * router.get('/transactions', validate(getTransactionsQuerySchema, 'query'), controller.list);
 *
 * @example
 * // Validate URL params
 * router.get('/users/:id', validate(z.object({ id: idSchema }), 'params'), controller.get);
 */
function validate(schema, target = 'body') {
  return async (req, res, next) => {
    try {
      // Determine what to validate
      let dataToValidate;

      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
          dataToValidate = {
            body: req.body,
            query: req.query,
            params: req.params
          };
          break;
        default:
          dataToValidate = req.body;
      }

      // Validate using Zod schema
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace request data with validated (and possibly transformed) data
      if (target === 'body') {
        req.body = validatedData;
      } else if (target === 'query') {
        req.query = validatedData;
      } else if (target === 'params') {
        req.params = validatedData;
      } else if (target === 'all') {
        req.body = validatedData.body;
        req.query = validatedData.query;
        req.params = validatedData.params;
      }

      // Validation successful, proceed to next middleware
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);

        logger.warn('Validation failed', {
          target,
          path: req.path,
          method: req.method,
          errors: formattedErrors
        });

        // Create validation error with formatted errors
        const validationError = new ValidationError(
          'Validation failed',
          formattedErrors,
          400
        );

        // Pass to error handler
        return next(validationError);
      }

      // Other errors (shouldn't happen, but handle gracefully)
      logger.error('Unexpected validation error', {
        error: error.message,
        path: req.path
      });

      return next(error);
    }
  };
}

/**
 * Validate Multiple Targets Middleware
 *
 * Validates multiple parts of the request (body, query, params) with different schemas.
 *
 * @param {Object} schemas - Object containing schemas for different targets
 * @param {Object} schemas.body - Schema for request body
 * @param {Object} schemas.query - Schema for query parameters
 * @param {Object} schemas.params - Schema for URL parameters
 * @returns {Function} Express middleware function
 *
 * @example
 * router.put(
 *   '/transactions/:id',
 *   validateMultiple({
 *     params: z.object({ id: idSchema }),
 *     body: updateTransactionSchema
 *   }),
 *   controller.update
 * );
 */
function validateMultiple(schemas) {
  return async (req, res, next) => {
    const errors = [];

    try {
      // Validate body if schema provided
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // If any validation errors, return them all
      if (errors.length > 0) {
        logger.warn('Multi-target validation failed', {
          path: req.path,
          method: req.method,
          errorCount: errors.length
        });

        const validationError = new ValidationError(
          'Validation failed',
          errors,
          400
        );

        return next(validationError);
      }

      // All validations passed
      next();
    } catch (error) {
      logger.error('Unexpected multi-validation error', {
        error: error.message,
        path: req.path
      });

      return next(error);
    }
  };
}

/**
 * Sanitize Input Middleware
 *
 * Removes potentially dangerous HTML/script tags from string inputs.
 * Should be used in addition to validation, not instead of it.
 *
 * @param {Array} fields - Fields to sanitize (default: all string fields)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/comments', sanitize(['comment', 'title']), validate(commentSchema), controller.create);
 */
function sanitize(fields = []) {
  const sanitizeHtml = require('sanitize-html');

  return (req, res, next) => {
    try {
      const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;

        return sanitizeHtml(str, {
          allowedTags: [], // Strip all HTML tags
          allowedAttributes: {},
          disallowedTagsMode: 'discard'
        });
      };

      const sanitizeObject = (obj, fieldsToSanitize) => {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = { ...obj };

        if (fieldsToSanitize.length === 0) {
          // Sanitize all string fields
          Object.keys(sanitized).forEach((key) => {
            if (typeof sanitized[key] === 'string') {
              sanitized[key] = sanitizeString(sanitized[key]);
            } else if (typeof sanitized[key] === 'object') {
              sanitized[key] = sanitizeObject(sanitized[key], []);
            }
          });
        } else {
          // Sanitize only specified fields
          fieldsToSanitize.forEach((field) => {
            if (sanitized[field] && typeof sanitized[field] === 'string') {
              sanitized[field] = sanitizeString(sanitized[field]);
            }
          });
        }

        return sanitized;
      };

      // Sanitize request body
      if (req.body) {
        req.body = sanitizeObject(req.body, fields);
      }

      // Sanitize query params
      if (req.query) {
        req.query = sanitizeObject(req.query, fields);
      }

      next();
    } catch (error) {
      logger.error('Sanitization error', {
        error: error.message,
        path: req.path
      });

      return next(error);
    }
  };
}

/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to catch errors and pass them to error middleware.
 * Eliminates need for try/catch in every route handler.
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 *
 * @example
 * router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
 *   const user = await authService.login(req.body);
 *   res.json({ success: true, user });
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  validate,
  validateMultiple,
  sanitize,
  asyncHandler,
  ValidationError,
  formatZodErrors
};
