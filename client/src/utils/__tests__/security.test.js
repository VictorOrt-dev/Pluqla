/**
 * Tests unitaires pour les utilitaires de sécurité
 */

import {
  sanitizeHtml,
  sanitizeInput,
  isValidEmail,
  validatePassword,
  safeJsonParse,
  generateSecureToken,
  isValidUrl,
  sanitizeProfileData
} from '../security';

describe('Security Utils', () => {
  describe('sanitizeHtml', () => {
    test('should sanitize malicious HTML', () => {
      const maliciousHtml = '<script>alert("XSS")</script><p>Safe content</p>';
      const result = sanitizeHtml(maliciousHtml);

      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    test('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
      expect(sanitizeHtml({})).toBe('');
    });

    test('should allow specified tags only', () => {
      const html = '<p><strong>Bold</strong> <em>Italic</em> <script>alert("XSS")</script></p>';
      const result = sanitizeHtml(html, {
        ALLOWED_TAGS: ['p', 'strong'],
        ALLOWED_ATTR: []
      });

      expect(result).toContain('<strong>');
      expect(result).not.toContain('<em>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      const dangerous = '<script>alert("XSS")</script>';
      const result = sanitizeInput(dangerous);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('script');
    });

    test('should remove javascript: protocols', () => {
      const input = 'javascript:alert("XSS")';
      const result = sanitizeInput(input);

      expect(result).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const input = 'onclick=alert("XSS") onmouseover=malicious()';
      const result = sanitizeInput(input);

      expect(result).not.toContain('onclick=');
      expect(result).not.toContain('onmouseover=');
    });

    test('should handle non-string input', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(123)).toBe('');
    });

    test('should preserve safe content', () => {
      const safe = 'This is safe content with numbers 123 and symbols !@#';
      const result = sanitizeInput(safe);

      expect(result).toBe(safe);
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+label@example.org',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    test('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user@.com',
        '',
        null,
        undefined,
        123
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    test('should reject emails with dangerous patterns', () => {
      const dangerousEmails = [
        'test@example.com<script>alert("XSS")</script>',
        'javascript:alert("XSS")@domain.com',
        'user@domain.com onclick=alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>@domain.com'
      ];

      dangerousEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    test('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng_Pass',
        'C0mpl3x@Password'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(3);
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '123456'
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
      });
    });

    test('should reject common patterns', () => {
      const commonPasswords = [
        '123456',
        'password',
        'admin123',
        'qwerty123'
      ];

      commonPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.score).toBeLessThan(4);
        expect(result.feedback).toContain('Évitez les mots de passe courants');
      });
    });

    test('should handle non-string input', () => {
      const result = validatePassword(null);
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Mot de passe requis');
    });

    test('should give feedback for short passwords', () => {
      const result = validatePassword('abc');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Minimum 6 caractères requis');
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      const validJson = '{"name": "John", "age": 30}';
      const result = safeJsonParse(validJson);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should return default value for invalid JSON', () => {
      const invalidJson = '{"invalid": json}';
      const defaultValue = { error: true };
      const result = safeJsonParse(invalidJson, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    test('should handle non-string input', () => {
      expect(safeJsonParse(null, 'default')).toBe('default');
      expect(safeJsonParse(undefined, 'default')).toBe('default');
      expect(safeJsonParse(123, 'default')).toBe('default');
    });

    test('should return null as default when no default provided', () => {
      const result = safeJsonParse('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('generateSecureToken', () => {
    test('should generate token of correct length', () => {
      const token8 = generateSecureToken(8);
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);

      expect(token8).toHaveLength(16); // Hex encoding doubles length
      expect(token16).toHaveLength(32);
      expect(token32).toHaveLength(64);
    });

    test('should generate different tokens', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);

      expect(token1).not.toBe(token2);
    });

    test('should generate hex tokens', () => {
      const token = generateSecureToken(16);
      const hexPattern = /^[0-9a-f]+$/;

      expect(hexPattern.test(token)).toBe(true);
    });

    test('should use default length when not specified', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('isValidUrl', () => {
    test('should validate safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com/path?query=1'
      ];

      safeUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true);
      });
    });

    test('should reject dangerous URLs', () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd'
      ];

      dangerousUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false);
      });
    });

    test('should validate against allowed domains', () => {
      const allowedDomains = ['example.com', 'trusted.org'];

      expect(isValidUrl('https://example.com', allowedDomains)).toBe(true);
      expect(isValidUrl('https://sub.example.com', allowedDomains)).toBe(true);
      expect(isValidUrl('https://trusted.org', allowedDomains)).toBe(true);
      expect(isValidUrl('https://malicious.com', allowedDomains)).toBe(false);
    });

    test('should handle invalid input', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('sanitizeProfileData', () => {
    test('should sanitize valid profile data', () => {
      const profileData = {
        name: 'John Doe',
        email: 'john@example.com',
        level: 5,
        savedAmount: 1000,
        monthlyGoal: 2000,
        isPremium: true,
        darkMode: false,
        extraField: 'should be ignored'
      };

      const result = sanitizeProfileData(profileData);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.level).toBe(5);
      expect(result.savedAmount).toBe(1000);
      expect(result.monthlyGoal).toBe(2000);
      expect(result.isPremium).toBe(true);
      expect(result.darkMode).toBe(false);
      expect(result.extraField).toBeUndefined();
    });

    test('should sanitize dangerous input', () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>John',
        email: 'invalid-email<script>',
        level: -10,
        savedAmount: 'not-a-number'
      };

      const result = sanitizeProfileData(maliciousData);

      expect(result.name).not.toContain('<script>');
      expect(result.email).toBeUndefined(); // Invalid email should be excluded
      expect(result.level).toBe(0); // Negative should be clamped to 0
      expect(result.savedAmount).toBeUndefined(); // Non-number should be excluded
    });

    test('should handle non-object input', () => {
      expect(sanitizeProfileData(null)).toEqual({});
      expect(sanitizeProfileData(undefined)).toEqual({});
      expect(sanitizeProfileData('string')).toEqual({});
      expect(sanitizeProfileData(123)).toEqual({});
    });

    test('should truncate long names', () => {
      const longName = 'a'.repeat(150);
      const result = sanitizeProfileData({ name: longName });

      expect(result.name).toHaveLength(100);
    });

    test('should normalize email case', () => {
      const result = sanitizeProfileData({ email: 'John@EXAMPLE.COM' });
      expect(result.email).toBe('john@example.com');
    });
  });
});