const { v4: uuidv4 } = require('uuid');

/**
 * MOCK EMAIL SERVICE FOR E2E TESTING
 *
 * This service intercepts and captures emails sent during E2E tests,
 * particularly for password reset token extraction.
 *
 * Features:
 * - Captures all outbound emails
 * - Extracts reset tokens from email content
 * - Validates email security (no plaintext tokens)
 * - Provides test assertions for email content
 */

class MockEmailService {
  constructor() {
    this.emails = [];
    this.isInitialized = false;
    this.resetTokenRegex = /reset-token=([a-f0-9]{32})/i;
    this.resetLinkRegex = /https?:\/\/[^\s]+\/reset-password\?token=([a-f0-9]{32})/i;
  }

  /**
   * Initialize the mock email service
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set global mock email store
    global.mockEmailStore = this;
    this.isInitialized = true;

    console.log('📧 Mock email service initialized');
  }

  /**
   * Mock email sending function
   * This replaces the real email service during tests
   */
  async sendEmail(to, subject, htmlContent, textContent = null) {
    const email = {
      id: uuidv4(),
      to,
      subject,
      htmlContent,
      textContent,
      timestamp: new Date(),
      metadata: {
        hasResetToken: this.hasResetToken(htmlContent),
        resetToken: this.extractResetToken(htmlContent),
        isSecure: this.validateEmailSecurity(htmlContent)
      }
    };

    this.emails.push(email);

    console.log(`📧 Mock email sent to ${to}: ${subject}`);

    return {
      success: true,
      messageId: email.id,
      timestamp: email.timestamp
    };
  }

  /**
   * Send password reset email (specific implementation)
   */
  async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F14545;">Réinitialisation de mot de passe - Pluqla</h1>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #F14545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p>Ce lien expire dans 1 heure pour des raisons de sécurité.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <p>L'équipe Pluqla</p>
      </div>
    `;

    const textContent = `
      Réinitialisation de mot de passe - Pluqla

      Bonjour,

      Vous avez demandé la réinitialisation de votre mot de passe.

      Utilisez ce lien pour réinitialiser votre mot de passe :
      ${resetLink}

      Ce lien expire dans 1 heure pour des raisons de sécurité.

      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

      L'équipe Pluqla
    `;

    return await this.sendEmail(email, 'Réinitialisation de votre mot de passe', htmlContent, textContent);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email, verificationToken) {
    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F14545;">Vérification de votre adresse email - Pluqla</h1>
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit(e) sur Pluqla ! Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationLink}" style="background-color: #F14545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Vérifier mon adresse email
          </a>
        </div>
        <p>Ce lien expire dans 24 heures.</p>
        <p>L'équipe Pluqla</p>
      </div>
    `;

    return await this.sendEmail(email, 'Vérifiez votre adresse email', htmlContent);
  }

  /**
   * Check if email contains a reset token
   */
  hasResetToken(content) {
    return this.resetTokenRegex.test(content) || this.resetLinkRegex.test(content);
  }

  /**
   * Extract reset token from email content
   */
  extractResetToken(content) {
    const tokenMatch = content.match(this.resetLinkRegex) || content.match(this.resetTokenRegex);
    return tokenMatch ? tokenMatch[1] : null;
  }

  /**
   * Validate email security (ensure no plaintext sensitive data)
   */
  validateEmailSecurity(content) {
    const securityChecks = {
      noPlaintextPasswords: !/password\s*[:=]\s*[a-zA-Z0-9]/i.test(content),
      noJWTTokens: !/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*/g.test(content),
      noHashedTokens: !/\$2[aby]\$/.test(content),
      noSecretKeys: !/secret|key.*[A-Za-z0-9]{20,}/i.test(content),
      hasProperLinks: /https?:\/\/[^\s]+/.test(content)
    };

    const isSecure = Object.values(securityChecks).every(check => check);

    return {
      isSecure,
      checks: securityChecks
    };
  }

  /**
   * Get all captured emails
   */
  getEmails() {
    return [...this.emails];
  }

  /**
   * Get latest email
   */
  getLatestEmail() {
    return this.emails.length > 0 ? this.emails[this.emails.length - 1] : null;
  }

  /**
   * Get emails by recipient
   */
  getEmailsForRecipient(email) {
    return this.emails.filter(e => e.to === email);
  }

  /**
   * Get emails by subject pattern
   */
  getEmailsBySubject(pattern) {
    const regex = new RegExp(pattern, 'i');
    return this.emails.filter(e => regex.test(e.subject));
  }

  /**
   * Find password reset email for user
   */
  findPasswordResetEmail(email) {
    const resetEmails = this.emails.filter(e =>
      e.to === email &&
      e.subject.toLowerCase().includes('réinitialisation') &&
      e.metadata.hasResetToken
    );

    return resetEmails.length > 0 ? resetEmails[resetEmails.length - 1] : null;
  }

  /**
   * Extract reset token for user
   */
  getResetTokenForUser(email) {
    const resetEmail = this.findPasswordResetEmail(email);
    return resetEmail ? resetEmail.metadata.resetToken : null;
  }

  /**
   * Clear all captured emails
   */
  clear() {
    this.emails = [];
    console.log('📧 Mock email store cleared');
  }

  /**
   * Get email statistics
   */
  getStats() {
    const stats = {
      totalEmails: this.emails.length,
      resetEmails: this.emails.filter(e => e.metadata.hasResetToken).length,
      secureEmails: this.emails.filter(e => e.metadata.isSecure.isSecure).length,
      recipients: [...new Set(this.emails.map(e => e.to))].length,
      timeRange: this.emails.length > 0 ? {
        first: this.emails[0].timestamp,
        last: this.emails[this.emails.length - 1].timestamp
      } : null
    };

    return stats;
  }

  /**
   * Assert email was sent
   */
  assertEmailSent(to, subjectPattern = null) {
    const userEmails = this.getEmailsForRecipient(to);

    if (userEmails.length === 0) {
      throw new Error(`No emails sent to ${to}`);
    }

    if (subjectPattern) {
      const matchingEmails = userEmails.filter(e =>
        new RegExp(subjectPattern, 'i').test(e.subject)
      );

      if (matchingEmails.length === 0) {
        throw new Error(`No emails sent to ${to} with subject matching "${subjectPattern}"`);
      }
    }

    return true;
  }

  /**
   * Assert email security
   */
  assertEmailSecurity(email) {
    const emailObj = typeof email === 'string' ? this.getLatestEmail() : email;

    if (!emailObj) {
      throw new Error('No email to validate');
    }

    if (!emailObj.metadata.isSecure.isSecure) {
      throw new Error(`Email security validation failed: ${JSON.stringify(emailObj.metadata.isSecure.checks)}`);
    }

    return true;
  }

  /**
   * Assert reset token is present and valid format
   */
  assertValidResetToken(email) {
    const resetToken = this.getResetTokenForUser(email);

    if (!resetToken) {
      throw new Error(`No reset token found for ${email}`);
    }

    // Validate token format (32 char hex)
    if (!/^[a-f0-9]{32}$/.test(resetToken)) {
      throw new Error(`Invalid reset token format: ${resetToken}`);
    }

    return resetToken;
  }
}

// Create and export singleton instance
const mockEmailService = new MockEmailService();

// Auto-initialize if in test environment
if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL_SERVICE === 'true') {
  mockEmailService.initialize();
}

module.exports = mockEmailService;