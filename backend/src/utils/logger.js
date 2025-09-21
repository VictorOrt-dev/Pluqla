const winston = require('winston');
const path = require('path');

// Configuration des niveaux de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

winston.addColors(colors);

// Format pour la console (développement)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }

    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Format pour les fichiers (production)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports (où envoyer les logs)
const transports = [
  // Console (toujours actif)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  }),
];

// Fichiers de log (uniquement si activé)
if (process.env.LOG_FILE_ENABLED === 'true') {
  // Log général
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'app.log'),
      format: fileFormat,
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Log des erreurs uniquement
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  levels,
  transports,
  exitOnError: false,
});

// Ajouter des méthodes utilitaires
logger.logRequest = (req, res, responseTime) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.user?.id,
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

logger.logAuth = (action, email, success, meta = {}) => {
  logger.info('Authentication Event', {
    action,
    email,
    success,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

logger.logTransaction = (userId, transaction, action = 'created') => {
  logger.info('Transaction Event', {
    userId,
    transactionId: transaction.id,
    action,
    amount: transaction.amount,
    category: transaction.category,
  });
};

logger.logAI = (userId, category, success, meta = {}) => {
  logger.info('AI Request', {
    userId,
    category,
    success,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

module.exports = logger;