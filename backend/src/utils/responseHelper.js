/**
 * Standardized API Response Helper
 * Provides consistent response formatting across all controllers
 */

/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {*} data - Data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Standard error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} errorCode - Internal error code
 * @param {*} details - Additional error details
 */
function sendError(res, message = 'Internal server error', statusCode = 500, errorCode = null, details = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error = errorCode;
  }

  if (details !== null) {
    response.details = details;
  }

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
  } else {
    return res.send(data);
  }
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
  asyncHandler,
  createError
};