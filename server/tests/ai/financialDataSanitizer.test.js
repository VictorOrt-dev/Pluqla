/**
 * Financial Data Sanitizer Unit Tests
 *
 * Tests the data anonymization and sanitization functionality to ensure
 * sensitive financial data is properly protected before AI processing.
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const { sanitizeFinancialData, validateSanitization } = require('../../src/services/ai/financialDataSanitizer');

describe('Financial Data Sanitizer', () => {
  let mockUserContext;
  let mockFinancialData;

  beforeEach(() => {
    mockUserContext = {
      userId: 'user-123',
      email: 'test@example.com'
    };

    mockFinancialData = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      accountNumber: '1234567890123456',
      iban: 'GB82WEST12345698765432',
      routingNumber: '123456789',
      cardNumber: '4111111111111111',
      ssn: '123-45-6789',
      transactions: [
        {
          amount: 123.45,
          description: 'Purchase at STARBUCKS #1234 NEW YORK NY on 2024-09-29',
          merchant: 'Starbucks Coffee',
          accountNumber: '9876543210',
          reference: 'TXN123456789',
          createdAt: '2024-09-29T14:30:22.123Z'
        }
      ],
      accounts: [
        {
          accountNumber: '1111222233334444',
          balance: 1234.56,
          bankName: 'Chase Bank'
        }
      ]
    };
  });

  describe('Sensitive Field Removal', () => {
    test('should remove all sensitive financial fields', async () => {
      const sanitized = await sanitizeFinancialData(mockFinancialData, mockUserContext);

      // Sensitive fields should be completely removed
      expect(sanitized.accountNumber).toBeUndefined();
      expect(sanitized.iban).toBeUndefined();
      expect(sanitized.routingNumber).toBeUndefined();
      expect(sanitized.cardNumber).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();

      // Nested sensitive fields should also be removed
      expect(sanitized.transactions[0].accountNumber).toBeUndefined();
      expect(sanitized.accounts[0].accountNumber).toBeUndefined();
      expect(sanitized.accounts[0].bankName).toBeUndefined();
    });

    test('should handle nested objects and arrays', async () => {
      const nestedData = {
        user: {
          profile: {
            accountNumber: '1234567890',
            ssn: '123-45-6789'
          }
        },
        items: [
          { accountNumber: '9876543210' },
          { iban: 'GB82WEST12345698765432' }
        ]
      };

      const sanitized = await sanitizeFinancialData(nestedData, mockUserContext);

      expect(sanitized.user.profile.accountNumber).toBeUndefined();
      expect(sanitized.user.profile.ssn).toBeUndefined();
      expect(sanitized.items[0].accountNumber).toBeUndefined();
      expect(sanitized.items[1].iban).toBeUndefined();
    });
  });

  describe('PII Anonymization', () => {
    test('should anonymize personal identifiers consistently', async () => {
      const sanitized = await sanitizeFinancialData(mockFinancialData, mockUserContext);

      // PII should be replaced with anonymous IDs
      expect(sanitized.fullName).toMatch(/^ANON_FULLNAME_[a-f0-9]{16}$/);
      expect(sanitized.email).toMatch(/^ANON_EMAIL_[a-f0-9]{16}$/);
      expect(sanitized.anonymousUserId).toMatch(/^ANON_USERID_[a-f0-9]{16}$/);

      // Same values should produce same anonymous IDs
      const sanitized2 = await sanitizeFinancialData(mockFinancialData, mockUserContext);
      expect(sanitized.fullName).toBe(sanitized2.fullName);
      expect(sanitized.email).toBe(sanitized2.email);
    });

    test('should generate different anonymous IDs for different values', async () => {
      const data1 = { fullName: 'John Doe' };
      const data2 = { fullName: 'Jane Smith' };

      const sanitized1 = await sanitizeFinancialData(data1, mockUserContext);
      const sanitized2 = await sanitizeFinancialData(data2, mockUserContext);

      expect(sanitized1.fullName).not.toBe(sanitized2.fullName);
    });
  });

  describe('Financial Amount Rounding', () => {
    test('should round financial amounts to nearest dollar', async () => {
      const data = {
        amount: 123.45,
        balance: 987.89,
        value: 456.12,
        transactions: [
          { amount: 12.99 },
          { amount: 100.01 }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.amount).toBe(123);
      expect(sanitized.balance).toBe(988);
      expect(sanitized.value).toBe(456);
      expect(sanitized.transactions[0].amount).toBe(13);
      expect(sanitized.transactions[1].amount).toBe(100);
    });

    test('should handle zero and negative amounts', async () => {
      const data = {
        amount: 0,
        balance: -123.45,
        value: -0.99
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.amount).toBe(0);
      expect(sanitized.balance).toBe(-123);
      expect(sanitized.value).toBe(-1);
    });
  });

  describe('Transaction Anonymization', () => {
    test('should anonymize merchant names while preserving categories', async () => {
      const data = {
        transactions: [
          { merchant: 'Starbucks Coffee #1234' },
          { merchant: 'Amazon.com' },
          { merchant: 'Shell Gas Station' },
          { merchant: 'Unknown Merchant LLC' }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.transactions[0].merchant).toBe('COFFEE_SHOP');
      expect(sanitized.transactions[1].merchant).toBe('ECOMMERCE_RETAILER');
      expect(sanitized.transactions[2].merchant).toBe('GAS_STATION');
      expect(sanitized.transactions[3].merchant).toMatch(/^MERCHANT_[A-F0-9]{8}$/);
    });

    test('should generalize transaction descriptions', async () => {
      const data = {
        transactions: [
          {
            description: 'Purchase at STARBUCKS #1234 NEW YORK NY on 2024-09-29 REF:TXN123456789'
          },
          {
            description: 'Online payment to john.doe@example.com for $45.99'
          }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      const desc1 = sanitized.transactions[0].description;
      const desc2 = sanitized.transactions[1].description;

      // Should replace specific numbers, emails, and amounts
      expect(desc1).not.toContain('1234');
      expect(desc1).not.toContain('TXN123456789');
      expect(desc2).not.toContain('john.doe@example.com');
      expect(desc2).not.toContain('$45.99');

      // Should contain generic replacements
      expect(desc1).toContain('XXXX');
      expect(desc2).toContain('EMAIL');
      expect(desc2).toContain('AMOUNT');
    });

    test('should anonymize reference numbers', async () => {
      const data = {
        transactions: [
          {
            reference: 'TXN123456789',
            confirmationNumber: 'CNF987654321',
            transactionId: 'ID555666777'
          }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      const txn = sanitized.transactions[0];
      expect(txn.reference).toMatch(/^REF_[A-F0-9]{12}$/);
      expect(txn.confirmationNumber).toMatch(/^REF_[A-F0-9]{12}$/);
      expect(txn.transactionId).toMatch(/^REF_[A-F0-9]{12}$/);
    });
  });

  describe('Timestamp Generalization', () => {
    test('should convert exact timestamps to general periods', async () => {
      const data = {
        createdAt: '2024-09-29T14:30:22.123Z',
        updatedAt: '2024-03-15T09:45:18.456Z',
        timestamp: '2024-12-01T23:59:59.999Z'
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.createdAt).toBe('Q3_2024');
      expect(sanitized.updatedAt).toBe('Q1_2024');
      expect(sanitized.timestamp).toBe('Q4_2024');
    });

    test('should handle nested timestamps', async () => {
      const data = {
        transactions: [
          { createdAt: '2024-06-15T10:30:00Z' },
          { timestamp: '2024-01-01T00:00:00Z' }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.transactions[0].createdAt).toBe('Q2_2024');
      expect(sanitized.transactions[1].timestamp).toBe('Q1_2024');
    });
  });

  describe('Sanitization Metadata', () => {
    test('should add sanitization metadata', async () => {
      const sanitized = await sanitizeFinancialData(mockFinancialData, mockUserContext);

      expect(sanitized._sanitization).toBeDefined();
      expect(sanitized._sanitization.anonymized).toBe(true);
      expect(sanitized._sanitization.timestamp).toBeDefined();
      expect(sanitized._sanitization.version).toBe('1.0');
      expect(sanitized._sanitization.rules).toContain('sensitive_removed');
      expect(sanitized._sanitization.rules).toContain('pii_anonymized');
      expect(sanitized._sanitization.rules).toContain('amounts_rounded');
      expect(sanitized._sanitization.rules).toContain('transactions_anonymized');
    });
  });

  describe('Error Handling', () => {
    test('should handle null and undefined data gracefully', async () => {
      const nullResult = await sanitizeFinancialData(null, mockUserContext);
      const undefinedResult = await sanitizeFinancialData(undefined, mockUserContext);

      expect(nullResult).toHaveProperty('error');
      expect(undefinedResult).toHaveProperty('error');
    });

    test('should handle malformed data structures', async () => {
      const circularData = { a: {} };
      circularData.a.circular = circularData;

      const result = await sanitizeFinancialData(circularData, mockUserContext);
      expect(result).toHaveProperty('error');
    });

    test('should handle missing user context', async () => {
      const result = await sanitizeFinancialData(mockFinancialData, null);

      // Should still work but without user-specific anonymization
      expect(result._sanitization).toBeDefined();
      expect(result._sanitization.anonymized).toBe(true);
    });
  });

  describe('Data Preservation', () => {
    test('should preserve non-sensitive data structure', async () => {
      const data = {
        category: 'food',
        type: 'expense',
        currency: 'USD',
        status: 'completed',
        metadata: {
          source: 'mobile_app',
          version: '1.0'
        }
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);

      expect(sanitized.category).toBe('food');
      expect(sanitized.type).toBe('expense');
      expect(sanitized.currency).toBe('USD');
      expect(sanitized.status).toBe('completed');
      expect(sanitized.metadata.source).toBe('mobile_app');
      expect(sanitized.metadata.version).toBe('1.0');
    });

    test('should preserve analytical value while removing sensitive data', async () => {
      const data = {
        transactions: [
          {
            amount: 4.99,
            category: 'food',
            merchant: 'Starbucks',
            description: 'Coffee purchase',
            accountNumber: '1234567890' // This should be removed
          }
        ]
      };

      const sanitized = await sanitizeFinancialData(data, mockUserContext);
      const txn = sanitized.transactions[0];

      // Analytical value preserved
      expect(txn.amount).toBe(5); // Rounded but still meaningful
      expect(txn.category).toBe('food');
      expect(txn.merchant).toBe('COFFEE_SHOP'); // Categorized

      // Sensitive data removed
      expect(txn.accountNumber).toBeUndefined();
    });
  });
});

describe('Sanitization Validation', () => {
  test('should validate that sensitive data has been removed', async () => {
    const sanitizedData = {
      amount: 100,
      category: 'food',
      description: 'COFFEE_SHOP purchase'
    };

    const validation = validateSanitization(sanitizedData);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  test('should detect remaining sensitive patterns', async () => {
    const unsanitizedData = {
      amount: 100,
      email: 'test@example.com',
      description: 'Payment to john.doe@email.com for $45.99',
      phone: '555-123-4567',
      ssn: '123-45-6789'
    };

    const validation = validateSanitization(unsanitizedData);
    expect(validation.isValid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
    expect(validation.violations).toContain('Email addresses detected');
    expect(validation.violations).toContain('Phone numbers detected');
    expect(validation.violations).toContain('SSN patterns detected');
  });

  test('should detect potential account numbers', async () => {
    const dataWithAccountNumbers = {
      reference: '12345678901234',
      id: '987654321'
    };

    const validation = validateSanitization(dataWithAccountNumbers);
    expect(validation.isValid).toBe(false);
    expect(validation.violations).toContain('Potential account numbers detected');
  });
});