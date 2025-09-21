const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token d\'accès manquant',
        message: 'Authentification requise'
      });
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        isPremium: true,
        plansUsedThisMonth: true,
        level: true,
        gamificationPoints: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur introuvable',
        message: 'Token invalide'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Compte désactivé',
        message: 'Votre compte a été désactivé'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Token JWT malformé'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré',
        message: 'Veuillez vous reconnecter'
      });
    }

    logger.error('Erreur d\'authentification:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de l\'authentification'
    });
  }
};

// Middleware pour vérifier que l'email est vérifié
const requireEmailVerification = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email non vérifié',
      message: 'Veuillez vérifier votre email avant de continuer'
    });
  }
  next();
};

// Middleware pour vérifier les permissions admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Privilèges administrateur requis'
      });
    }

    next();
  } catch (error) {
    logger.error('Erreur de vérification admin:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
};

// Middleware pour vérifier l'abonnement premium
const requirePremium = (req, res, next) => {
  const subscription = req.user.subscription;

  if (!subscription || subscription.status !== 'active' || subscription.plan === 'free') {
    return res.status(403).json({
      error: 'Abonnement premium requis',
      message: 'Cette fonctionnalité est réservée aux abonnés premium'
    });
  }

  if (subscription.expiresAt && new Date() > subscription.expiresAt) {
    return res.status(403).json({
      error: 'Abonnement expiré',
      message: 'Veuillez renouveler votre abonnement premium'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireEmailVerification,
  requireAdmin,
  requirePremium
};