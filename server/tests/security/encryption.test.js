/**
 * Security Tests for Encryption Services
 * Tests encryption/decryption functionality and key persistence
 */

const crypto = require('crypto');
const { EncryptionService } = require('../../src/middleware/securityMiddleware');
const BankIntegrationService = require('../../src/services/bankIntegrationService');

describe('Financial Encryption Service', () => {
  let encryptionService;
  const testKey = crypto.randomBytes(32).toString('hex');

  beforeAll(() => {
    // Set test encryption key
    process.env.FINANCIAL_ENCRYPTION_KEY = testKey;
    encryptionService = new EncryptionService();
  });

  afterAll(() => {
    delete process.env.FINANCIAL_ENCRYPTION_KEY;
  });

  describe('Key Management', () => {
    test('should require FINANCIAL_ENCRYPTION_KEY environment variable', () => {
      delete process.env.FINANCIAL_ENCRYPTION_KEY;

      expect(() => {
        new EncryptionService();
      }).toThrow('FINANCIAL_ENCRYPTION_KEY is required in environment variables');
    });

    test('should validate key length (must be 64 hex characters)', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = 'short-key';

      expect(() => {
        new EncryptionService();
      }).toThrow('FINANCIAL_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');

      // Restore valid key for other tests
      process.env.FINANCIAL_ENCRYPTION_KEY = testKey;
    });

    test('should validate hex format', () => {
      process.env.FINANCIAL_ENCRYPTION_KEY = 'g'.repeat(64); // Invalid hex chars

      expect(() => {
        Buffer.from(process.env.FINANCIAL_ENCRYPTION_KEY, 'hex');
        new EncryptionService();
      }).toThrow();

      // Restore valid key for other tests
      process.env.FINANCIAL_ENCRYPTION_KEY = testKey;
    });
  });

  describe('Encryption/Decryption', () => {
    const testData = JSON.stringify({
      accountNumber: '1234567890',
      routing: '987654321',
      sensitive: 'very secret data'
    });

    test('should encrypt and decrypt data correctly', () => {
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    });

    test('should produce different ciphertext for same plaintext', () => {
      const encrypted1 = encryptionService.encrypt(testData);
      const encrypted2 = encryptionService.encrypt(testData);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(testData);
      expect(encryptionService.decrypt(encrypted2)).toBe(testData);
    });

    test('should fail with tampered ciphertext', () => {
      const encrypted = encryptionService.encrypt(testData);

      // Tamper with the encrypted data
      const tamperedData = encrypted.slice(0, -4) + 'XXXX';

      expect(() => {
        encryptionService.decrypt(tamperedData);
      }).toThrow('Failed to decrypt sensitive data');
    });

    test('should fail with invalid base64', () => {
      expect(() => {
        encryptionService.decrypt('invalid-base64-data');
      }).toThrow('Failed to decrypt sensitive data');
    });

    test('should maintain data integrity across server restarts', () => {
      // Simulate server restart with same key
      const originalData = 'persistent test data';
      const encrypted = encryptionService.encrypt(originalData);

      // Create new service instance with same key
      const newService = new EncryptionService();
      const decrypted = newService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });
  });

  describe('Hash Functions', () => {
    test('should hash data with salt', () => {
      const data = 'test password';
      const hash = encryptionService.hash(data);

      expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      expect(hash.split(':')[0]).toHaveLength(64); // Salt length
      expect(hash.split(':')[1]).toHaveLength(128); // Hash length
    });

    test('should verify hashed data correctly', () => {
      const data = 'test password';
      const hash = encryptionService.hash(data);

      expect(encryptionService.verifyHash(data, hash)).toBe(true);
      expect(encryptionService.verifyHash('wrong password', hash)).toBe(false);
    });

    test('should produce different hashes for same data', () => {
      const data = 'test password';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);

      expect(hash1).not.toBe(hash2);
      expect(encryptionService.verifyHash(data, hash1)).toBe(true);
      expect(encryptionService.verifyHash(data, hash2)).toBe(true);
    });
  });
});

describe('Bank Credentials Encryption', () => {
  let bankService;
  const testBankKey = crypto.randomBytes(32).toString('hex');

  beforeAll(() => {
    process.env.BANK_ENCRYPTION_KEY = testBankKey;
    bankService = new (require('../../src/services/bankIntegrationService').constructor)();
  });

  afterAll(() => {
    delete process.env.BANK_ENCRYPTION_KEY;
  });

  describe('Key Management', () => {
    test('should require BANK_ENCRYPTION_KEY environment variable', () => {
      delete process.env.BANK_ENCRYPTION_KEY;

      expect(() => {
        new (require('../../src/services/bankIntegrationService').constructor)();
      }).toThrow('BANK_ENCRYPTION_KEY is required in environment variables');
    });

    test('should validate bank encryption key format', () => {
      process.env.BANK_ENCRYPTION_KEY = 'invalid-key';

      expect(() => {
        new (require('../../src/services/bankIntegrationService').constructor)();
      }).toThrow('BANK_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');

      // Restore valid key
      process.env.BANK_ENCRYPTION_KEY = testBankKey;
    });
  });

  describe('Credential Encryption', () => {
    const testCredentials = {
      accessToken: 'test-access-token-12345',
      refreshToken: 'test-refresh-token-67890',
      expiresAt: '2024-12-31T23:59:59Z',
      userId: 'user123'
    };

    test('should encrypt and decrypt credentials using AES-256-GCM', () => {
      const encrypted = bankService.encryptCredentials(testCredentials);
      const decrypted = bankService.decryptCredentials(encrypted);

      expect(decrypted).toEqual(testCredentials);
    });

    test('should produce authenticated encryption (different each time)', () => {
      const encrypted1 = bankService.encryptCredentials(testCredentials);
      const encrypted2 = bankService.encryptCredentials(testCredentials);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt correctly
      expect(bankService.decryptCredentials(encrypted1)).toEqual(testCredentials);
      expect(bankService.decryptCredentials(encrypted2)).toEqual(testCredentials);
    });

    test('should detect tampering with GCM authentication', () => {
      const encrypted = bankService.encryptCredentials(testCredentials);

      // Tamper with encrypted data
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[buffer.length - 1] ^= 1; // Flip one bit
      const tamperedData = buffer.toString('base64');

      expect(() => {
        bankService.decryptCredentials(tamperedData);
      }).toThrow('Failed to decrypt bank credentials');
    });

    test('should handle legacy credential format gracefully', () => {
      // Test with fake legacy format
      const legacyData = 'fake-legacy-encrypted-data';

      expect(() => {
        bankService.decryptCredentials(legacyData);
      }).toThrow('Cannot decrypt legacy credentials - manual re-authentication required');
    });

    test('should persist across service restarts', () => {
      const credentials = { token: 'persistent-test-token' };
      const encrypted = bankService.encryptCredentials(credentials);

      // Create new service instance with same key
      const newBankService = new (require('../../src/services/bankIntegrationService').constructor)();
      const decrypted = newBankService.decryptCredentials(encrypted);

      expect(decrypted).toEqual(credentials);
    });
  });
});

describe('Security Edge Cases', () => {
  test('should handle empty data encryption', () => {
    process.env.FINANCIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const service = new EncryptionService();

    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe('');
  });

  test('should handle unicode data correctly', () => {
    process.env.FINANCIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const service = new EncryptionService();

    const unicodeData = '🔐 Sécurité financière émojis test 中文 العربية';
    const encrypted = service.encrypt(unicodeData);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(unicodeData);
  });

  test('should handle large data encryption', () => {
    process.env.FINANCIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const service = new EncryptionService();

    const largeData = 'x'.repeat(100000); // 100KB
    const encrypted = service.encrypt(largeData);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(largeData);
  });
});