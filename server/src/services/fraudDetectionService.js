/**
 * Fraud Detection Service
 *
 * Détecte les comportements suspects et calcule un score de fraude
 * Utilisé pour identifier les bots, spam, gaming du système de popularité
 */

const { PrismaClient } = require('@prisma/client');
const { getRedisClient } = require('../config/redis');
const { hashRequestIP, generateDeviceFingerprint } = require('./ipDeduplicationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const redis = getRedisClient();

// Seuils de détection
const THRESHOLDS = {
  // Interactions
  MAX_INTERACTIONS_PER_MINUTE: 10,
  MAX_INTERACTIONS_PER_HOUR: 100,
  MAX_SAME_RECIPE_PER_HOUR: 5,

  // Account age
  MIN_ACCOUNT_AGE_DAYS: 1, // Comptes < 1 jour = suspects

  // Patterns
  MIN_REQUEST_INTERVAL_MS: 100, // < 100ms entre requêtes = bot
  MAX_BURST_SIZE: 20, // 20 requêtes en rafale = suspect

  // Scoring
  FRAUD_SCORE_THRESHOLD: 70 // Score >= 70 = frauduleux
};

/**
 * Calcule le score de fraude pour une interaction
 * Score 0-100: 0 = légitime, 100 = très suspect
 *
 * @param {Object} params - Paramètres de détection
 * @param {string} params.userId - ID utilisateur
 * @param {string} params.ipHash - Hash IP
 * @param {string} params.userAgent - User-Agent
 * @param {string} params.recipeId - ID recette (optionnel)
 * @param {string} params.interactionType - Type interaction
 * @returns {Promise<Object>} { score, reasons, isSuspicious }
 */
async function calculateFraudScore({
  userId,
  ipHash,
  userAgent,
  recipeId = null,
  interactionType = 'unknown'
}) {
  const reasons = [];
  let score = 0;

  try {
    // 1. Vérifier l'âge du compte
    const accountAgeScore = await checkAccountAge(userId, reasons);
    score += accountAgeScore;

    // 2. Vérifier le burst pattern (rafales)
    const burstScore = await checkBurstPattern(ipHash, reasons);
    score += burstScore;

    // 3. Vérifier les interactions répétées
    if (recipeId) {
      const repetitionScore = await checkRepeatedInteractions(userId, recipeId, reasons);
      score += repetitionScore;
    }

    // 4. Vérifier le User-Agent
    const userAgentScore = checkUserAgent(userAgent, reasons);
    score += userAgentScore;

    // 5. Vérifier l'historique de l'IP
    const ipHistoryScore = await checkIPHistory(ipHash, reasons);
    score += ipHistoryScore;

    // 6. Vérifier les patterns temporels (heures inhabituelles)
    const temporalScore = checkTemporalPattern(reasons);
    score += temporalScore;

    // Normaliser le score 0-100
    score = Math.min(Math.max(score, 0), 100);

    const isSuspicious = score >= THRESHOLDS.FRAUD_SCORE_THRESHOLD;

    // Logger si suspect
    if (isSuspicious) {
      logger.warn('Suspicious activity detected', {
        userId,
        ipHash,
        recipeId,
        interactionType,
        fraudScore: score,
        reasons
      });
    }

    return {
      score: Math.round(score),
      reasons,
      isSuspicious,
      threshold: THRESHOLDS.FRAUD_SCORE_THRESHOLD
    };
  } catch (error) {
    logger.error('Error calculating fraud score', {
      userId,
      error: error.message
    });

    // En cas d'erreur, retourner score neutre
    return {
      score: 0,
      reasons: ['Error during fraud detection'],
      isSuspicious: false,
      error: error.message
    };
  }
}

/**
 * Vérifie l'âge du compte utilisateur
 * Comptes récents = plus suspects
 */
async function checkAccountAge(userId, reasons) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    if (!user) {
      reasons.push('User not found');
      return 30; // Suspect si utilisateur n'existe pas
    }

    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (accountAgeDays < THRESHOLDS.MIN_ACCOUNT_AGE_DAYS) {
      reasons.push(`New account (${accountAgeDays.toFixed(1)} days old)`);
      return 25; // Pénalité pour compte récent
    }

    return 0;
  } catch (error) {
    logger.error('Error checking account age', { userId, error: error.message });
    return 0;
  }
}

/**
 * Détecte les rafales (burst) de requêtes
 * Utilise Redis pour tracking en temps réel
 */
async function checkBurstPattern(ipHash, reasons) {
  try {
    const key = `fraud:burst:${ipHash}`;
    const now = Date.now();

    // Ajouter timestamp actuel
    await redis.zadd(key, now, `${now}`);

    // Supprimer les entrées > 1 minute
    await redis.zremrangebyscore(key, 0, now - 60000);

    // Expire après 2 minutes
    await redis.expire(key, 120);

    // Compter les requêtes dans la dernière minute
    const count = await redis.zcount(key, now - 60000, now);

    if (count > THRESHOLDS.MAX_BURST_SIZE) {
      reasons.push(`Burst detected (${count} requests in 1min)`);
      return 40; // Pénalité élevée pour burst
    }

    if (count > THRESHOLDS.MAX_INTERACTIONS_PER_MINUTE) {
      reasons.push(`High frequency (${count} requests/min)`);
      return 20;
    }

    return 0;
  } catch (error) {
    logger.error('Error checking burst pattern', { ipHash, error: error.message });
    return 0;
  }
}

/**
 * Vérifie les interactions répétées sur la même recette
 */
async function checkRepeatedInteractions(userId, recipeId, reasons) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const interactionCount = await prisma.recipeInteraction.count({
      where: {
        userId,
        recipeId,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (interactionCount > THRESHOLDS.MAX_SAME_RECIPE_PER_HOUR) {
      reasons.push(`Repeated interactions on same recipe (${interactionCount} times)`);
      return 30;
    }

    return 0;
  } catch (error) {
    logger.error('Error checking repeated interactions', {
      userId,
      recipeId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Analyse le User-Agent pour détecter les bots
 */
function checkUserAgent(userAgent, reasons) {
  if (!userAgent || userAgent === 'unknown') {
    reasons.push('Missing User-Agent');
    return 20;
  }

  // Patterns de bots connus
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i
  ];

  const isBot = botPatterns.some(pattern => pattern.test(userAgent));

  if (isBot) {
    reasons.push('Bot User-Agent detected');
    return 50; // Pénalité élevée pour bots évidents
  }

  return 0;
}

/**
 * Vérifie l'historique de l'IP (comportements passés)
 */
async function checkIPHistory(ipHash, reasons) {
  try {
    // Compter les interactions flaggées comme suspectes pour cette IP
    const suspiciousCount = await prisma.recipeInteraction.count({
      where: {
        ipHash,
        metadata: {
          path: ['suspicious'],
          equals: true
        }
      }
    });

    const totalCount = await prisma.recipeInteraction.count({
      where: { ipHash }
    });

    if (totalCount > 0) {
      const suspiciousRatio = suspiciousCount / totalCount;

      if (suspiciousRatio > 0.5) {
        reasons.push(`IP has high suspicious ratio (${(suspiciousRatio * 100).toFixed(1)}%)`);
        return 35;
      }

      if (suspiciousRatio > 0.2) {
        reasons.push(`IP has moderate suspicious ratio (${(suspiciousRatio * 100).toFixed(1)}%)`);
        return 15;
      }
    }

    return 0;
  } catch (error) {
    logger.error('Error checking IP history', { ipHash, error: error.message });
    return 0;
  }
}

/**
 * Vérifie les patterns temporels (activité à heures inhabituelles)
 */
function checkTemporalPattern(reasons) {
  const hour = new Date().getHours();

  // Activité entre 2h et 5h du matin = suspect
  if (hour >= 2 && hour <= 5) {
    reasons.push('Activity during unusual hours (2-5 AM)');
    return 10;
  }

  return 0;
}

/**
 * Middleware Express pour détecter la fraude automatiquement
 * Ajoute req.fraudScore à la requête
 */
async function detectFraud(req, res, next) {
  try {
    if (!req.user) {
      // Skip si pas d'utilisateur authentifié
      req.fraudScore = { score: 0, isSuspicious: false };
      return next();
    }

    const fraudResult = await calculateFraudScore({
      userId: req.user.id,
      ipHash: req.ipHash || hashRequestIP(req),
      userAgent: req.headers['user-agent'],
      recipeId: req.body?.recipeId || req.params?.recipeId,
      interactionType: req.body?.interactionType || req.method
    });

    req.fraudScore = fraudResult;

    // Si très suspect, bloquer la requête
    if (fraudResult.score >= 90) {
      logger.warn('Request blocked due to high fraud score', {
        userId: req.user.id,
        fraudScore: fraudResult.score,
        path: req.path
      });

      return res.status(403).json({
        error: 'Suspicious activity detected',
        message: 'Votre compte a été temporairement bloqué en raison d\'une activité suspecte.'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in fraud detection middleware', {
      error: error.message,
      path: req.path
    });

    // En cas d'erreur, laisser passer (graceful degradation)
    req.fraudScore = { score: 0, isSuspicious: false, error: error.message };
    next();
  }
}

/**
 * Marquer une interaction comme suspecte dans la DB
 */
async function flagInteractionAsSuspicious(interactionId, fraudScore, reasons) {
  try {
    await prisma.recipeInteraction.update({
      where: { id: interactionId },
      data: {
        metadata: {
          suspicious: true,
          fraudScore,
          reasons
        }
      }
    });

    logger.info('Interaction flagged as suspicious', {
      interactionId,
      fraudScore
    });

    return true;
  } catch (error) {
    logger.error('Error flagging interaction', {
      interactionId,
      error: error.message
    });
    return false;
  }
}

/**
 * Obtenir les statistiques de fraude
 */
async function getFraudStats() {
  try {
    const totalInteractions = await prisma.recipeInteraction.count();

    const suspiciousInteractions = await prisma.recipeInteraction.count({
      where: {
        metadata: {
          path: ['suspicious'],
          equals: true
        }
      }
    });

    const suspiciousRatio = totalInteractions > 0
      ? (suspiciousInteractions / totalInteractions * 100).toFixed(2)
      : 0;

    return {
      totalInteractions,
      suspiciousInteractions,
      legitimateInteractions: totalInteractions - suspiciousInteractions,
      suspiciousRatio: parseFloat(suspiciousRatio),
      threshold: THRESHOLDS.FRAUD_SCORE_THRESHOLD
    };
  } catch (error) {
    logger.error('Error getting fraud stats', { error: error.message });
    return null;
  }
}

/**
 * Récupérer les utilisateurs suspects (pour review manuelle)
 */
async function getSuspiciousUsers(limit = 20) {
  try {
    // Requête SQL pour trouver les users avec le plus d'interactions suspectes
    const suspiciousUsers = await prisma.$queryRaw`
      SELECT
        ri."userId",
        u.email,
        u."createdAt" as "accountCreatedAt",
        COUNT(*) as "suspiciousCount",
        COUNT(*) FILTER (WHERE ri."createdAt" > NOW() - INTERVAL '24 hours') as "last24hCount"
      FROM recipe_interactions ri
      JOIN users u ON u.id = ri."userId"
      WHERE ri.metadata->>'suspicious' = 'true'
      GROUP BY ri."userId", u.email, u."createdAt"
      HAVING COUNT(*) > 5
      ORDER BY "suspiciousCount" DESC
      LIMIT ${limit}
    `;

    return suspiciousUsers;
  } catch (error) {
    logger.error('Error getting suspicious users', { error: error.message });
    return [];
  }
}

module.exports = {
  calculateFraudScore,
  detectFraud,
  flagInteractionAsSuspicious,
  getFraudStats,
  getSuspiciousUsers,
  THRESHOLDS
};
