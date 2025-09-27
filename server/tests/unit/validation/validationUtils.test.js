/**
 * 🧪 VALIDATION UTILITIES UNIT TESTS
 *
 * Comprehensive test suite for core validation utilities in Pluqla backend.
 * Tests security-critical validation functions against various attack vectors.
 *
 * Test Categories:
 * - Input sanitization
 * - Malicious pattern detection
 * - Email validation
 * - Password strength validation
 * - UUID format validation
 * - Amount validation
 * - Date validation
 * - Custom validators
 */

const {
  ValidationUtils,
  customValidators,
  processValidationResults,
  sanitizeInputs,
  SECURE_PATTERNS,
  SANITIZE_CONFIG
} = require('../../../src/middleware/validation/validationUtils');

describe('ValidationUtils Core Security Functions', () => {

  describe('sanitizeString', () => {
    test('should sanitize basic HTML tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = ValidationUtils.sanitizeString(maliciousInput);
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<script>');
    });

    test('should remove null bytes and control characters', () => {
      const maliciousInput = 'Hello\x00\x01World\x7F';
      const result = ValidationUtils.sanitizeString(maliciousInput);
      expect(result).toBe('HelloWorld');
    });

    test('should normalize Unicode to prevent bypass attempts', () => {
      const unicodeInput = 'Café'; // Contains Unicode characters
      const result = ValidationUtils.sanitizeString(unicodeInput);
      expect(result).toBe('Café');
      expect(result.length).toBeLessThanOrEqual(unicodeInput.length);
    });

    test('should enforce length limits', () => {
      const longInput = 'A'.repeat(2000);
      const result = ValidationUtils.sanitizeString(longInput, { maxLength: 100 });
      expect(result.length).toBe(100);
    });

    test('should handle non-string input gracefully', () => {
      expect(ValidationUtils.sanitizeString(null)).toBe('');
      expect(ValidationUtils.sanitizeString(undefined)).toBe('');
      expect(ValidationUtils.sanitizeString(123)).toBe('');
      expect(ValidationUtils.sanitizeString({})).toBe('');
    });

    test('should trim whitespace', () => {
      const input = '  \t\nHello World\r\n\t  ';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('detectMaliciousPatterns', () => {
    test('should detect SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "INSERT INTO users VALUES",
        "DELETE FROM accounts",
        "CREATE TABLE malicious",
        "ALTER TABLE users ADD"
      ];

      sqlInjections.forEach(injection => {
        const result = ValidationUtils.detectMaliciousPatterns(injection);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('sql_injection');
      });
    });

    test('should detect XSS patterns', () => {
      const xssAttacks = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<iframe src="malicious.com"></iframe>',
        '<object data="malicious.swf"></object>',
        '<embed src="malicious.swf">',
        'onload="alert(1)"',
        'onmouseover="alert(1)"'
      ];

      xssAttacks.forEach(attack => {
        const result = ValidationUtils.detectMaliciousPatterns(attack);
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('xss_attempt');
      });
    });

    test('should detect excessive length (DoS attack)', () => {
      const massiveInput = 'A'.repeat(20000);
      const result = ValidationUtils.detectMaliciousPatterns(massiveInput);
      expect(result.safe).toBe(false);
      expect(result.threats).toContain('excessive_length');
    });

    test('should allow safe input', () => {
      const safeInputs = [
        'Hello World',
        'user@example.com',
        'Valid password123!',
        '€123.45',
        '2024-01-01',
        'This is a normal description.'
      ];

      safeInputs.forEach(input => {
        const result = ValidationUtils.detectMaliciousPatterns(input);
        expect(result.safe).toBe(true);
        expect(result.threats).toHaveLength(0);
      });
    });

    test('should handle non-string input', () => {
      const result = ValidationUtils.detectMaliciousPatterns(123);
      expect(result.safe).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'simple@example.io',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double@domain.com',
        'user@domain.',
        'user@domain..com',
        '.user@domain.com',
        'user@.domain.com',
        'a'.repeat(255) + '@domain.com' // Too long
      ];

      invalidEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(false);
      });
    });

    test('should reject emails over RFC limit', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      expect(ValidationUtils.isValidEmail(longEmail)).toBe(false);
    });

    test('should handle non-string input', () => {
      expect(ValidationUtils.isValidEmail(null)).toBe(false);
      expect(ValidationUtils.isValidEmail(undefined)).toBe(false);
      expect(ValidationUtils.isValidEmail(123)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'MyPassword123!',
        'SecureP@ss1',
        'Complex#Pass99',
        'Str0ng&Secure',
        'Val1d@Password'
      ];

      strongPasswords.forEach(password => {
        const result = ValidationUtils.validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject passwords too short', () => {
      const result = ValidationUtils.validatePassword('Sh0rt!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject passwords too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = ValidationUtils.validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    test('should require letters', () => {
      const result = ValidationUtils.validatePassword('12345678!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one letter');
    });

    test('should require numbers', () => {
      const result = ValidationUtils.validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should require special characters', () => {
      const result = ValidationUtils.validatePassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*#?&)');
    });

    test('should reject common passwords', () => {
      const commonPasswords = [
        'password123!',
        'Password1!',
        'qwerty123!',
        'admin123!'
      ];

      commonPasswords.forEach(password => {
        const result = ValidationUtils.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('common patterns'))).toBe(true);
      });
    });

    test('should handle non-string input', () => {
      const result = ValidationUtils.validatePassword(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('isValidUUID', () => {
    test('should validate correct UUID v4', () => {
      const validUUIDs = [
        '12345678-1234-4567-8901-123456789012',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(true);
      });
    });

    test('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        '12345678-1234-1567-8901-123456789012', // Wrong version
        '12345678-1234-4567-8901-12345678901', // Too short
        '12345678-1234-4567-8901-1234567890123', // Too long
        '12345678-1234-4567-8901', // Missing sections
        'not-a-uuid',
        '12345678_1234_4567_8901_123456789012', // Wrong separators
        'GGGGGGGG-GGGG-4GGG-GGGG-GGGGGGGGGGGG' // Invalid hex
      ];

      invalidUUIDs.forEach(uuid => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(false);
      });
    });

    test('should handle non-string input', () => {
      expect(ValidationUtils.isValidUUID(null)).toBe(false);
      expect(ValidationUtils.isValidUUID(undefined)).toBe(false);
      expect(ValidationUtils.isValidUUID(123)).toBe(false);
    });
  });

  describe('validateAmount', () => {
    test('should validate correct financial amounts', () => {
      const validAmounts = [
        '123.45',
        '0.01',
        '1000',
        '99999.99',
        123.45,
        1000
      ];

      validAmounts.forEach(amount => {
        const result = ValidationUtils.validateAmount(amount);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(typeof result.value).toBe('number');
      });
    });

    test('should reject negative amounts', () => {
      const result = ValidationUtils.validateAmount(-100);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount cannot be negative');
    });

    test('should reject excessive amounts', () => {
      const result = ValidationUtils.validateAmount(2000000000);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount cannot exceed 1 billion');
    });

    test('should reject too many decimal places', () => {
      const result = ValidationUtils.validateAmount('123.456');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount cannot have more than 2 decimal places');
    });

    test('should reject non-numeric input', () => {
      const result = ValidationUtils.validateAmount('not-a-number');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be a valid number');
    });

    test('should round to 2 decimal places', () => {
      const result = ValidationUtils.validateAmount('123.449');
      expect(result.valid).toBe(false); // Should fail due to too many decimals
    });
  });

  describe('validateDate', () => {
    test('should validate correct date formats', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31T23:59:59Z',
        '2023-06-15',
        new Date().toISOString()
      ];

      validDates.forEach(date => {
        const result = ValidationUtils.validateDate(date);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.value).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    test('should reject invalid date formats', () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '24-01-01', // Invalid year format
        'January 1, 2024' // Non-ISO format
      ];

      invalidDates.forEach(date => {
        const result = ValidationUtils.validateDate(date);
        expect(result.valid).toBe(false);
      });
    });

    test('should reject dates outside reasonable range', () => {
      const tooOldDate = '1800-01-01';
      const tooFutureDate = '2100-01-01';

      expect(ValidationUtils.validateDate(tooOldDate).valid).toBe(false);
      expect(ValidationUtils.validateDate(tooFutureDate).valid).toBe(false);
    });

    test('should handle empty input', () => {
      const result = ValidationUtils.validateDate('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });
  });

  describe('Custom Validators', () => {
    test('isSecureEmail should throw on invalid email', () => {
      expect(() => customValidators.isSecureEmail('invalid-email')).toThrow('Please provide a valid email address');
      expect(customValidators.isSecureEmail('valid@example.com')).toBe(true);
    });

    test('isSecurePassword should throw on weak password', () => {
      expect(() => customValidators.isSecurePassword('weak')).toThrow();
      expect(customValidators.isSecurePassword('StrongPass123!')).toBe(true);
    });

    test('isSecureUUID should throw on invalid UUID', () => {
      expect(() => customValidators.isSecureUUID('invalid-uuid')).toThrow('Must be a valid UUID format');
      expect(customValidators.isSecureUUID('12345678-1234-4567-8901-123456789012')).toBe(true);
    });

    test('isSecureAmount should throw on invalid amount', () => {
      expect(() => customValidators.isSecureAmount(-100)).toThrow();
      expect(customValidators.isSecureAmount('123.45')).toBe(true);
    });

    test('isSecureDate should throw on invalid date', () => {
      expect(() => customValidators.isSecureDate('invalid-date')).toThrow();
      expect(customValidators.isSecureDate('2024-01-01')).toBe(true);
    });

    test('isSafe should throw on malicious content', () => {
      expect(() => customValidators.isSafe('<script>alert("xss")</script>')).toThrow('Input contains potentially harmful content');
      expect(customValidators.isSafe('Safe content')).toBe(true);
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle Unicode bypass attempts', () => {
      const unicodeBypass = '\\u003cscript\\u003e';
      const result = ValidationUtils.sanitizeString(unicodeBypass);
      expect(result).not.toContain('script');
    });

    test('should handle URL encoded bypass attempts', () => {
      const urlEncodedBypass = '%3Cscript%3E';
      const threats = ValidationUtils.detectMaliciousPatterns(urlEncodedBypass);
      expect(threats.safe).toBe(false);
    });

    test('should handle mixed case bypass attempts', () => {
      const mixedCase = '<ScRiPt>alert("xss")</ScRiPt>';
      const threats = ValidationUtils.detectMaliciousPatterns(mixedCase);
      expect(threats.safe).toBe(false);
    });

    test('should handle nested injection attempts', () => {
      const nested = '<<script>script>alert("xss")<</script>/script>';
      const sanitized = ValidationUtils.sanitizeString(nested);
      const threats = ValidationUtils.detectMaliciousPatterns(sanitized);
      expect(threats.safe).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large inputs efficiently', () => {
      const largeInput = 'A'.repeat(50000);
      const start = Date.now();
      ValidationUtils.sanitizeString(largeInput);
      const end = Date.now();
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle many small inputs efficiently', () => {
      const inputs = Array(1000).fill('test@example.com');
      const start = Date.now();
      inputs.forEach(email => ValidationUtils.isValidEmail(email));
      const end = Date.now();
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});

describe('Middleware Functions', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn(() => 'test-user-agent'),
      originalUrl: '/test',
      method: 'POST'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('sanitizeInputs', () => {
    test('should sanitize body parameters', () => {
      mockReq.body = {
        name: '  <script>alert("xss")</script>John  ',
        email: 'john@example.com'
      };

      sanitizeInputs(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.email).toBe('john@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should sanitize query parameters', () => {
      mockReq.query = {
        search: '  <script>  ',
        limit: '10'
      };

      sanitizeInputs(mockReq, mockRes, mockNext);

      expect(mockReq.query.search).toBe('');
      expect(mockReq.query.limit).toBe('10');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should sanitize URL parameters', () => {
      mockReq.params = {
        id: '  12345678-1234-4567-8901-123456789012  ',
        name: '<script>test</script>'
      };

      sanitizeInputs(mockReq, mockRes, mockNext);

      expect(mockReq.params.id).toBe('12345678-1234-4567-8901-123456789012');
      expect(mockReq.params.name).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});