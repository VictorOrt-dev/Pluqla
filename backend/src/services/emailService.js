const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Vérifier si les variables d'environnement email sont configurées
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('Email service not configured - missing environment variables');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: process.env.EMAIL_PORT === '465', // true pour 465, false pour autres ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Pour le développement
        },
      });

      logger.info('📧 Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async isConfigured() {
    return this.transporter !== null;
  }

  async sendEmail({ to, subject, text, html }) {
    try {
      if (!this.transporter) {
        logger.warn('Email service not configured - email not sent');
        return { success: false, error: 'Email service not configured' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@plusclair.app',
        to,
        subject,
        text,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully to ${to}:`, result.messageId);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Bienvenue sur +Clair ! 🎉';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Bienvenue sur +Clair !</h1>
        <p>Bonjour ${userName},</p>
        <p>Nous sommes ravis de vous accueillir sur +Clair, votre assistant intelligent pour économiser au quotidien.</p>
        <p>Vous pouvez dès maintenant commencer à utiliser l'application pour :</p>
        <ul>
          <li>📱 Analyser vos habitudes de consommation</li>
          <li>💡 Recevoir des suggestions personnalisées d'économies</li>
          <li>📊 Suivre vos progrès et objectifs d'épargne</li>
          <li>🎯 Découvrir de nouveaux moyens d'économiser</li>
        </ul>
        <p>Bon usage et bonnes économies !</p>
        <p>L'équipe +Clair</p>
      </div>
    `;

    const text = `
      Bienvenue sur +Clair !

      Bonjour ${userName},

      Nous sommes ravis de vous accueillir sur +Clair, votre assistant intelligent pour économiser au quotidien.

      Vous pouvez dès maintenant commencer à utiliser l'application pour analyser vos habitudes, recevoir des suggestions personnalisées et suivre vos progrès.

      Bon usage et bonnes économies !
      L'équipe +Clair
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const subject = 'Réinitialisation de votre mot de passe +Clair';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe +Clair.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <p style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p><strong>Ce lien expire dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
        <p>L'équipe +Clair</p>
      </div>
    `;

    const text = `
      Réinitialisation de votre mot de passe +Clair

      Vous avez demandé la réinitialisation de votre mot de passe.

      Visitez le lien suivant pour créer un nouveau mot de passe :
      ${resetLink}

      Ce lien expire dans 1 heure.

      Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.

      L'équipe +Clair
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async sendVerificationEmail(userEmail, verificationToken) {
    if (!this.transporter) {
      logger.warn('Email service not configured - verification email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    const subject = 'Vérifiez votre adresse email +Clair';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Vérification d'email</h1>
        <p>Merci de vous être inscrit sur +Clair !</p>
        <p>Pour finaliser votre inscription, veuillez cliquer sur le lien ci-dessous :</p>
        <p style="margin: 20px 0;">
          <a href="${verificationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Vérifier mon email
          </a>
        </p>
        <p><strong>Ce lien expire dans 24 heures.</strong></p>
        <p>Si vous n'avez pas créé de compte, ignorez simplement cet email.</p>
        <p>L'équipe +Clair</p>
      </div>
    `;

    const text = `
      Vérification d'email +Clair

      Merci de vous être inscrit sur +Clair !

      Pour finaliser votre inscription, visitez le lien suivant :
      ${verificationLink}

      Ce lien expire dans 24 heures.

      Si vous n'avez pas créé de compte, ignorez simplement cet email.

      L'équipe +Clair
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async sendNotificationEmail(userEmail, title, message) {
    const subject = `+Clair - ${title}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">${title}</h1>
        <p>${message}</p>
        <p>L'équipe +Clair</p>
      </div>
    `;

    const text = `${title}\n\n${message}\n\nL'équipe +Clair`;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Email service not configured' };
      }

      await this.transporter.verify();
      logger.info('📧 Email service connection verified');
      return { success: true };
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();