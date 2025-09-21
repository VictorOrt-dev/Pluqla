const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { generateTokens, verifyRefreshToken, generateEmailVerificationToken } = require('../utils/jwt');
const emailService = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

class AuthController {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Email déjà utilisé',
          message: 'Un compte existe déjà avec cet email'
        });
      }

      // Hasher le mot de passe
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Générer le token de vérification d'email
      const emailVerificationToken = generateEmailVerificationToken(uuidv4());

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          emailVerificationToken,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerificationToken: true,
          createdAt: true
        }
      });

      // Générer les tokens JWT
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Sauvegarder le refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
        }
      });

      // Envoyer l'email de vérification si le service email est configuré
      try {
        await emailService.sendVerificationEmail(user.email, user.emailVerificationToken);
      } catch (emailError) {
        logger.warn('Impossible d\'envoyer l\'email de vérification:', emailError.message);
        // Ne pas faire échouer l'inscription si l'email échoue
      }

      logger.info(`Nouvel utilisateur créé: ${user.email}`);

      res.status(201).json({
        message: 'Compte créé avec succès',
        user,
        tokens: {
          accessToken,
          refreshToken
        },
        needsEmailVerification: true
      });

    } catch (error) {
      logger.error('Erreur lors de l\'inscription:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible de créer le compte'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Trouver l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Identifiants invalides',
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Identifiants invalides',
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier si le compte est actif
      if (user.status !== 'active') {
        return res.status(403).json({
          error: 'Compte désactivé',
          message: 'Votre compte a été désactivé. Contactez le support.'
        });
      }

      // Générer les tokens JWT
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Supprimer les anciens refresh tokens
      await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() }
        }
      });

      // Sauvegarder le nouveau refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Mettre à jour la dernière connexion
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Préparer la réponse utilisateur (sans mot de passe)
      const { password: _, ...userResponse } = user;

      logger.info(`Connexion réussie pour: ${user.email}`);

      res.json({
        message: 'Connexion réussie',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      logger.error('Erreur lors de la connexion:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible de se connecter'
      });
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['refresh-token'];

      if (refreshToken) {
        // Supprimer le refresh token de la base de données
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken }
        });
      }

      res.json({
        message: 'Déconnexion réussie'
      });

    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Erreur lors de la déconnexion'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Token manquant',
          message: 'Refresh token requis'
        });
      }

      // Vérifier le refresh token
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return res.status(401).json({
          error: 'Token invalide',
          message: 'Refresh token expiré ou invalide'
        });
      }

      // Vérifier la signature JWT
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded || decoded.userId !== tokenRecord.userId) {
        return res.status(401).json({
          error: 'Token invalide',
          message: 'Token corrompu'
        });
      }

      // Générer de nouveaux tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenRecord.userId);

      // Remplacer l'ancien refresh token
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      res.json({
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      logger.error('Erreur lors du refresh token:', error);
      res.status(401).json({
        error: 'Token invalide',
        message: 'Impossible de renouveler le token'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Toujours retourner succès pour éviter l'énumération d'emails
      if (!user) {
        return res.json({
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
        });
      }

      // Générer un token de réinitialisation
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetTokenExpiry
        }
      });

      // Envoyer l'email de réinitialisation
      await emailService.sendPasswordResetEmail(email, resetToken);

      logger.info(`Demande de réinitialisation de mot de passe pour: ${email}`);

      res.json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });

    } catch (error) {
      logger.error('Erreur lors de la demande de réinitialisation:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible d\'envoyer l\'email de réinitialisation'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token invalide',
          message: 'Token de réinitialisation invalide ou expiré'
        });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Mettre à jour le mot de passe et supprimer le token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        }
      });

      // Supprimer tous les refresh tokens existants
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });

      logger.info(`Mot de passe réinitialisé pour: ${user.email}`);

      res.json({
        message: 'Mot de passe réinitialisé avec succès'
      });

    } catch (error) {
      logger.error('Erreur lors de la réinitialisation:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible de réinitialiser le mot de passe'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const user = await prisma.user.findFirst({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token invalide',
          message: 'Token de vérification invalide'
        });
      }

      if (user.emailVerified) {
        return res.json({
          message: 'Email déjà vérifié'
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          updatedAt: new Date()
        }
      });

      logger.info(`Email vérifié pour: ${user.email}`);

      res.json({
        message: 'Email vérifié avec succès'
      });

    } catch (error) {
      logger.error('Erreur lors de la vérification email:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible de vérifier l\'email'
      });
    }
  }

  async verifyToken(req, res) {
    try {
      // Le middleware auth a déjà vérifié le token et ajouté req.user
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          emailVerified: true,
          isPremium: true,
          plansUsedThisMonth: true,
          level: true,
          gamificationPoints: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Utilisateur introuvable',
          message: 'Token invalide'
        });
      }

      res.json({
        message: 'Token valide',
        user
      });

    } catch (error) {
      logger.error('Erreur lors de la vérification du token:', error);
      res.status(401).json({
        error: 'Token invalide',
        message: 'Impossible de vérifier le token'
      });
    }
  }

  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.json({
          message: 'Si cet email existe, un nouveau lien de vérification a été envoyé'
        });
      }

      if (user.emailVerified) {
        return res.json({
          message: 'Email déjà vérifié'
        });
      }

      // Générer un nouveau token de vérification
      const verificationToken = uuidv4();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          updatedAt: new Date()
        }
      });

      await emailService.sendVerificationEmail(email, verificationToken);

      res.json({
        message: 'Si cet email existe, un nouveau lien de vérification a été envoyé'
      });

    } catch (error) {
      logger.error('Erreur lors du renvoi de vérification:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Impossible de renvoyer l\'email de vérification'
      });
    }
  }
}

module.exports = new AuthController();