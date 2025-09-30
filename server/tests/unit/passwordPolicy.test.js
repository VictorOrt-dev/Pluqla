/**
 * Password Policy Tests
 *
 * Tests for password complexity enforcement middleware
 */

const { validatePassword, getPasswordStrength } = require('../../src/middleware/passwordPolicy');

describe('Password Policy', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 10 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 10 characters long');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without digits', () => {
      const result = validatePassword('NoDigitsHere!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one digit');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    });

    it('should reject common passwords', () => {
      const commonPasswords = ['Password123!', 'Welcome123!', 'Admin123!', 'password123!'];

      commonPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.includes('too common'))).toBe(true);
      });
    });

    it('should reject passwords with sequential characters', () => {
      const result = validatePassword('Abcd1234!test');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('sequential'))).toBe(true);
    });

    it('should reject passwords with repeated characters', () => {
      const result = validatePassword('Aaaa1234!test');
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('repeated'))).toBe(true);
    });

    it('should accept strong valid passwords', () => {
      const strongPasswords = [
        'MyS3cur3P@ssw0rd!',
        'Tr0ub4dor&3Extended',
        'C0rr3ct-H0rse-B@ttery!',
        'P@55w0rd$ecureNow',
        'Str0ngP@ssw0rd2024!'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        if (!result.valid) {
          console.log(`Failed for: ${password}`, result.errors);
        }
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle null/undefined passwords', () => {
      expect(validatePassword(null).valid).toBe(false);
      expect(validatePassword(undefined).valid).toBe(false);
      expect(validatePassword('').valid).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return 0 for empty passwords', () => {
      expect(getPasswordStrength('')).toBe(0);
      expect(getPasswordStrength(null)).toBe(0);
    });

    it('should return low score for weak passwords', () => {
      expect(getPasswordStrength('weak')).toBeLessThan(2);
      expect(getPasswordStrength('password')).toBeLessThan(2);
    });

    it('should return high score for strong passwords', () => {
      expect(getPasswordStrength('MyS3cur3P@ssw0rd!')).toBeGreaterThanOrEqual(3);
      expect(getPasswordStrength('Tr0ub4dor&3Extended')).toBeGreaterThanOrEqual(3);
    });

    it('should penalize common passwords', () => {
      const weak = getPasswordStrength('Password123!');
      const strong = getPasswordStrength('Str0ngP@ssw0rd2024!');
      expect(weak).toBeLessThan(strong);
    });
  });
});
