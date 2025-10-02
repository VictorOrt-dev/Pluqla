const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const emailService = require('../services/emailService');
const { generateEmailVerificationToken, hashEmailToken } = require('../utils/emailTokenUtils');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { createPasswordResetToken, verifyPasswordResetToken } = require('../utils/tokenUtils');
const refreshTokenService = require('../services/refreshTokenService');
const { recordAuthAttempt, recordUserRegistration } = require('../services/monitoringService');
const { validatePassword } = require('../middleware/passwordPolicy');
const authLockoutService = require('../services/authLockoutService');
const { metrics } = require('../monitoring/metrics');
const { recordFailedLogin, recordAccountLockout } = require('../monitoring/alerting');
const { refreshCsrfToken } = require('../middleware/csrfProtection'); // SECURITY: CSRF token rotation

class AuthController {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Log des données reçues (sans le mot de passe)
      logger.info('[REGISTER] Tentative inscription', {
        email: email ? 'fourni' : 'manquant',
        name: name ? 'fourni' : 'manquant',
        password: password ? 'fourni' : 'manquant',
        passwordLength: password ? password.length : 0,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // SECURITY: Validate password complexity
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return sendError(res, 'Le mot de passe ne respecte pas les exigences de sécurité', 400, 'weak_password', {
          errors: passwordValidation.errors
        });
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return sendError(res, 'Un compte existe déjà avec cet email', 409, 'email_already_used');
      }

      // Hasher le mot de passe
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // SECURITY FIX: Generate secure hashed email verification token
      const { plainToken, hashedToken } = generateEmailVerificationToken();

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          emailVerificationToken: hashedToken, // Store hashed token for security
          createdAt: new Date(),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          // Don't return sensitive fields like emailVerificationToken
          createdAt: true
        }
      });

      // Générer les tokens JWT
      const { accessToken, refreshToken } = generateTokens(user.id);

      // SECURITY FIX: Store refresh token securely with metadata
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      await refreshTokenService.storeRefreshToken(refreshToken, user.id, ipAddress, userAgent);

      // Envoyer l'email de vérification si le service email est configuré
      try {
        await emailService.sendVerificationEmail(user.email, plainToken);
      } catch (emailError) {
        logger.warn('Impossible d\'envoyer l\'email de vérification:', emailError.message);
        // Ne pas faire échouer l'inscription si l'email échoue
      }

      logger.info(`Nouvel utilisateur créé: ${user.email}`);

      // Record user registration metric
      recordUserRegistration('email');
      recordAuthAttempt('email', true);

      // SECURITY: Rotate CSRF token on registration (new session)
      const newCsrfToken = refreshCsrfToken(req, res);
      logger.debug('CSRF token rotated on registration', { userId: user.id });

      return sendSuccess(res, {
        user,
        token: accessToken,
        refreshToken,
        csrfToken: newCsrfToken,
        needsEmailVerification: true
      }, 'Compte créé avec succès', 201);
    } catch (error) {
      // SECURITY FIX: Use secure error logging to prevent JWT/password exposure
      logger.error('Registration error', {
        action: 'registration',
        email: req.body.email ? 'provided' : 'missing',
        errorName: error.name,
        errorMessage: error.message
      });

      // Record registration failure
      recordAuthAttempt('email', false, 'registration_error');

      return sendError(res, 'Impossible de créer le compte', 500, 'registration_error');
    }
  }

  async login(req, res) {
    const loginStartTime = process.hrtime();
    let authResult = 'failure';

    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Log des données reçues (sans le mot de passe)
      logger.info('[LOGIN] Tentative connexion', {
        email: email ? 'fourni' : 'manquant',
        password: password ? 'fourni' : 'manquant',
        passwordLength: password ? password.length : 0,
        ip: ipAddress,
        userAgent: req.get('User-Agent')
      });

      // Trouver l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // SECURITY: Check lockout status (use email hash for unknown users to prevent enumeration)
      const lockoutKey = user ? user.id : `ip:${ipAddress}`;
      const lockStatus = await authLockoutService.isLocked(lockoutKey, ipAddress);

      if (lockStatus.locked) {
        metrics.recordLoginAttempt('failure', 'email');
        metrics.recordFailedLoginByIp(ipAddress, 'account_locked');
        if (user) {
          metrics.recordFailedLoginByUser(user.id, 'account_locked');
          recordAccountLockout(user.id); // Trigger alert if threshold exceeded
        }
        recordAuthAttempt('password', false, 'account_locked');

        // TIMING ATTACK MITIGATION: Normalize response time
        await this._normalizeResponseTime(loginStartTime);

        return sendError(res, 'Trop de tentatives de connexion. Veuillez réessayer plus tard.', 403, 'account_locked', {
          remainingTime: lockStatus.remainingTime,
          lockedUntil: lockStatus.lockedUntil
        });
      }

      if (!user) {
        // SECURITY: Record failed attempt even if user doesn't exist (prevents enumeration)
        await authLockoutService.recordFailedAttempt(lockoutKey, ipAddress);
        metrics.recordLoginAttempt('failure', 'email');
        metrics.recordFailedLoginByIp(ipAddress, 'invalid_credentials');
        recordFailedLogin(ipAddress); // Trigger alert if threshold exceeded
        recordAuthAttempt('password', false, 'user_not_found');

        // TIMING ATTACK MITIGATION: Perform dummy bcrypt to normalize timing
        await bcrypt.compare(password || 'dummy', '$2a$12$dummy.hash.to.prevent.timing.attack.detection.here');
        await this._normalizeResponseTime(loginStartTime);

        return sendError(res, 'Email ou mot de passe incorrect', 401, 'invalid_credentials');
      }

      // Vérifier le mot de passe
      const passwordCheckStart = process.hrtime();
      const isPasswordValid = await bcrypt.compare(password, user.password);
      const [pwSeconds, pwNanoseconds] = process.hrtime(passwordCheckStart);
      const pwDuration = pwSeconds + pwNanoseconds / 1e9;
      metrics.recordAuthTiming('password_check', isPasswordValid ? 'valid' : 'invalid', pwDuration);

      if (!isPasswordValid) {
        // SECURITY: Record failed login attempt
        await authLockoutService.recordFailedAttempt(user.id, ipAddress);
        metrics.recordLoginAttempt('failure', 'email');
        metrics.recordFailedLoginByIp(ipAddress, 'invalid_credentials');
        metrics.recordFailedLoginByUser(user.id, 'invalid_credentials');
        recordFailedLogin(ipAddress); // Trigger alert if threshold exceeded
        recordAuthAttempt('password', false, 'invalid_password');

        // TIMING ATTACK MITIGATION: Normalize response time
        await this._normalizeResponseTime(loginStartTime);

        return sendError(res, 'Email ou mot de passe incorrect', 401, 'invalid_credentials');
      }

      // SECURITY: Clear failed attempts after successful login
      await authLockoutService.clearFailedAttempts(user.id, ipAddress);

      // Vérifier si le compte est actif
      if (user.status !== 'active') {
        metrics.recordLoginAttempt('failure', 'email');
        metrics.recordFailedLoginByUser(user.id, 'account_disabled');
        recordAuthAttempt('password', false, 'account_disabled');

        // TIMING ATTACK MITIGATION: Normalize response time
        await this._normalizeResponseTime(loginStartTime);

        return sendError(res, 'Votre compte a été désactivé. Contactez le support.', 403, 'account_disabled');
      }

      // Générer les tokens JWT
      const { accessToken, refreshToken } = generateTokens(user.id);

      // SECURITY FIX: Store refresh token securely with metadata
      const userAgent = req.get('User-Agent');
      await refreshTokenService.storeRefreshToken(refreshToken, user.id, ipAddress, userAgent);

      // SESSION FIXATION PREVENTION: Record session creation with new tokens
      metrics.recordSessionCreation('jwt');
      metrics.recordSessionFixationPrevention('login');

      // Mettre à jour la dernière connexion
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Préparer la réponse utilisateur (sans mot de passe)
      const { password: _, ...userResponse } = user;

      logger.info(`Connexion réussie pour: ${user.email}`);

      // Record successful login
      authResult = 'success';
      metrics.recordLoginAttempt('success', 'email');
      recordAuthAttempt('password', true);

      // Record total login timing
      const [totalSeconds, totalNanoseconds] = process.hrtime(loginStartTime);
      const totalDuration = totalSeconds + totalNanoseconds / 1e9;
      metrics.recordAuthTiming('login_total', 'success', totalDuration);

      // SECURITY: Rotate CSRF token on login to prevent token reuse
      const newCsrfToken = refreshCsrfToken(req, res);
      logger.debug('CSRF token rotated on login', { userId: user.id });

      return sendSuccess(res, {
        user: userResponse,
        token: accessToken,
        refreshToken,
        csrfToken: newCsrfToken // Include new CSRF token in response
      }, 'Connexion réussie');
    } catch (error) {
      // Record login failure
      metrics.recordLoginAttempt('failure', 'email');
      recordAuthAttempt('password', false, 'login_error');

      // SECURITY FIX: Use secure error logging to prevent JWT/credential exposure
      logger.error('Login error', {
        action: 'login',
        email: req.body.email ? 'provided' : 'missing',
        errorName: error.name,
        errorMessage: error.message
      });

      // TIMING ATTACK MITIGATION: Normalize response time even on error
      await this._normalizeResponseTime(loginStartTime);

      return sendError(res, 'Impossible de se connecter', 500, 'login_error');
    } finally {
      // Always record timing metric
      const [seconds, nanoseconds] = process.hrtime(loginStartTime);
      const duration = seconds + nanoseconds / 1e9;
      metrics.recordAuthTiming('login_total', authResult, duration);
    }
  }

  /**
   * TIMING ATTACK MITIGATION
   * Ensures login responses take a consistent minimum time (200ms baseline)
   * This prevents attackers from using timing differences to enumerate users
   */
  async _normalizeResponseTime(startTime, targetMs = 200) {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const elapsedMs = (seconds * 1000) + (nanoseconds / 1e6);
    const remainingMs = Math.max(0, targetMs - elapsedMs);

    if (remainingMs > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingMs));
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['refresh-token'];

      if (refreshToken) {
        try {
          // Décoder le JWT pour récupérer le jti et userId
          const decoded = jwt.decode(refreshToken);
          if (decoded && decoded.jti && decoded.userId) {
            // Révoquer le token de manière sécurisée
            await refreshTokenService.revokeRefreshTokenByJti(decoded.jti, decoded.userId);

            // Record session deletion
            metrics.recordSessionDeletion('jwt', 'logout');
          }
        } catch (decodeError) {
          // SECURITY FIX: Never log refresh token details
          logger.logSecurity('refresh_token_decode_error', {
            action: 'logout',
            errorType: decodeError.name || 'unknown'
          });
          // Continue anyway - user asked to logout
        }
      }

      // SECURITY: Rotate CSRF token on logout to prevent old token reuse
      const newCsrfToken = refreshCsrfToken(req, res);
      logger.debug('CSRF token rotated on logout');

      return sendSuccess(res, { csrfToken: newCsrfToken }, 'Déconnexion réussie');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
      return sendError(res, 'Erreur lors de la déconnexion', 500, 'logout_error');
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        metrics.recordJwtValidationFailure('missing');
        return sendError(res, 'Refresh token requis', 401, 'token_missing');
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Utiliser le service de rotation sécurisé
      const rotationResult = await refreshTokenService.rotateRefreshToken(
        refreshToken,
        generateTokens,
        ipAddress,
        userAgent
      );

      if (!rotationResult.valid) {
        metrics.recordJwtValidationFailure('invalid');
        return sendError(res, 'Refresh token expiré ou invalide', 401, 'invalid_refresh_token');
      }

      // SESSION FIXATION PREVENTION: Old token rotated, new session created
      metrics.recordSessionDeletion('jwt', 'invalidated');
      metrics.recordSessionCreation('jwt');
      metrics.recordSessionFixationPrevention('token_refresh');

      return sendSuccess(res, {
        tokens: rotationResult.tokens
      }, 'Tokens renouvelés avec succès');
    } catch (error) {
      // SECURITY FIX: Never log refresh token data
      logger.logSecurity('refresh_token_error', {
        action: 'refresh_token',
        errorType: error.name || 'unknown',
        hasToken: !!req.body.refreshToken
      });
      metrics.recordJwtValidationFailure('error');
      return sendError(res, 'Impossible de renouveler le token', 401, 'refresh_token_error');
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Toujours retourner succès pour éviter l'énumération d'emails
      if (!user) {
        // Add delay to prevent timing attacks
        await new Promise((resolve) => setTimeout(resolve, 100));
        return sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé');
      }

      // Vérifier si le compte est actif
      if (user.status !== 'active') {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé');
      }

      try {
        // Créer un token de réinitialisation sécurisé
        const { token: resetToken, resetId } = await createPasswordResetToken(
          user.id,
          ipAddress,
          userAgent
        );

        // Envoyer l'email de réinitialisation avec le token en clair
        await emailService.sendPasswordResetEmail(email, resetToken);

        // Log security event (without exposing email or token)
        logger.info(`Password reset requested from IP ${ipAddress} for user ${user.id}`);

        // Record password reset request
        metrics.recordPasswordReset('success');

        return sendSuccess(
          res,
          { resetId }, // Return reset ID for optional tracking
          'Si cet email existe, un lien de réinitialisation a été envoyé'
        );
      } catch (tokenError) {
        // SECURITY FIX: Never log reset token details
        logger.logSecurity('password_reset_token_creation_error', {
          userId: user.id,
          errorType: tokenError.name || 'unknown'
        });
        metrics.recordPasswordReset('failure');
        return sendError(res, 'Impossible de traiter la demande actuellement', 500, 'reset_token_error');
      }
    } catch (error) {
      // SECURITY FIX: Don't log password reset details
      logger.error('Forgot password error', {
        action: 'forgot_password',
        hasEmail: !!req.body.email,
        errorName: error.name,
        errorMessage: error.message
      });
      return sendError(res, 'Impossible d\'envoyer l\'email de réinitialisation', 500, 'forgot_password_error');
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Validate password strength
      if (!password || password.length < 8) {
        return sendError(res, 'Le mot de passe doit contenir au moins 8 caractères', 400, 'weak_password');
      }

      // Verify the password reset token (includes single-use enforcement)
      const tokenResult = await verifyPasswordResetToken(token, ipAddress, userAgent);

      if (!tokenResult.valid) {
        // Log potential attack attempt
        logger.warn(`Invalid password reset token attempted from IP ${ipAddress}`);
        return sendError(res, 'Token de réinitialisation invalide ou expiré', 400, 'invalid_token');
      }

      const { userId } = tokenResult;

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true }
      });

      if (!user || user.status !== 'active') {
        return sendError(res, 'Compte utilisateur introuvable ou inactif', 400, 'user_inactive');
      }

      // Hash the new password with increased salt rounds
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const transaction = prisma.$transaction(async (prisma) => {
        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            updatedAt: new Date()
          }
        });

        // SESSION FIXATION PREVENTION: Invalidate all existing refresh tokens for security
        // This forces re-authentication and prevents session hijacking
        await refreshTokenService.revokeAllUserTokens(userId);

        // Clean up any other password reset tokens for this user
        await prisma.passwordReset.deleteMany({
          where: { userId }
        });

        return true;
      }, {
        timeout: 10000 // 10 second timeout
      });

      await transaction;

      // SESSION FIXATION PREVENTION: All sessions invalidated after password change
      metrics.recordSessionFixationPrevention('password_reset');
      metrics.recordSessionDeletion('jwt', 'password_reset');
      metrics.recordPasswordReset('success');

      // Log successful password reset (without exposing sensitive data)
      logger.info(`Password reset completed for user ${userId} from IP ${ipAddress}`);

      return sendSuccess(
        res,
        null,
        'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.'
      );
    } catch (error) {
      logger.error('Erreur lors de la réinitialisation du mot de passe:', error);
      return sendError(res, 'Impossible de réinitialiser le mot de passe', 500, 'reset_password_error');
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      // SECURITY FIX: Hash the incoming token before database lookup
      const hashedToken = hashEmailToken(token);

      const user = await prisma.user.findFirst({
        where: { emailVerificationToken: hashedToken }
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

      // SECURITY FIX: Générer un nouveau token de vérification sécurisé
      const { plainToken, hashedToken } = generateEmailVerificationToken();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: hashedToken,
          updatedAt: new Date()
        }
      });

      await emailService.sendVerificationEmail(email, plainToken);

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

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, password: true, status: true
        }
      });

      if (!user || user.status !== 'active') {
        return sendError(res, 'Utilisateur introuvable ou inactif', 404, 'user_not_found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return sendError(res, 'Mot de passe actuel incorrect', 401, 'invalid_current_password');
      }

      // Validate new password strength
      if (!newPassword || newPassword.length < 8) {
        return sendError(res, 'Le nouveau mot de passe doit contenir au moins 8 caractères', 400, 'weak_password');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and revoke all refresh tokens for security
      const transaction = prisma.$transaction(async (prisma) => {
        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedNewPassword,
            updatedAt: new Date()
          }
        });

        // Revoke all existing refresh tokens for security
        await refreshTokenService.revokeAllUserTokens(userId);

        return true;
      }, {
        timeout: 10000 // 10 second timeout
      });

      await transaction;

      logger.info(`Password changed successfully for user ${userId}`);

      return sendSuccess(res, null, 'Mot de passe modifié avec succès. Veuillez vous reconnecter.');
    } catch (error) {
      logger.error('Change password error', {
        action: 'change_password',
        userId: req.user?.id,
        errorName: error.name,
        errorMessage: error.message
      });
      return sendError(res, 'Impossible de changer le mot de passe', 500, 'change_password_error');
    }
  }
}

module.exports = new AuthController();
