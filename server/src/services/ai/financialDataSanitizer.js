/**
 * Financial Data Sanitizer for AI Processing
 *
 * This module ensures that sensitive financial information is properly
 * anonymized before being sent to external AI providers, maintaining
 * compliance with PSD2, GDPR, and other financial regulations.
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

class FinancialDataSanitizer {
  constructor() {
    this.sensitiveFields = [
      'accountNumber',
      'iban',
      'routingNumber',
      'cardNumber',
      'cvv',
      'pin',
      'ssn',
      'taxId',
      'bankName',
      'fullAccountDetails'
    ];

    this.piiFields = [
      'fullName',
      'email',
      'phone',
      'address',
      'dateOfBirth',
      'socialSecurityNumber',
      'passport',
      'driversLicense'
    ];

    // Generate consistent hash salt for anonymization
    this.hashSalt = process.env.AI_ANONYMIZATION_SALT || 'pluqla-ai-anonymization-2024';
  }

  /**
   * Main sanitization method - removes/anonymizes sensitive data
   */
  async sanitizeFinancialData(data, userContext = {}) {
    try {
      logger.debug('Sanitizing financial data for AI processing', {
        userId: userContext.userId,
        dataKeys: Object.keys(data || {}),
        hasUserContext: !!userContext.userId
      });

      // Deep clone to avoid modifying original data
      const sanitizedData = JSON.parse(JSON.stringify(data));

      // Apply sanitization rules
      this.removeSensitiveFields(sanitizedData);
      this.anonymizePII(sanitizedData, userContext);
      this.roundFinancialAmounts(sanitizedData);
      this.anonymizeTransactionDetails(sanitizedData);
      this.removeIdentifiableTimestamps(sanitizedData);

      // Add anonymization metadata
      sanitizedData._sanitization = {
        anonymized: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
        rules: ['sensitive_removed', 'pii_anonymized', 'amounts_rounded', 'transactions_anonymized']
      };

      logger.info('Financial data sanitized successfully', {
        userId: userContext.userId,
        originalKeys: Object.keys(data || {}),
        sanitizedKeys: Object.keys(sanitizedData),
        rulesApplied: sanitizedData._sanitization.rules.length
      });

      return sanitizedData;

    } catch (error) {
      logger.error('Failed to sanitize financial data', {
        error: error.message,
        userId: userContext.userId
      });

      // Return safe fallback
      return {
        error: 'Data sanitization failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Remove explicitly sensitive financial fields
   */
  removeSensitiveFields(data) {
    if (!data || typeof data !== 'object') return;

    // Remove sensitive fields at current level
    this.sensitiveFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        delete data[field];
      }
    });

    // Recursively process nested objects and arrays
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => this.removeSensitiveFields(item));
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.removeSensitiveFields(data[key]);
      }
    });
  }

  /**
   * Anonymize PII data using consistent hashing
   */
  anonymizePII(data, userContext) {
    if (!data || typeof data !== 'object') return;

    // Replace PII fields with anonymized versions
    this.piiFields.forEach(field => {
      if (data.hasOwnProperty(field) && data[field]) {
        data[field] = this.generateAnonymousId(data[field], field);
      }
    });

    // Anonymize user ID consistently
    if (userContext.userId) {
      data.anonymousUserId = this.generateAnonymousId(userContext.userId, 'userId');
    }

    // Recursively process nested objects and arrays
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => this.anonymizePII(item, userContext));
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.anonymizePII(data[key], userContext);
      }
    });
  }

  /**
   * Generate consistent anonymous ID for a given value
   */
  generateAnonymousId(value, type) {
    const hash = crypto
      .createHash('sha256')
      .update(`${type}:${value}:${this.hashSalt}`)
      .digest('hex')
      .substring(0, 16);

    return `ANON_${type.toUpperCase()}_${hash}`;
  }

  /**
   * Round financial amounts to remove precise values
   */
  roundFinancialAmounts(data) {
    if (!data || typeof data !== 'object') return;

    // Fields that typically contain financial amounts
    const amountFields = ['amount', 'balance', 'value', 'price', 'cost', 'fee', 'total', 'subtotal'];

    amountFields.forEach(field => {
      if (data.hasOwnProperty(field) && typeof data[field] === 'number') {
        // Round to nearest dollar for privacy
        data[field] = Math.round(data[field]);
      }
    });

    // Recursively process nested objects and arrays
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => this.roundFinancialAmounts(item));
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.roundFinancialAmounts(data[key]);
      }
    });
  }

  /**
   * Anonymize transaction details while preserving analytical value
   */
  anonymizeTransactionDetails(data) {
    if (!data || typeof data !== 'object') return;

    // Handle transaction objects
    if (data.transactions && Array.isArray(data.transactions)) {
      data.transactions = data.transactions.map(transaction => {
        return this.anonymizeTransaction(transaction);
      });
    }

    // Handle single transaction
    if (data.description || data.merchant) {
      Object.assign(data, this.anonymizeTransaction(data));
    }

    // Recursively process nested objects and arrays
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => this.anonymizeTransactionDetails(item));
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.anonymizeTransactionDetails(data[key]);
      }
    });
  }

  /**
   * Anonymize a single transaction
   */
  anonymizeTransaction(transaction) {
    const anonymized = { ...transaction };

    // Anonymize merchant names but preserve category hints
    if (anonymized.merchant) {
      anonymized.merchant = this.anonymizeMerchantName(anonymized.merchant);
    }

    // Generalize transaction descriptions
    if (anonymized.description) {
      anonymized.description = this.generalizeDescription(anonymized.description);
    }

    // Remove or anonymize reference numbers
    const refFields = ['reference', 'confirmationNumber', 'orderNumber', 'transactionId'];
    refFields.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = `REF_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      }
    });

    return anonymized;
  }

  /**
   * Anonymize merchant names while preserving business category
   */
  anonymizeMerchantName(merchant) {
    // Common merchant patterns to preserve analytical value
    const patterns = [
      { pattern: /amazon|amzn/i, replacement: 'ECOMMERCE_RETAILER' },
      { pattern: /walmart|target|costco/i, replacement: 'RETAIL_STORE' },
      { pattern: /starbucks|coffee/i, replacement: 'COFFEE_SHOP' },
      { pattern: /gas|fuel|shell|bp|exxon/i, replacement: 'GAS_STATION' },
      { pattern: /restaurant|cafe|bistro|grill/i, replacement: 'RESTAURANT' },
      { pattern: /grocery|supermarket|market/i, replacement: 'GROCERY_STORE' },
      { pattern: /bank|atm|credit/i, replacement: 'FINANCIAL_INSTITUTION' },
      { pattern: /pharmacy|cvs|walgreens/i, replacement: 'PHARMACY' },
      { pattern: /uber|lyft|taxi/i, replacement: 'RIDESHARE' },
      { pattern: /netflix|spotify|subscription/i, replacement: 'SUBSCRIPTION_SERVICE' }
    ];

    for (const { pattern, replacement } of patterns) {
      if (pattern.test(merchant)) {
        return replacement;
      }
    }

    // Default anonymization
    return `MERCHANT_${crypto.createHash('md5').update(merchant).digest('hex').substring(0, 8).toUpperCase()}`;
  }

  /**
   * Generalize transaction descriptions
   */
  generalizeDescription(description) {
    // Remove specific identifiers while preserving transaction type
    let generalized = description
      .replace(/\b\d{4,}\b/g, 'XXXX') // Replace numbers 4+ digits
      .replace(/\b[A-Z]{2,}\d+\b/g, 'REF') // Replace reference codes
      .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // Replace email addresses
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, 'DATE') // Replace dates
      .replace(/\$[\d,]+\.?\d*/g, 'AMOUNT'); // Replace dollar amounts

    return generalized.length > 100 ? generalized.substring(0, 100) + '...' : generalized;
  }

  /**
   * Remove or generalize timestamps to prevent tracking
   */
  removeIdentifiableTimestamps(data) {
    if (!data || typeof data !== 'object') return;

    const timestampFields = ['createdAt', 'updatedAt', 'timestamp', 'lastModified'];

    timestampFields.forEach(field => {
      if (data[field]) {
        // Convert to general time period instead of exact timestamp
        const date = new Date(data[field]);
        data[field] = this.generalizeTimestamp(date);
      }
    });

    // Recursively process nested objects and arrays
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => this.removeIdentifiableTimestamps(item));
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.removeIdentifiableTimestamps(data[key]);
      }
    });
  }

  /**
   * Convert exact timestamp to general time period
   */
  generalizeTimestamp(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    return `Q${quarter}_${year}`;
  }

  /**
   * Validate that data has been properly sanitized
   */
  validateSanitization(data) {
    const violations = [];

    // Check for remaining sensitive fields
    const dataString = JSON.stringify(data);

    // Check for account numbers (assuming they're numeric and 8+ digits)
    if (/\b\d{8,}\b/.test(dataString)) {
      violations.push('Potential account numbers detected');
    }

    // Check for email patterns
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(dataString)) {
      violations.push('Email addresses detected');
    }

    // Check for phone patterns
    if (/\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s*\d{3}-\d{4}/.test(dataString)) {
      violations.push('Phone numbers detected');
    }

    // Check for SSN patterns
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(dataString)) {
      violations.push('SSN patterns detected');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

// Export singleton instance and utility functions
const sanitizer = new FinancialDataSanitizer();

module.exports = {
  sanitizeFinancialData: (data, userContext) => sanitizer.sanitizeFinancialData(data, userContext),
  validateSanitization: (data) => sanitizer.validateSanitization(data),
  FinancialDataSanitizer
};