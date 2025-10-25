/**
 * Recipe Validation Middleware
 *
 * Input validation for recipe CRUD endpoints
 */

const Joi = require('joi');
const logger = require('../../utils/logger');

/**
 * Validate recipe creation request
 */
const validateRecipeCreate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Recipe title is required',
        'string.max': 'Recipe title must be less than 200 characters',
        'any.required': 'Recipe title is required'
      }),
    description: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.empty': 'Description is required',
        'string.max': 'Description must be less than 1000 characters',
        'any.required': 'Description is required'
      }),
    cookingTime: Joi.number()
      .integer()
      .min(1)
      .max(600)
      .required()
      .messages({
        'number.min': 'Cooking time must be at least 1 minute',
        'number.max': 'Cooking time must be less than 600 minutes',
        'any.required': 'Cooking time is required'
      }),
    servings: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .required()
      .messages({
        'number.min': 'Servings must be at least 1',
        'number.max': 'Servings must be less than 20',
        'any.required': 'Servings is required'
      }),
    difficulty: Joi.string()
      .valid('facile', 'moyen', 'difficile')
      .required()
      .messages({
        'any.only': 'Difficulty must be facile, moyen, or difficile',
        'any.required': 'Difficulty is required'
      }),
    category: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Category is required',
        'string.max': 'Category must be less than 100 characters',
        'any.required': 'Category is required'
      }),
    estimatedPrice: Joi.number()
      .min(0)
      .max(1000)
      .required()
      .messages({
        'number.min': 'Estimated price must be at least 0',
        'number.max': 'Estimated price must be less than 1000',
        'any.required': 'Estimated price is required'
      }),
    ingredients: Joi.array()
      .items(Joi.string().max(500))
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one ingredient is required',
        'array.max': 'Maximum 50 ingredients allowed',
        'any.required': 'Ingredients are required'
      }),
    instructions: Joi.array()
      .items(Joi.string().max(1000))
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one instruction step is required',
        'array.max': 'Maximum 50 instruction steps allowed',
        'any.required': 'Instructions are required'
      }),
    image: Joi.string()
      .uri()
      .max(500)
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Image must be a valid URL',
        'string.max': 'Image URL must be less than 500 characters'
      }),
    nutritionalInfo: Joi.object()
      .optional()
      .allow(null)
      .messages({
        'object.base': 'Nutritional info must be an object'
      }),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Maximum 20 tags allowed'
      })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    logger.warn('Recipe creation validation failed', {
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
 * Validate recipe update request
 */
const validateRecipeUpdate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .optional()
      .messages({
        'string.empty': 'Recipe title cannot be empty',
        'string.max': 'Recipe title must be less than 200 characters'
      }),
    description: Joi.string()
      .min(1)
      .max(1000)
      .optional()
      .messages({
        'string.empty': 'Description cannot be empty',
        'string.max': 'Description must be less than 1000 characters'
      }),
    cookingTime: Joi.number()
      .integer()
      .min(1)
      .max(600)
      .optional()
      .messages({
        'number.min': 'Cooking time must be at least 1 minute',
        'number.max': 'Cooking time must be less than 600 minutes'
      }),
    servings: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .optional()
      .messages({
        'number.min': 'Servings must be at least 1',
        'number.max': 'Servings must be less than 20'
      }),
    difficulty: Joi.string()
      .valid('facile', 'moyen', 'difficile')
      .optional()
      .messages({
        'any.only': 'Difficulty must be facile, moyen, or difficile'
      }),
    category: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.empty': 'Category cannot be empty',
        'string.max': 'Category must be less than 100 characters'
      }),
    estimatedPrice: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Estimated price must be at least 0',
        'number.max': 'Estimated price must be less than 1000'
      }),
    ingredients: Joi.array()
      .items(Joi.string().max(500))
      .min(1)
      .max(50)
      .optional()
      .messages({
        'array.min': 'At least one ingredient is required',
        'array.max': 'Maximum 50 ingredients allowed'
      }),
    instructions: Joi.array()
      .items(Joi.string().max(1000))
      .min(1)
      .max(50)
      .optional()
      .messages({
        'array.min': 'At least one instruction step is required',
        'array.max': 'Maximum 50 instruction steps allowed'
      }),
    image: Joi.string()
      .uri()
      .max(500)
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Image must be a valid URL',
        'string.max': 'Image URL must be less than 500 characters'
      }),
    nutritionalInfo: Joi.object()
      .optional()
      .allow(null)
      .messages({
        'object.base': 'Nutritional info must be an object'
      }),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Maximum 20 tags allowed'
      }),
    isActive: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'isActive must be a boolean'
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

    logger.warn('Recipe update validation failed', {
      userId: req.user?.userId,
      recipeId: req.params.id,
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
 * Validate recipe ID parameter
 */
const validateRecipeId = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string()
      .min(20)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Recipe ID is required',
        'any.required': 'Recipe ID is required'
      })
  });

  const { error, value } = schema.validate(req.params, { abortEarly: false });

  if (error) {
    logger.warn('Recipe ID validation failed', {
      userId: req.user?.userId,
      params: req.params
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid recipe ID',
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
const validateRecipeQuery = (req, res, next) => {
  const schema = Joi.object({
    category: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Category must be less than 100 characters'
      }),
    difficulty: Joi.string()
      .valid('facile', 'moyen', 'difficile')
      .optional()
      .messages({
        'any.only': 'Difficulty must be facile, moyen, or difficile'
      }),
    maxPrice: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Max price must be at least 0',
        'number.max': 'Max price must be less than 1000'
      }),
    search: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'Search query must be less than 200 characters'
      }),
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
    logger.warn('Recipe query validation failed', {
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
  validateRecipeCreate,
  validateRecipeUpdate,
  validateRecipeId,
  validateRecipeQuery
};
