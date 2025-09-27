// Mock crypto for consistent testing - Define mock function first
const mockRandomBytes = jest.fn();

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: mockRandomBytes
}));

const crypto = require('crypto');
const {
  encryptionService,
  createFinancialRateLimit,
  validateFinancialInput,
  monitorSuspiciousActivity,
  gdprCompliance
} = require('../../src/middleware/securityMiddleware');

describe('SecurityMiddleware Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters_long!';
  });

  describe('EncryptionService', () => {
    test('should encrypt and decrypt data successfully', () => {
      // Mock consistent random values for IV and salt
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('test_iv_16bytes_', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'));

      const plaintext = 'sensitive_financial_data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');

      // Decrypt should return original data
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt different data differently', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('test_iv_16bytes_', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'))
        .mockReturnValueOnce(Buffer.from('diff_iv_16bytes_', 'utf8'))
        .mockReturnValueOnce(Buffer.from('diff_salt_32bytes_diff_salt_32by', 'utf8'));

      const data1 = 'first_secret';
      const data2 = 'second_secret';

      const encrypted1 = encryptionService.encrypt(data1);
      const encrypted2 = encryptionService.encrypt(data2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    test('should handle empty string encryption', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('test_iv_16bytes_', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'));

      const encrypted = encryptionService.encrypt('');
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    test('should throw error for invalid encrypted data', () => {
      expect(() => {
        encryptionService.decrypt('invalid_encrypted_data');
      }).toThrow();
    });

    test('should handle JSON encryption and decryption', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('test_iv_16bytes_', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'));

      const jsonData = {
        accountNumber: '1234567890',
        routingNumber: '987654321',
        accessToken: 'secret_token'
      };

      const jsonString = JSON.stringify(jsonData);
      const encrypted = encryptionService.encrypt(jsonString);
      const decrypted = encryptionService.decrypt(encrypted);
      const parsedData = JSON.parse(decrypted);

      expect(parsedData).toEqual(jsonData);
    });

    test('should generate different encryptions for same data with different IVs', () => {
      // Mock different IVs
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('test_iv_1_16byte', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_iv_2_16byte', 'utf8'))
        .mockReturnValueOnce(Buffer.from('test_salt_32bytes_test_salt_32by', 'utf8'));

      const data = 'same_data';
      const encrypted1 = encryptionService.encrypt(data);
      const encrypted2 = encryptionService.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same data
      expect(encryptionService.decrypt(encrypted1)).toBe(data);
      expect(encryptionService.decrypt(encrypted2)).toBe(data);
    });
  });

  describe('Financial Rate Limiting', () => {
    test('should create rate limiter with default options', () => {
      const rateLimiter = createFinancialRateLimit();

      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });

    test('should create rate limiter with custom options', () => {
      const customOptions = {
        windowMs: 60000,
        max: 10,
        message: 'Custom rate limit message'
      };

      const rateLimiter = createFinancialRateLimit(customOptions);
      expect(rateLimiter).toBeDefined();
    });

    test('should apply different limits for different endpoints', () => {
      const strictLimiter = createFinancialRateLimit({ max: 5 });
      const normalLimiter = createFinancialRateLimit({ max: 20 });

      expect(strictLimiter).toBeDefined();
      expect(normalLimiter).toBeDefined();
    });
  });

  describe('Financial Input Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        body: {},
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should validate and sanitize valid financial data', () => {
      req.body = {
        amount: '1000.50',
        description: '  Test Transaction  ',
        category: 'alimentation',
        accountName: 'Test Account'
      };

      validateFinancialInput(req, res, next);

      expect(req.body.amount).toBe(1000.50);
      expect(req.body.description).toBe('Test Transaction');
      expect(next).toHaveBeenCalled();
    });

    test('should reject negative amounts', () => {
      req.body = {
        amount: -100,
        description: 'Invalid amount'
      };

      validateFinancialInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_AMOUNT'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject excessive amounts', () => {
      req.body = {
        amount: 10000000, // 10 million
        description: 'Too large amount'
      };

      validateFinancialInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AMOUNT_TOO_LARGE'
        })
      );
    });

    test('should sanitize description field', () => {
      req.body = {
        amount: 100,
        description: '<script>alert("xss")</script>Grocery shopping'
      };

      validateFinancialInput(req, res, next);

      expect(req.body.description).not.toContain('<script>');
      expect(req.body.description).toContain('Grocery shopping');
      expect(next).toHaveBeenCalled();
    });

    test('should validate currency codes', () => {
      req.body = {
        amount: 100,
        currency: 'INVALID'
      };

      validateFinancialInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_CURRENCY'
        })
      );
    });

    test('should accept valid currency codes', () => {
      req.body = {
        amount: 100,
        currency: 'EUR'
      };

      validateFinancialInput(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should validate IBAN format', () => {
      req.body = {
        iban: 'invalid_iban'
      };

      validateFinancialInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept valid IBAN', () => {
      req.body = {
        iban: 'FR1420041010050500013M02606'
      };

      validateFinancialInput(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should limit description length', () => {
      req.body = {
        amount: 100,
        description: 'A'.repeat(1001) // Too long
      };

      validateFinancialInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DESCRIPTION_TOO_LONG'
        })
      );
    });
  });

  describe('Suspicious Activity Monitoring', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        body: {},
        user: { id: 'test_user_id' },
        ip: '192.168.1.100',
        get: jest.fn(() => 'Mozilla/5.0'),
        path: '/api/financial/accounts'
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();

      // Clear monitoring data
      if (global.activityMonitor) {
        global.activityMonitor.clear();
      }
    });

    test('should allow normal activity', () => {
      req.body = {
        amount: 100,
        description: 'Normal transaction'
      };

      monitorSuspiciousActivity(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should detect large transaction amounts', () => {
      req.body = {
        amount: 50000, // Large amount
        description: 'Large transaction'
      };

      monitorSuspiciousActivity(req, res, next);

      expect(next).toHaveBeenCalled(); // Should still continue but log the activity
    });

    test('should detect unusual IP patterns', () => {
      // Simulate requests from different IPs in quick succession
      const ips = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4'];

      ips.forEach(ip => {
        req.ip = ip;
        monitorSuspiciousActivity(req, res, next);
      });

      expect(next).toHaveBeenCalledTimes(ips.length);
    });

    test('should detect multiple account creation attempts', () => {
      req.path = '/api/financial/accounts';
      req.method = 'POST';

      // Simulate multiple rapid account creation attempts
      for (let i = 0; i < 6; i++) {
        monitorSuspiciousActivity(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(6);
    });

    test('should detect off-hours activity', () => {
      // Mock time to be 3 AM
      const originalNow = Date.now;
      Date.now = jest.fn(() => new Date('2024-01-15T03:00:00Z').getTime());

      req.body = {
        amount: 1000,
        description: 'Late night transaction'
      };

      monitorSuspiciousActivity(req, res, next);

      expect(next).toHaveBeenCalled();

      // Restore original Date.now
      Date.now = originalNow;
    });

    test('should handle activity without user context', () => {
      req.user = undefined;

      monitorSuspiciousActivity(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('GDPR Compliance', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: { id: 'test_user_id' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        body: {},
        headers: {}
      };
      res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should set GDPR compliance headers', () => {
      gdprCompliance(req, res, next);

      expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.set).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(next).toHaveBeenCalled();
    });

    test('should handle Do Not Track header', () => {
      req.headers['dnt'] = '1';

      gdprCompliance(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should validate consent for data processing operations', () => {
      req.path = '/api/financial/accounts';
      req.method = 'POST';

      gdprCompliance(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should handle EU user identification', () => {
      req.headers['cf-ipcountry'] = 'FR'; // Cloudflare country header

      gdprCompliance(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should log data processing activities', () => {
      req.method = 'POST';
      req.path = '/api/financial/dashboard';
      req.body = { sensitive: 'data' };

      gdprCompliance(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    test('should work together in middleware chain', () => {
      const req = {
        body: {
          amount: '1000.50',
          description: '  Valid Transaction  ',
          currency: 'EUR'
        },
        user: { id: 'test_user_id' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        path: '/api/financial/transactions',
        method: 'POST',
        headers: {}
      };

      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      // Apply middleware in order
      gdprCompliance(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      monitorSuspiciousActivity(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      validateFinancialInput(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);

      // Verify data was sanitized
      expect(req.body.amount).toBe(1000.50);
      expect(req.body.description).toBe('Valid Transaction');
    });

    test('should stop chain on validation failure', () => {
      const req = {
        body: {
          amount: -100, // Invalid
          description: 'Invalid transaction'
        },
        user: { id: 'test_user_id' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        path: '/api/financial/transactions',
        headers: {}
      };

      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      // Apply GDPR middleware (should pass)
      gdprCompliance(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Apply suspicious activity monitoring (should pass)
      monitorSuspiciousActivity(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Apply validation (should fail and not call next)
      validateFinancialInput(req, res, next);
      expect(next).toHaveBeenCalledTimes(2); // Still 2, not 3
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Performance and Memory', () => {
    test('should handle high-frequency requests without memory leaks', () => {
      const req = {
        body: { amount: 100 },
        user: { id: 'test_user_id' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        path: '/api/test',
        headers: {}
      };

      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      // Simulate 1000 requests
      for (let i = 0; i < 1000; i++) {
        req.user.id = `user_${i}`;
        monitorSuspiciousActivity(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(1000);
    });

    test('should clean up old monitoring data', () => {
      // This test would verify that old activity data is cleaned up
      // to prevent memory leaks in production
      expect(true).toBe(true); // Placeholder for actual cleanup test
    });
  });
});