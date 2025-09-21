const logger = require('../utils/logger');

// Types d'erreurs personnalisées
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Convertir les erreurs Prisma
const handlePrismaError = (error) => {
  // Erreur de contrainte unique
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ValidationError(`${field} already exists`, [{
      field,
      message: `This ${field} is already taken`,
    }]);
  }

  // Enregistrement non trouvé
  if (error.code === 'P2025') {
    return new NotFoundError();
  }

  // Relation manquante
  if (error.code === 'P2003') {
    return new ValidationError('Related record not found');
  }

  // Données invalides
  if (error.code === 'P2006') {
    return new ValidationError('Invalid data provided');
  }

  return new AppError('Database error', 500, 'DATABASE_ERROR');
};

// Middleware de gestion d'erreurs global
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  logger.error('Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Erreurs Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err);
  }

  // Erreurs de validation Prisma
  if (err.name === 'PrismaClientValidationError') {
    error = new ValidationError('Invalid data format');
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Erreurs de validation express-validator
  if (err.type === 'entity.parse.failed') {
    error = new ValidationError('Invalid JSON format');
  }

  // Erreurs Multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File too large', [{
      field: 'file',
      message: `File size must be less than ${process.env.UPLOAD_MAX_SIZE || '10MB'}`,
    }]);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ValidationError('Too many files', [{
      field: 'files',
      message: 'Maximum number of files exceeded',
    }]);
  }

  // Erreur par défaut si pas encore définie
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  }

  // Réponse d'erreur
  const response = {
    error: error.code || 'UNKNOWN_ERROR',
    message: error.message,
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: error
    }),
  };

  res.status(error.statusCode).json(response);
};

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
};