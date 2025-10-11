/**
 * Transport Trip Validation Middleware
 *
 * Input validation for transport trip CRUD endpoints
 */

const Joi = require('joi');
const logger = require('../../utils/logger');

/**
 * Validate trip creation request
 */
const validateTripCreate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Trip name is required',
        'string.max': 'Trip name must be less than 100 characters',
        'any.required': 'Trip name is required'
      }),
    origin: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Origin is required',
        'string.max': 'Origin must be less than 200 characters',
        'any.required': 'Origin is required'
      }),
    destination: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Destination is required',
        'string.max': 'Destination must be less than 200 characters',
        'any.required': 'Destination is required'
      }),
    distanceKm: Joi.number()
      .min(0.1)
      .max(1000)
      .optional()
      .allow(null)
      .messages({
        'number.min': 'Distance must be at least 0.1 km',
        'number.max': 'Distance must be less than 1000 km'
      }),
    recurring: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Recurring must be a boolean'
      })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    logger.warn('Trip creation validation failed', {
      userId: req.user?.userId,
      errors
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }

  req.body = value;
  next();
};

/**
 * Validate trip update request
 */
const validateTripUpdate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.empty': 'Trip name cannot be empty',
        'string.max': 'Trip name must be less than 100 characters'
      }),
    origin: Joi.string()
      .min(1)
      .max(200)
      .optional()
      .messages({
        'string.empty': 'Origin cannot be empty',
        'string.max': 'Origin must be less than 200 characters'
      }),
    destination: Joi.string()
      .min(1)
      .max(200)
      .optional()
      .messages({
        'string.empty': 'Destination cannot be empty',
        'string.max': 'Destination must be less than 200 characters'
      }),
    distanceKm: Joi.number()
      .min(0.1)
      .max(1000)
      .optional()
      .allow(null)
      .messages({
        'number.min': 'Distance must be at least 0.1 km',
        'number.max': 'Distance must be less than 1000 km'
      }),
    recurring: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Recurring must be a boolean'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    logger.warn('Trip update validation failed', {
      userId: req.user?.userId,
      tripId: req.params.id,
      errors
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }

  req.body = value;
  next();
};

/**
 * Validate trip ID parameter
 */
const validateTripId = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string()
      .min(20)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Trip ID is required',
        'any.required': 'Trip ID is required'
      })
  });

  const { error, value } = schema.validate(req.params, { abortEarly: false });

  if (error) {
    logger.warn('Trip ID validation failed', {
      userId: req.user?.userId,
      params: req.params
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid trip ID',
        code: 'VALIDATION_ERROR'
      }
    });
  }

  req.params = value;
  next();
};

/**
 * Validate query parameters for list endpoint
 */
const validateTripListQuery = (req, res, next) => {
  const schema = Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit must be at most 100'
      }),
    offset: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Offset must be a positive integer'
      })
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    logger.warn('Trip list query validation failed', {
      userId: req.user?.userId,
      query: req.query
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid query parameters',
        code: 'VALIDATION_ERROR'
      }
    });
  }

  req.query = value;
  next();
};

module.exports = {
  validateTripCreate,
  validateTripUpdate,
  validateTripId,
  validateTripListQuery
};
