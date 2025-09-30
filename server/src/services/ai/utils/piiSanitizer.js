/**
 * PII Sanitizer for AI Service
 *
 * GDPR/PSD2 compliant data anonymization to prevent sensitive information
 * from being sent to external AI providers.
 *
 * Detects and sanitizes:
 * - Email addresses
 * - Phone numbers
 * - Names (first + last)
 * - Credit card numbers
 * - IBANs
 * - SSNs
 * - Addresses
 * - Bank account numbers
 * - IP addresses
 *
 * @module piiSanitizer
 */

const crypto = require('crypto');
const logger = require('../../../utils/logger');

/**
 * PII detection patterns (comprehensive regex)
 */
const PII_PATTERNS = {
  // Email: user@domain.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone: Various international formats
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{1,4})?/g,

  // Credit Card: 13-19 digits with optional spaces/dashes
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}(?:[\s-]?\d{1,3})?\b/g,

  // IBAN: European bank account (2 letter country + 2 digits + alphanumeric)
  iban: /\b[A-Z]{2}\d{2}[\s]?(?:[A-Z0-9]{4}[\s]?){2,7}[A-Z0-9]{1,4}\b/gi,

  // SSN/Social Security: Various formats (US, FR)
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b|\b\d{1}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,

  // Names: First + Last name patterns (capitalized words)
  names: /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,

  // Address: Street numbers + street names
  address: /\b\d+\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,

  // IP Address: IPv4 and IPv6
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}/g,

  // Account Number: Generic bank account patterns
  accountNumber: /\b(?:account|compte|numero)\s*[:#]?\s*\d{8,20}\b/gi,

  // Bitcoin addresses
  bitcoin: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
};

/**
 * Sensitive keywords that should trigger sanitization
 */
const SENSITIVE_KEYWORDS = [
  'password', 'secret', 'token', 'api_key', 'apikey',
  'credit', 'debit', 'pin', 'cvv', 'cvc',
  'social security', 'ssn', 'passport',
  'birth date', 'birthday', 'dob',
  'mother', 'father', 'maiden name',
];

/**
 * Financial amount patterns (for anonymization)
 */
const FINANCIAL_PATTERNS = {
  // Large amounts (>€10,000)
  largeAmount: /\b(?:€|EUR|\$|USD)\s*[1-9]\d{4,}\b/gi,

  // Specific amounts with decimals
  exactAmount: /\b(?:€|EUR|\$|USD)?\s*\d{1,10}[.,]\d{2}\b/gi,
};

class PIISanitizer {
  constructor(options = {}) {
    this.mode = options.mode || process.env.AI_SANITIZER_MODE || 'strict';
    this.salt = process.env.AI_ANONYMIZATION_SALT || 'default-pluqla-salt-2024';
    this.logger = logger;
  }

  /**
   * Main sanitization method - removes all PII from data
   *
   * @param {Object|String} data - Data to sanitize
   * @param {Object} userContext - User context for consistent anonymization
   * @returns {Object} Sanitized data
   */
  sanitize(data, userContext = {}) {
    const startTime = Date.now();

    try {
      // Convert to string for pattern matching
      let sanitized = typeof data === 'string' ? data : JSON.stringify(data);

      // Store original length for logging
      const originalLength = sanitized.length;

      // Generate consistent user hash for this session
      const userHash = this._generateUserHash(userContext.userId);

      // Apply all PII pattern replacements
      sanitized = this._sanitizeEmails(sanitized, userHash);
      sanitized = this._sanitizePhones(sanitized, userHash);
      sanitized = this._sanitizeCreditCards(sanitized);
      sanitized = this._sanitizeIBANs(sanitized, userHash);
      sanitized = this._sanitizeSSNs(sanitized);
      sanitized = this._sanitizeNames(sanitized, userHash);
      sanitized = this._sanitizeAddresses(sanitized);
      sanitized = this._sanitizeIPAddresses(sanitized);
      sanitized = this._sanitizeAccountNumbers(sanitized, userHash);
      sanitized = this._sanitizeBitcoin(sanitized);

      // Sanitize financial amounts in strict mode
      if (this.mode === 'strict') {
        sanitized = this._sanitizeFinancialAmounts(sanitized);
      }

      // Remove sensitive keywords
      sanitized = this._sanitizeSensitiveKeywords(sanitized);

      // Convert back to original type
      const result = typeof data === 'string' ? sanitized : JSON.parse(sanitized);

      // Log sanitization metrics
      const duration = Date.now() - startTime;
      this.logger.info('PII sanitization completed', {
        originalLength,
        sanitizedLength: sanitized.length,
        reduction: `${Math.round((1 - sanitized.length / originalLength) * 100)}%`,
        duration: `${duration}ms`,
        mode: this.mode,
        userId: userContext.userId || 'anonymous'
      });

      return result;

    } catch (error) {
      this.logger.error('PII sanitization failed', {
        error: error.message,
        userId: userContext.userId
      });

      // On error, return heavily redacted version
      return this._emergencySanitize(data);
    }
  }

  /**
   * Validate that data contains no PII (for testing)
   *
   * @param {Object|String} data - Data to validate
   * @returns {Object} Validation result with detected PII
   */
  validate(data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const detected = {};

    // Check each pattern
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = dataStr.match(pattern);
      if (matches && matches.length > 0) {
        detected[type] = {
          count: matches.length,
          examples: matches.slice(0, 3) // First 3 examples
        };
      }
    }

    return {
      isValid: Object.keys(detected).length === 0,
      detected: detected,
      safe: Object.keys(detected).length === 0
    };
  }

  /**
   * Sanitize emails
   */
  _sanitizeEmails(text, userHash) {
    return text.replace(PII_PATTERNS.email, `[EMAIL_${userHash}]`);
  }

  /**
   * Sanitize phone numbers
   */
  _sanitizePhones(text, userHash) {
    // Filter out false positives (dates, amounts)
    return text.replace(PII_PATTERNS.phone, (match) => {
      // Ignore if it looks like a date or amount
      if (/^\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}$/.test(match)) return match;
      if (/^[\d\s\-]{5,}$/.test(match) && match.replace(/\D/g, '').length < 10) return match;

      return `[PHONE_${userHash}]`;
    });
  }

  /**
   * Sanitize credit card numbers
   */
  _sanitizeCreditCards(text) {
    return text.replace(PII_PATTERNS.creditCard, (match) => {
      // Verify it's a valid credit card pattern (Luhn check not needed for sanitization)
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 13 && digits.length <= 19) {
        return '[CARD_REDACTED]';
      }
      return match;
    });
  }

  /**
   * Sanitize IBANs
   */
  _sanitizeIBANs(text, userHash) {
    return text.replace(PII_PATTERNS.iban, `[IBAN_${userHash}]`);
  }

  /**
   * Sanitize SSNs
   */
  _sanitizeSSNs(text) {
    return text.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
  }

  /**
   * Sanitize names (people)
   */
  _sanitizeNames(text, userHash) {
    // Be conservative - only replace clear name patterns
    return text.replace(PII_PATTERNS.names, (match) => {
      // Ignore common words that aren't names
      const commonWords = ['The Company', 'The Bank', 'Le Monde', 'La France'];
      if (commonWords.includes(match)) return match;

      return `[NAME_${userHash}]`;
    });
  }

  /**
   * Sanitize addresses
   */
  _sanitizeAddresses(text) {
    return text.replace(PII_PATTERNS.address, '[ADDRESS_REDACTED]');
  }

  /**
   * Sanitize IP addresses
   */
  _sanitizeIPAddresses(text) {
    return text.replace(PII_PATTERNS.ipAddress, '[IP_REDACTED]');
  }

  /**
   * Sanitize account numbers
   */
  _sanitizeAccountNumbers(text, userHash) {
    return text.replace(PII_PATTERNS.accountNumber, `[ACCOUNT_${userHash}]`);
  }

  /**
   * Sanitize Bitcoin addresses
   */
  _sanitizeBitcoin(text) {
    return text.replace(PII_PATTERNS.bitcoin, '[BTC_REDACTED]');
  }

  /**
   * Sanitize financial amounts (strict mode)
   */
  _sanitizeFinancialAmounts(text) {
    // Only sanitize very specific amounts (>€10k)
    return text.replace(FINANCIAL_PATTERNS.largeAmount, '[AMOUNT_REDACTED]');
  }

  /**
   * Sanitize sensitive keywords
   */
  _sanitizeSensitiveKeywords(text) {
    let sanitized = text;

    for (const keyword of SENSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '[SENSITIVE_KEYWORD]');
    }

    return sanitized;
  }

  /**
   * Generate consistent hash for user anonymization
   */
  _generateUserHash(userId) {
    if (!userId) return 'ANON';

    return crypto
      .createHash('sha256')
      .update(userId + this.salt)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
  }

  /**
   * Emergency sanitization (maximum redaction)
   */
  _emergencySanitize(data) {
    this.logger.error('Emergency sanitization activated');

    return {
      error: 'Data sanitization failed - request blocked for safety',
      code: 'SANITIZATION_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sanitize array of transactions
   */
  sanitizeTransactions(transactions, userContext = {}) {
    if (!Array.isArray(transactions)) {
      throw new Error('Transactions must be an array');
    }

    return transactions.map(transaction => ({
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      type: transaction.type || 'expense',
      // Description sanitized
      description: this.sanitize(transaction.description || '', userContext)
    }));
  }

  /**
   * Sanitize user context (keep only necessary data)
   */
  sanitizeUserContext(userContext) {
    return {
      userId: this._generateUserHash(userContext.userId),
      isPremium: Boolean(userContext.isPremium),
      monthlyGoal: userContext.monthlyGoal || 0,
      savedAmount: userContext.savedAmount || 0,
      level: userContext.level || 1,
      // Never include: email, name, phone, address
    };
  }
}

// Export singleton instance
const sanitizer = new PIISanitizer();

module.exports = {
  PIISanitizer,
  sanitizer,
  PII_PATTERNS,
  SENSITIVE_KEYWORDS,
};