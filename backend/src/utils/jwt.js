const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration des secrets et durées
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT secrets not configured. Using default values (unsafe for production)');
}

/**
 * Génère un token d'accès JWT
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} payload - Données supplémentaires à inclure
 * @returns {string} Token JWT
 */
const generateAccessToken = (userId, payload = {}) => {
  const tokenPayload = {
    userId,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    ...payload
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'plus-clair-app',
    audience: 'plus-clair-users'
  });
};

/**
 * Génère un refresh token JWT
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Refresh token JWT
 */
const generateRefreshToken = (userId) => {
  const tokenPayload = {
    userId,
    type: 'refresh',
    jti: crypto.randomUUID(), // JWT ID unique
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'plus-clair-app',
    audience: 'plus-clair-users'
  });
};

/**
 * Génère une paire de tokens (access + refresh)
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} payload - Données supplémentaires pour le token d'accès
 * @returns {Object} Objet contenant accessToken et refreshToken
 */
const generateTokens = (userId, payload = {}) => {
  const accessToken = generateAccessToken(userId, payload);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN,
    tokenType: 'Bearer'
  };
};

/**
 * Vérifie un token d'accès
 * @param {string} token - Token à vérifier
 * @returns {Object} Payload décodé du token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'plus-clair-app',
      audience: 'plus-clair-users'
    });
  } catch (error) {
    throw new Error(`Token invalide: ${error.message}`);
  }
};

/**
 * Vérifie un refresh token
 * @param {string} token - Refresh token à vérifier
 * @returns {Object} Payload décodé du token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'plus-clair-app',
      audience: 'plus-clair-users'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Type de token invalide');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Refresh token invalide: ${error.message}`);
  }
};

/**
 * Décode un token sans le vérifier (utile pour les tokens expirés)
 * @param {string} token - Token à décoder
 * @returns {Object} Payload décodé
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error(`Impossible de décoder le token: ${error.message}`);
  }
};

/**
 * Vérifie si un token est expiré
 * @param {string} token - Token à vérifier
 * @returns {boolean} True si le token est expiré
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Génère un token pour la réinitialisation de mot de passe
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Token de réinitialisation
 */
const generatePasswordResetToken = (userId) => {
  const tokenPayload = {
    userId,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '1h', // 1 heure pour la réinitialisation
    issuer: 'plus-clair-app',
    audience: 'plus-clair-users'
  });
};

/**
 * Vérifie un token de réinitialisation de mot de passe
 * @param {string} token - Token à vérifier
 * @returns {Object} Payload décodé
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'plus-clair-app',
      audience: 'plus-clair-users'
    });

    if (decoded.type !== 'password_reset') {
      throw new Error('Type de token invalide');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Token de réinitialisation invalide: ${error.message}`);
  }
};

/**
 * Génère un token pour la vérification d'email
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Token de vérification
 */
const generateEmailVerificationToken = (userId) => {
  const tokenPayload = {
    userId,
    type: 'email_verification',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '24h', // 24 heures pour la vérification d'email
    issuer: 'plus-clair-app',
    audience: 'plus-clair-users'
  });
};

/**
 * Vérifie un token de vérification d'email
 * @param {string} token - Token à vérifier
 * @returns {Object} Payload décodé
 */
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'plus-clair-app',
      audience: 'plus-clair-users'
    });

    if (decoded.type !== 'email_verification') {
      throw new Error('Type de token invalide');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Token de vérification invalide: ${error.message}`);
  }
};

/**
 * Extrait le token du header Authorization
 * @param {string} authHeader - Header d'autorisation
 * @returns {string|null} Token extrait ou null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  extractTokenFromHeader
};