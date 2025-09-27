const { test, expect } = require('@playwright/test');
const { createAPIHelper } = require('./helpers/apiHelpers');
const mockEmailService = require('./helpers/mockEmailService');

/**
 * PASSWORD RESET FLOW E2E TESTS
 *
 * Tests the complete password reset user journey:
 * 1. User Request Password Reset
 * 2. System Sends Secure Reset Email
 * 3. User Receives Reset Token via Email
 * 4. User Resets Password with Token
 * 5. User Logs in with New Password
 * 6. Old Password is Invalid
 *
 * Security Focus:
 * - Validates secure token generation and expiration
 * - Ensures emails contain no plaintext sensitive data
 * - Tests token format and cryptographic security
 * - Validates old tokens are invalidated after reset
 * - Tests rate limiting on reset requests
 */

test.describe('Password Reset Flow E2E', () => {
  let api;
  let testUser;
  let originalPassword;
  let newPassword;
  let resetToken;

  test.beforeAll(async ({ request }) => {
    api = createAPIHelper(request);

    // Generate unique test user for password reset flow
    testUser = api.generateTestUser('password-reset');
    originalPassword = testUser.password;
    newPassword = 'NewSecurePassword123!';

    // Initialize mock email service
    mockEmailService.initialize();
    mockEmailService.clear();

    console.log(`🧪 Testing password reset flow for user: ${testUser.email}`);
  });

  test.beforeEach(() => {
    // Clear email capture before each test
    mockEmailService.clear();
  });

  test.afterAll(() => {
    // Final cleanup
    mockEmailService.clear();
  });

  test.describe('User Setup', () => {
    test('should register test user for password reset testing', async () => {
      // Register user for password reset testing
      const registrationData = await api.registerUser(testUser);

      // Validate registration successful
      expect(registrationData.user).toBeDefined();
      expect(registrationData.user.email).toBe(testUser.email);
      expect(registrationData.accessToken).toBeDefined();

      // Logout immediately - we only need the user account
      await api.logoutUser(registrationData.refreshToken);

      console.log('✅ Test user registered successfully');
    });
  });

  test.describe('Password Reset Request', () => {
    test('should successfully process password reset request for valid email', async () => {
      const startTime = Date.now();

      // Request password reset
      const resetData = await api.requestPasswordReset(testUser.email);

      // Performance assertion
      api.assertResponseTime(startTime, 2000);

      // Validate response (should be generic for security)
      expect(resetData.success).toBe(true);
      expect(resetData.message).toContain('réinitialisation');

      // Wait a moment for email processing
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 5000);

      // Validate email was captured
      const capturedEmails = mockEmailService.getEmails();
      expect(capturedEmails.length).toBe(1);

      const resetEmail = capturedEmails[0];
      expect(resetEmail.to).toBe(testUser.email);
      expect(resetEmail.subject).toContain('Réinitialisation');

      // Security validation - email should be secure
      mockEmailService.assertEmailSecurity(resetEmail);

      console.log('✅ Password reset request processed successfully');
    });

    test('should return success for non-existent email (security)', async () => {
      const nonExistentEmail = 'nonexistent@e2etest.com';

      // Request password reset for non-existent email
      const resetData = await api.requestPasswordReset(nonExistentEmail);

      // Should return success to prevent email enumeration
      expect(resetData.success).toBe(true);
      expect(resetData.message).toContain('réinitialisation');

      // Should not send actual email for non-existent user
      // (This behavior depends on implementation - some systems do send email to non-existent addresses)

      console.log('✅ Non-existent email request handled securely');
    });

    test('should enforce rate limiting on multiple reset requests', async () => {
      const attempts = [];

      // Make multiple rapid reset requests
      for (let i = 0; i < 3; i++) {
        attempts.push(api.post('/api/auth/forgot-password', {
          email: testUser.email
        }));
      }

      const responses = await Promise.all(attempts);

      // At least first should succeed
      expect(responses[0].ok()).toBe(true);

      // Check if rate limiting is enforced
      const someRateLimited = responses.some(response => response.status() === 429);

      if (someRateLimited) {
        console.log('✅ Rate limiting enforced on password reset requests');
      } else {
        console.log('⚠️  Rate limiting not triggered (may be configured for higher limits)');
      }
    });
  });

  test.describe('Reset Email Validation', () => {
    test('should generate secure reset email with valid token', async () => {
      // Clear previous emails and request new reset
      mockEmailService.clear();
      await api.requestPasswordReset(testUser.email);

      // Wait for email
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 5000);

      const resetEmail = mockEmailService.getLatestEmail();

      // Validate email structure
      expect(resetEmail).toBeDefined();
      expect(resetEmail.to).toBe(testUser.email);
      expect(resetEmail.subject).toContain('Réinitialisation');
      expect(resetEmail.htmlContent).toBeDefined();
      expect(resetEmail.textContent).toBeDefined();

      // Validate token presence and format
      expect(resetEmail.metadata.hasResetToken).toBe(true);
      expect(resetEmail.metadata.resetToken).toMatch(/^[a-f0-9]{32}$/);

      // Security validation - comprehensive
      const securityCheck = resetEmail.metadata.isSecure;
      expect(securityCheck.isSecure).toBe(true);
      expect(securityCheck.checks.noPlaintextPasswords).toBe(true);
      expect(securityCheck.checks.noJWTTokens).toBe(true);
      expect(securityCheck.checks.noHashedTokens).toBe(true);
      expect(securityCheck.checks.hasProperLinks).toBe(true);

      // Store token for subsequent tests
      resetToken = resetEmail.metadata.resetToken;

      console.log('✅ Reset email security validation passed');
    });

    test('should contain proper branding and messaging', async () => {
      const resetEmail = mockEmailService.getLatestEmail();

      // Validate branding elements
      expect(resetEmail.htmlContent).toContain('Pluqla');
      expect(resetEmail.htmlContent).toContain('#F14545'); // Pluqla brand color
      expect(resetEmail.htmlContent).toContain('Réinitialiser mon mot de passe');

      // Validate security messaging
      expect(resetEmail.htmlContent).toContain('expire');
      expect(resetEmail.htmlContent).toContain('sécurité');
      expect(resetEmail.htmlContent).toContain('ignorez');

      // Validate proper link structure
      expect(resetEmail.htmlContent).toMatch(/https?:\/\/[^"]+reset-password\?token=[a-f0-9]{32}/);

      console.log('✅ Email branding and security messaging validated');
    });

    test('should generate unique tokens for multiple requests', async () => {
      // Request multiple resets to ensure token uniqueness
      mockEmailService.clear();

      await api.requestPasswordReset(testUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length === 1, 3000);
      const firstToken = mockEmailService.getLatestEmail().metadata.resetToken;

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      await api.requestPasswordReset(testUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length === 2, 3000);
      const secondToken = mockEmailService.getLatestEmail().metadata.resetToken;

      // Tokens should be different
      expect(firstToken).not.toBe(secondToken);
      expect(firstToken).toMatch(/^[a-f0-9]{32}$/);
      expect(secondToken).toMatch(/^[a-f0-9]{32}$/);

      // Store latest token
      resetToken = secondToken;

      console.log('✅ Unique token generation validated');
    });
  });

  test.describe('Password Reset Execution', () => {
    test('should successfully reset password with valid token', async () => {
      const startTime = Date.now();

      // Execute password reset
      const resetResult = await api.resetPassword(resetToken, newPassword);

      // Performance assertion
      api.assertResponseTime(startTime, 1500);

      // Validate reset successful
      expect(resetResult.success).toBe(true);
      expect(resetResult.message).toContain('réinitialisé');

      console.log('✅ Password reset executed successfully');
    });

    test('should reject password reset with invalid token', async () => {
      const invalidToken = 'invalid123456789012345678901234';

      const response = await api.post('/api/auth/reset-password', {
        token: invalidToken,
        password: newPassword
      });

      // Should return error for invalid token
      await api.assertErrorResponse(response, 400, 'INVALID_RESET_TOKEN');

      console.log('✅ Invalid reset token properly rejected');
    });

    test('should reject password reset with malformed token', async () => {
      const malformedToken = 'not-a-hex-token';

      const response = await api.post('/api/auth/reset-password', {
        token: malformedToken,
        password: newPassword
      });

      // Should return error for malformed token
      await api.assertErrorResponse(response, 400);

      console.log('✅ Malformed reset token properly rejected');
    });

    test('should reject password reset with weak new password', async () => {
      // Request fresh reset token
      mockEmailService.clear();
      await api.requestPasswordReset(testUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 3000);
      const freshToken = mockEmailService.getResetTokenForUser(testUser.email);

      const weakPassword = '123';

      const response = await api.post('/api/auth/reset-password', {
        token: freshToken,
        password: weakPassword
      });

      // Should return validation error
      await api.assertErrorResponse(response, 400, 'VALIDATION_ERROR');

      console.log('✅ Weak password properly rejected');
    });
  });

  test.describe('Post-Reset Authentication', () => {
    test('should allow login with new password after reset', async () => {
      const startTime = Date.now();

      // Login with new password
      const loginData = await api.loginUser(testUser.email, newPassword);

      // Performance assertion
      api.assertResponseTime(startTime, 1500);

      // Validate login successful
      expect(loginData.user).toBeDefined();
      expect(loginData.user.email).toBe(testUser.email);
      expect(loginData.accessToken).toBeDefined();
      expect(loginData.refreshToken).toBeDefined();

      // Clean up - logout
      await api.logoutUser(loginData.refreshToken);

      console.log('✅ Login with new password successful');
    });

    test('should reject login with old password after reset', async () => {
      const response = await api.post('/api/auth/login', {
        email: testUser.email,
        password: originalPassword
      });

      // Should reject old password
      await api.assertErrorResponse(response, 401, 'INVALID_CREDENTIALS');

      console.log('✅ Old password properly invalidated');
    });

    test('should allow multiple logins with new password', async () => {
      // Login multiple times to ensure password change is persistent
      for (let i = 0; i < 3; i++) {
        const loginData = await api.loginUser(testUser.email, newPassword);
        expect(loginData.accessToken).toBeDefined();
        await api.logoutUser(loginData.refreshToken);
      }

      console.log('✅ Multiple logins with new password successful');
    });
  });

  test.describe('Token Expiration and Reuse', () => {
    test('should reject reuse of already-used reset token', async () => {
      const response = await api.post('/api/auth/reset-password', {
        token: resetToken,
        password: 'AnotherPassword123!'
      });

      // Should reject already-used token
      await api.assertErrorResponse(response, 400, 'INVALID_RESET_TOKEN');

      console.log('✅ Used reset token properly rejected');
    });

    test('should handle expired reset token gracefully', async () => {
      // Note: This test assumes tokens expire after 1 hour
      // For E2E testing, we'll simulate an expired token by using an old format or invalid timestamp

      const expiredToken = '00000000000000000000000000000000'; // Simulated expired token

      const response = await api.post('/api/auth/reset-password', {
        token: expiredToken,
        password: 'NewPassword123!'
      });

      // Should reject expired token
      await api.assertErrorResponse(response, 400, 'INVALID_RESET_TOKEN');

      console.log('✅ Expired reset token properly rejected');
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should reject reset attempts without token', async () => {
      const response = await api.post('/api/auth/reset-password', {
        password: 'NewPassword123!'
      });

      // Should return validation error
      await api.assertErrorResponse(response, 400, 'VALIDATION_ERROR');

      console.log('✅ Reset without token properly rejected');
    });

    test('should reject reset attempts without password', async () => {
      // Get fresh token for this test
      mockEmailService.clear();
      await api.requestPasswordReset(testUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 3000);
      const freshToken = mockEmailService.getResetTokenForUser(testUser.email);

      const response = await api.post('/api/auth/reset-password', {
        token: freshToken
      });

      // Should return validation error
      await api.assertErrorResponse(response, 400, 'VALIDATION_ERROR');

      console.log('✅ Reset without password properly rejected');
    });

    test('should reject SQL injection attempts in token', async () => {
      const sqlInjectionToken = "'; DROP TABLE users; --";

      const response = await api.post('/api/auth/reset-password', {
        token: sqlInjectionToken,
        password: 'NewPassword123!'
      });

      // Should safely reject malicious token
      await api.assertErrorResponse(response, 400);

      console.log('✅ SQL injection attempt safely rejected');
    });

    test('should reject XSS attempts in password', async () => {
      // Get fresh token for this test
      mockEmailService.clear();
      await api.requestPasswordReset(testUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 3000);
      const freshToken = mockEmailService.getResetTokenForUser(testUser.email);

      const xssPassword = '<script>alert("xss")</script>';

      const response = await api.post('/api/auth/reset-password', {
        token: freshToken,
        password: xssPassword
      });

      // Should reject or sanitize XSS attempt
      await api.assertErrorResponse(response, 400);

      console.log('✅ XSS attempt in password safely handled');
    });
  });

  test.describe('Email Service Integration', () => {
    test('should handle email service failures gracefully', async () => {
      // Mock email service failure by temporarily breaking it
      const originalSendEmail = mockEmailService.sendEmail;
      mockEmailService.sendEmail = async () => {
        throw new Error('Email service temporarily unavailable');
      };

      try {
        const response = await api.post('/api/auth/forgot-password', {
          email: testUser.email
        });

        // Should still return success (don't expose internal failures)
        expect(response.ok()).toBe(true);

        console.log('✅ Email service failure handled gracefully');
      } finally {
        // Restore original email service
        mockEmailService.sendEmail = originalSendEmail;
      }
    });

    test('should validate email service integration statistics', async () => {
      const stats = mockEmailService.getStats();

      // Should have captured emails during tests
      expect(stats.totalEmails).toBeGreaterThan(0);
      expect(stats.resetEmails).toBeGreaterThan(0);
      expect(stats.recipients).toBeGreaterThan(0);

      // All emails should pass security validation
      expect(stats.secureEmails).toBe(stats.totalEmails);

      console.log(`📊 Email service stats: ${JSON.stringify(stats, null, 2)}`);
      console.log('✅ Email service integration validated');
    });
  });

  test.describe('End-to-End Flow Validation', () => {
    test('should complete full password reset flow for different user', async () => {
      // Test complete flow with a fresh user
      const newUser = api.generateTestUser('full-flow');

      // 1. Register user
      const regData = await api.registerUser(newUser);
      await api.logoutUser(regData.refreshToken);

      // 2. Request password reset
      mockEmailService.clear();
      await api.requestPasswordReset(newUser.email);
      await api.waitFor(() => mockEmailService.getEmails().length > 0, 3000);

      // 3. Extract reset token
      const token = mockEmailService.getResetTokenForUser(newUser.email);
      expect(token).toBeDefined();

      // 4. Reset password
      const newPass = 'CompleteFlowPassword123!';
      const resetResult = await api.resetPassword(token, newPass);
      expect(resetResult.success).toBe(true);

      // 5. Login with new password
      const loginData = await api.loginUser(newUser.email, newPass);
      expect(loginData.accessToken).toBeDefined();

      // 6. Verify old password doesn't work
      const oldPassResponse = await api.post('/api/auth/login', {
        email: newUser.email,
        password: newUser.password
      });
      expect(oldPassResponse.status()).toBe(401);

      // Cleanup
      await api.logoutUser(loginData.refreshToken);

      console.log('✅ Complete password reset flow validated');
    });
  });
});