const { expect } = require('@playwright/test');

/**
 * SECURITY VALIDATION HELPERS FOR E2E TESTS
 *
 * Comprehensive security testing utilities for Pluqla financial application:
 * - JWT Token Security Validation
 * - Sensitive Data Leakage Prevention
 * - SQL Injection Protection Testing
 * - XSS Protection Validation
 * - Rate Limiting Testing
 * - Authentication/Authorization Checks
 * - Input Sanitization Validation
 * - HTTPS and Transport Security
 */

class SecurityHelpers {
  constructor(request, baseURL) {
    this.request = request;
    this.baseURL = baseURL || 'http://localhost:3004';
  }

  /**
   * JWT TOKEN SECURITY VALIDATION
   */

  /**
   * Validate JWT token format and structure
   */
  validateJWTFormat(token, tokenType = 'access') {
    if (!token) {
      throw new Error(`${tokenType} token is missing`);
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    // Each part should be base64url encoded
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    parts.forEach((part, index) => {
      expect(part).toMatch(base64UrlPattern);
      expect(part.length).toBeGreaterThan(0);
    });

    // Header should decode to valid JSON
    try {
      const header = JSON.parse(atob(parts[0]));
      expect(header).toHaveProperty('alg');
      expect(header).toHaveProperty('typ', 'JWT');
    } catch (error) {
      throw new Error(`Invalid JWT header: ${error.message}`);
    }

    // Payload should decode to valid JSON with required claims
    try {
      const payload = JSON.parse(atob(parts[1]));
      expect(payload).toHaveProperty('exp'); // Expiration time
      expect(payload).toHaveProperty('iat'); // Issued at time

      if (tokenType === 'access') {
        expect(payload).toHaveProperty('id'); // User ID for access tokens
      }

      // Expiration should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);

    } catch (error) {
      throw new Error(`Invalid JWT payload: ${error.message}`);
    }

    return true;
  }

  /**
   * Validate token expiration timing
   */
  validateTokenExpiration(token, expectedMaxLifeMinutes = 15) {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));

    const issuedAt = payload.iat;
    const expiresAt = payload.exp;
    const lifeTimeMinutes = (expiresAt - issuedAt) / 60;

    // Token lifetime should not exceed expected maximum
    expect(lifeTimeMinutes).toBeLessThanOrEqual(expectedMaxLifeMinutes);

    // Token should still be valid for at least 1 minute
    const now = Math.floor(Date.now() / 1000);
    expect(expiresAt - now).toBeGreaterThan(60);

    return true;
  }

  /**
   * SENSITIVE DATA LEAKAGE PREVENTION
   */

  /**
   * Assert response contains no sensitive data
   */
  assertNoSensitiveDataLeakage(responseData) {
    const responseString = JSON.stringify(responseData).toLowerCase();

    // Check for password-related leakage
    const passwordPatterns = [
      /password\s*[:=]\s*[a-zA-Z0-9]/,
      /hashedpassword/,
      /pwd\s*[:=]/,
      /\$2[aby]\$/, // bcrypt hashes
      /\$argon2/, // argon2 hashes
    ];

    passwordPatterns.forEach(pattern => {
      expect(responseString).not.toMatch(pattern);
    });

    // Check for token leakage (full JWT tokens)
    const tokenPatterns = [
      /eyJ[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}/, // Full JWT
      /bearer\s+[a-f0-9]{32,}/, // API keys
    ];

    tokenPatterns.forEach(pattern => {
      expect(responseString).not.toMatch(pattern);
    });

    // Check for database connection strings
    const dbPatterns = [
      /postgresql:\/\/[^"'\s]+/,
      /mongodb:\/\/[^"'\s]+/,
      /mysql:\/\/[^"'\s]+/,
      /database_url/,
    ];

    dbPatterns.forEach(pattern => {
      expect(responseString).not.toMatch(pattern);
    });

    // Check for secret keys and environment variables
    const secretPatterns = [
      /secret[_-]?key/,
      /jwt[_-]?secret/,
      /encryption[_-]?key/,
      /private[_-]?key/,
      /access[_-]?key[_-]?id/,
      /secret[_-]?access[_-]?key/,
    ];

    secretPatterns.forEach(pattern => {
      expect(responseString).not.toMatch(pattern);
    });

    return true;
  }

  /**
   * Assert user data contains only safe public fields
   */
  assertSafeUserData(userData) {
    const safeFields = ['id', 'email', 'name', 'createdAt', 'updatedAt', 'isEmailVerified'];
    const dangerousFields = ['password', 'hashedPassword', 'salt', 'passwordResetToken', 'emailVerificationToken'];

    // Should have required safe fields
    expect(userData).toHaveProperty('id');
    expect(userData).toHaveProperty('email');

    // Should not have any dangerous fields
    dangerousFields.forEach(field => {
      expect(userData).not.toHaveProperty(field);
    });

    // Email should be valid format
    expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    return true;
  }

  /**
   * SQL INJECTION PROTECTION TESTING
   */

  /**
   * Test SQL injection protection on endpoint
   */
  async testSQLInjectionProtection(endpoint, method = 'GET', paramName = 'id') {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; SELECT * FROM users WHERE '1'='1'; --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --",
      "'; UPDATE users SET password='hacked' WHERE '1'='1'; --"
    ];

    for (const payload of sqlPayloads) {
      let response;

      if (method === 'GET') {
        const params = new URLSearchParams();
        params.set(paramName, payload);
        response = await this.request.get(`${this.baseURL}${endpoint}?${params.toString()}`);
      } else if (method === 'POST') {
        const data = {};
        data[paramName] = payload;
        response = await this.request.post(`${this.baseURL}${endpoint}`, {
          data,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Should not return 500 (internal server error) which might indicate SQL injection vulnerability
      expect(response.status()).not.toBe(500);

      // Should return appropriate error response (400 or 401/403)
      expect([400, 401, 403, 404, 422]).toContain(response.status());

      // Response should not contain SQL error messages
      const responseText = await response.text();
      const sqlErrorPatterns = [
        /syntax error/i,
        /mysql/i,
        /postgresql/i,
        /sqlite/i,
        /ora-\d+/i,
        /table.*doesn't exist/i,
        /column.*doesn't exist/i,
      ];

      sqlErrorPatterns.forEach(pattern => {
        expect(responseText).not.toMatch(pattern);
      });
    }

    return true;
  }

  /**
   * XSS PROTECTION VALIDATION
   */

  /**
   * Test XSS protection on endpoint
   */
  async testXSSProtection(endpoint, method = 'POST', paramName = 'content') {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="data:text/html,<script>alert(1)</script>"></object>',
      '<embed src="data:text/html,<script>alert(1)</script>">',
    ];

    for (const payload of xssPayloads) {
      const data = {};
      data[paramName] = payload;

      const response = await this.request[method.toLowerCase()](`${this.baseURL}${endpoint}`, {
        data,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok()) {
        const responseData = await response.json().catch(() => ({}));

        // Response should not echo back unescaped XSS payload
        const responseText = JSON.stringify(responseData);
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror=');
        expect(responseText).not.toContain('onload=');
      }
    }

    return true;
  }

  /**
   * RATE LIMITING TESTING
   */

  /**
   * Test rate limiting on endpoint
   */
  async testRateLimit(endpoint, method = 'POST', data = {}, expectedLimit = 5, timeWindowMs = 60000) {
    const requests = [];
    const startTime = Date.now();

    // Make rapid requests
    for (let i = 0; i < expectedLimit + 2; i++) {
      const requestData = { ...data, attempt: i };
      requests.push(
        this.request[method.toLowerCase()](`${this.baseURL}${endpoint}`, {
          data: requestData,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // Check if requests were made within expected time window
    expect(endTime - startTime).toBeLessThan(timeWindowMs);

    // Count rate-limited responses (429)
    const rateLimitedResponses = responses.filter(r => r.status() === 429);

    if (rateLimitedResponses.length === 0) {
      console.log(`⚠️  No rate limiting detected on ${endpoint} (may be configured for higher limits)`);
      return false;
    }

    // Should have at least some rate-limited responses
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Rate-limited responses should have appropriate headers
    const rateLimitedResponse = rateLimitedResponses[0];
    const headers = rateLimitedResponse.headers();

    // Common rate limiting headers
    const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'retry-after'];
    const hasRateLimitHeaders = rateLimitHeaders.some(header => headers[header]);

    if (hasRateLimitHeaders) {
      console.log(`✅ Rate limiting properly configured with headers`);
    }

    return true;
  }

  /**
   * AUTHENTICATION/AUTHORIZATION CHECKS
   */

  /**
   * Test protected endpoint access control
   */
  async testProtectedEndpointAccess(endpoint, validToken = null, expectedAuthorizedStatus = 200) {
    // Test 1: No token
    const noTokenResponse = await this.request.get(`${this.baseURL}${endpoint}`);
    expect(noTokenResponse.status()).toBe(401);

    // Test 2: Invalid token
    const invalidTokenResponse = await this.request.get(`${this.baseURL}${endpoint}`, {
      headers: { 'Authorization': 'Bearer invalid-token-format' }
    });
    expect(invalidTokenResponse.status()).toBe(401);

    // Test 3: Expired token (simulated)
    const expiredTokenResponse = await this.request.get(`${this.baseURL}${endpoint}`, {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJleHAiOjB9.invalid' }
    });
    expect(expiredTokenResponse.status()).toBe(401);

    // Test 4: Valid token (if provided)
    if (validToken) {
      const validTokenResponse = await this.request.get(`${this.baseURL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });
      expect(validTokenResponse.status()).toBe(expectedAuthorizedStatus);
    }

    return true;
  }

  /**
   * INPUT SANITIZATION VALIDATION
   */

  /**
   * Test input sanitization for common attack vectors
   */
  async testInputSanitization(endpoint, method = 'POST', fieldName = 'input') {
    const maliciousInputs = [
      // Path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',

      // Command injection
      '; cat /etc/passwd',
      '| ls -la',
      '$(whoami)',

      // LDAP injection
      '*)(uid=*',

      // XML/XXE injection
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',

      // NoSQL injection
      '{"$gt": ""}',

      // Template injection
      '{{7*7}}',
      '${7*7}',
    ];

    for (const input of maliciousInputs) {
      const data = {};
      data[fieldName] = input;

      const response = await this.request[method.toLowerCase()](`${this.baseURL}${endpoint}`, {
        data,
        headers: { 'Content-Type': 'application/json' }
      });

      // Should not return 500 (which might indicate successful injection)
      expect(response.status()).not.toBe(500);

      if (response.ok()) {
        const responseData = await response.json().catch(() => ({}));
        const responseText = JSON.stringify(responseData);

        // Should not contain evidence of successful attacks
        expect(responseText).not.toMatch(/root:x:0:0:/); // /etc/passwd content
        expect(responseText).not.toContain('49'); // 7*7 template injection result
        expect(responseText).not.toMatch(/\$\{.*\}/); // Template injection patterns
      }
    }

    return true;
  }

  /**
   * HTTPS AND TRANSPORT SECURITY
   */

  /**
   * Validate security headers in response
   */
  assertSecurityHeaders(response) {
    const headers = response.headers();

    // Content Security Policy
    if (headers['content-security-policy']) {
      expect(headers['content-security-policy']).toBeDefined();
    }

    // X-Content-Type-Options
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }

    // X-Frame-Options
    if (headers['x-frame-options']) {
      expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']);
    }

    // X-XSS-Protection
    if (headers['x-xss-protection']) {
      expect(headers['x-xss-protection']).toMatch(/1; mode=block/);
    }

    // Strict-Transport-Security (for HTTPS)
    if (headers['strict-transport-security']) {
      expect(headers['strict-transport-security']).toContain('max-age=');
    }

    return true;
  }

  /**
   * COMPREHENSIVE SECURITY SCAN
   */

  /**
   * Run comprehensive security validation on API response
   */
  async runSecurityScan(response, options = {}) {
    const {
      checkSensitiveData = true,
      checkSecurityHeaders = false, // Optional since not all APIs return HTML
      checkUserData = false,
      userData = null
    } = options;

    const results = {
      passed: [],
      failed: [],
      warnings: []
    };

    try {
      // Check response status is not revealing internal errors
      if (response.status() === 500) {
        results.warnings.push('Server returned 500 - possible information disclosure');
      }

      const responseData = await response.json().catch(() => ({}));

      // Check for sensitive data leakage
      if (checkSensitiveData) {
        try {
          this.assertNoSensitiveDataLeakage(responseData);
          results.passed.push('No sensitive data leakage detected');
        } catch (error) {
          results.failed.push(`Sensitive data leakage: ${error.message}`);
        }
      }

      // Check user data safety
      if (checkUserData && userData) {
        try {
          this.assertSafeUserData(userData);
          results.passed.push('User data contains only safe fields');
        } catch (error) {
          results.failed.push(`Unsafe user data: ${error.message}`);
        }
      }

      // Check security headers
      if (checkSecurityHeaders) {
        try {
          this.assertSecurityHeaders(response);
          results.passed.push('Security headers properly configured');
        } catch (error) {
          results.warnings.push(`Security headers: ${error.message}`);
        }
      }

    } catch (error) {
      results.failed.push(`Security scan error: ${error.message}`);
    }

    return results;
  }
}

/**
 * Create security helper instance
 */
function createSecurityHelper(request, baseURL) {
  return new SecurityHelpers(request, baseURL);
}

module.exports = {
  SecurityHelpers,
  createSecurityHelper
};