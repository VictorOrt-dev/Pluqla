/**
 * Universal API Response Helper for Pluqla
 * Standardizes all API responses across the application
 * Version: 2.0.0 - Phase 2 Stabilization
 */

const { performance } = require('perf_hooks');

// Track request start times for execution time measurement
const requestTimes = new Map();

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start timing a request
 */
function startTimer(requestId) {
  requestTimes.set(requestId, performance.now());
  return requestId;
}

/**
 * Get execution time for a request
 */
function getExecutionTime(requestId) {
  const startTime = requestTimes.get(requestId);
  if (!startTime) return 0;

  const duration = Math.round(performance.now() - startTime);
  requestTimes.delete(requestId); // Cleanup
  return duration;
}

/**
 * Standard success response with universal format
 * @param {Object} res - Express response object
 * @param {*} data - Data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  const { requestId } = res.locals;
  const executionTime = requestId ? getExecutionTime(requestId) : 0;

  const response = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`,
      requestId,
      apiVersion: '2.0.0'
    },
    errors: []
  };

  if (message && message !== 'Success') {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Standard error response with universal format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Array|Object} errors - Error details array or single error
 * @param {Object} additionalMeta - Additional metadata
 */
function sendError(res, message = 'Internal server error', statusCode = 500, errors = [], additionalMeta = {}) {
  const { requestId } = res.locals;
  const executionTime = requestId ? getExecutionTime(requestId) : 0;

  // Ensure errors is always an array
  const errorArray = Array.isArray(errors) ? errors : (errors ? [errors] : []);

  const response = {
    success: false,
    message,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`,
      requestId,
      apiVersion: '2.0.0',
      statusCode,
      ...additionalMeta
    },
    errors: errorArray
  };

  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors from express-validator
 * @param {string} message - Custom message
 */
function sendValidationError(res, errors = [], message = 'Validation failed') {
  return sendError(res, message, 400, 'validation_error', {
    errors: Array.isArray(errors) ? errors : []
  });
}

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource that was not found
 * @param {string} message - Custom message
 */
function sendNotFound(res, resource = 'Resource', message = null) {
  const defaultMessage = `${resource} not found`;
  return sendError(res, message || defaultMessage, 404, 'not_found');
}

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, message, 401, 'unauthorized');
}

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, message, 403, 'forbidden');
}

/**
 * Rate limit exceeded response
 * @param {Object} res - Express response object
 * @param {Object} limitInfo - Rate limit information
 * @param {string} message - Custom message
 */
function sendRateLimit(res, limitInfo = {}, message = 'Rate limit exceeded') {
  return sendError(res, message, 429, 'rate_limit_exceeded', limitInfo);
}

/**
 * Service unavailable response (for AI service failures)
 * @param {Object} res - Express response object
 * @param {*} fallbackData - Fallback data to send
 * @param {string} message - Custom message
 */
function sendServiceUnavailable(res, fallbackData = null, message = 'Service temporarily unavailable') {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    error: 'service_unavailable'
  };

  if (fallbackData !== null) {
    response.data = fallbackData;
    response.fallback = true;
  }

  return res.status(503).json(response);
}

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
function sendPaginated(res, items = [], pagination = {}, message = 'Data retrieved successfully') {
  const {
    page = 1,
    limit = 20,
    total = 0,
    totalPages = 0,
    hasNext = false,
    hasPrev = false
  } = pagination;

  return sendSuccess(res, {
    items: Array.isArray(items) ? items : [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages: parseInt(totalPages),
      hasNext: Boolean(hasNext),
      hasPrev: Boolean(hasPrev)
    }
  }, message);
}

/**
 * AI suggestions response with safety checks
 * @param {Object} res - Express response object
 * @param {Array} suggestions - AI suggestions
 * @param {Object} meta - Additional metadata
 * @param {string} message - Success message
 */
function sendAISuggestions(res, suggestions = [], meta = {}, message = 'Suggestions retrieved successfully') {
  // Ensure suggestions is always an array
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  const data = {
    suggestions: safeSuggestions,
    count: safeSuggestions.length,
    ...meta
  };

  return sendSuccess(res, data, message);
}

/**
 * File upload response
 * @param {Object} res - Express response object
 * @param {Object} fileInfo - File information
 * @param {string} message - Success message
 */
function sendFileUpload(res, fileInfo = {}, message = 'File uploaded successfully') {
  return sendSuccess(res, fileInfo, message, 201);
}

/**
 * Bulk operation response
 * @param {Object} res - Express response object
 * @param {Object} results - Bulk operation results
 * @param {string} message - Success message
 */
function sendBulkOperation(res, results = {}, message = 'Bulk operation completed') {
  const {
    total = 0,
    success = 0,
    failed = 0,
    errors = []
  } = results;

  return sendSuccess(res, {
    total: parseInt(total),
    success: parseInt(success),
    failed: parseInt(failed),
    errors: Array.isArray(errors) ? errors : []
  }, message);
}

/**
 * Analytics/Dashboard response
 * @param {Object} res - Express response object
 * @param {Object} analytics - Analytics data
 * @param {string} period - Period for the analytics
 * @param {string} message - Success message
 */
function sendAnalytics(res, analytics = {}, period = null, message = 'Analytics retrieved successfully') {
  const data = {
    ...analytics,
    generatedAt: new Date().toISOString()
  };

  if (period) {
    data.period = period;
  }

  return sendSuccess(res, data, message);
}

/**
 * Export response (for file downloads)
 * @param {Object} res - Express response object
 * @param {string} filename - Filename for download
 * @param {string} contentType - Content type
 * @param {*} data - Data to export
 */
function sendExport(res, filename, contentType, data) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  if (contentType === 'application/json') {
    return res.json(data);
  }
  return res.send(data);
}

/**
 * Middleware to add request ID and start timer
 */
function requestTracker(req, res, next) {
  const requestId = generateRequestId();
  res.locals.requestId = requestId;
  startTimer(requestId);

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Wrap async controller functions to catch errors
 * @param {Function} fn - Async controller function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware - Enhanced for JSON safety
 */
function globalErrorHandler(error, req, res, next) {
  // SECURITY FIX: Use logger instead of console.error
  const logger = require('./logger');

  logger.error('Global Error Handler:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    requestId: res.locals.requestId,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // FIXED: Ensure response hasn't been sent already
  if (res.headersSent) {
    logger.warn('Headers already sent, cannot send error response');
    return next(error);
  }

  // FIXED: Ensure JSON content type is set
  if (!res.get('Content-Type')) {
    res.setHeader('Content-Type', 'application/json');
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return sendValidationError(res, error.errors, error.message);
  }

  if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
    return sendUnauthorized(res, 'Token invalide ou expiré');
  }

  if (error.name === 'ForbiddenError') {
    return sendForbidden(res, error.message);
  }

  if (error.name === 'NotFoundError') {
    return sendNotFound(res, error.message);
  }

  // Handle Prisma/Database errors
  if (error.name === 'PrismaClientKnownRequestError' || error.name === 'PrismaClientInitializationError') {
    logger.error('Database error:', error);
    return sendError(res, 'Erreur de base de données', 500, 'database_error');
  }

  // Default to internal server error
  return sendError(res, 'Une erreur inattendue s\'est produite', 500, [{
    type: 'server_error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  }]);
}

/**
 * Create standardized error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Internal error code
 * @param {*} details - Additional details
 */
function createError(message, statusCode = 500, errorCode = null, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  error.details = details;
  return error;
}

module.exports = {
  // Core response functions
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendRateLimit,
  sendServiceUnavailable,
  sendPaginated,
  sendAISuggestions,
  sendFileUpload,
  sendBulkOperation,
  sendAnalytics,
  sendExport,

  // Middleware
  requestTracker,
  asyncHandler,
  globalErrorHandler,

  // Utilities
  createError,
  generateRequestId,
  startTimer,
  getExecutionTime
};
