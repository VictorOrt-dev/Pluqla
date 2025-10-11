const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');
const jwt = require('jsonwebtoken');

describe('GDPR Compliance - Account Deletion (Article 17: Right to Erasure)', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'gdpr-deletion-test@example.com',
        password: 'TestPassword123!',
        name: 'GDPR Test User',
        status: 'active'
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        userId: testUser.id,
        type: 'access'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '15m',
        audience: 'plus-clair-users',
        issuer: 'plus-clair-app'
      }
    );

    // Create some user data
    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        amount: 50.0,
        category: 'alimentation',
        description: 'Test transaction'
      }
    });

    await prisma.betterAuthSession.create({
      data: {
        userId: testUser.id,
        sessionToken: 'test-session-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    await prisma.refreshToken.create({
      data: {
        userId: testUser.id,
        tokenHash: 'test-token-hash',
        jti: 'test-jti',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.betterAuthSession.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.dataProcessingLog.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });

  describe('DELETE /api/compliance/user/delete-account', () => {
    it('should anonymize user data instead of hard deletion', async () => {
      const response = await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify user data is anonymized
      const anonymizedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(anonymizedUser).toBeTruthy();
      expect(anonymizedUser.email).toMatch(/^deleted-.*@anonymized\.local$/);
      expect(anonymizedUser.password).toBe('DELETED');
      expect(anonymizedUser.name).toBe('Deleted User');
      expect(anonymizedUser.status).toBe('deleted');
      expect(anonymizedUser.emailVerified).toBe(false);
      expect(anonymizedUser.emailVerificationToken).toBeNull();
    });

    it('should delete all active sessions', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const sessions = await prisma.betterAuthSession.findMany({
        where: { userId: testUser.id }
      });

      expect(sessions.length).toBe(0);
    });

    it('should revoke all refresh tokens', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const tokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revoked: false }
      });

      expect(tokens.length).toBe(0);

      const revokedTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revoked: true }
      });

      expect(revokedTokens.length).toBeGreaterThan(0);
    });

    it('should create data processing log for deletion', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await prisma.dataProcessingLog.findMany({
        where: {
          userId: testUser.id,
          operation: 'DELETE',
          dataType: 'personal'
        }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].legalBasis).toBe('user_request');
      expect(logs[0].success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .expect(401);
    });

    it('should preserve transaction history for audit purposes', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Transactions should still exist (linked to anonymized user)
      const transactions = await prisma.transaction.findMany({
        where: { userId: testUser.id }
      });

      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should prevent future login with deleted account', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to login with deleted account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gdpr-deletion-test@example.com',
          password: 'TestPassword123!'
        });

      expect(loginResponse.status).toBe(401);
    });
  });

  describe('GDPR Compliance Verification', () => {
    it('should make personal data unrecoverable after deletion', async () => {
      const originalEmail = testUser.email;
      const originalName = testUser.name;

      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      // Verify no personal data remains
      expect(deletedUser.email).not.toBe(originalEmail);
      expect(deletedUser.name).not.toBe(originalName);
      expect(deletedUser.email).toContain('anonymized.local');
      expect(deletedUser.password).toBe('DELETED');
    });

    it('should maintain audit trail after deletion', async () => {
      await request(app)
        .delete('/api/compliance/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // User record should still exist (anonymized)
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(user).toBeTruthy();
      expect(user.status).toBe('deleted');

      // Processing log should exist
      const logs = await prisma.dataProcessingLog.findMany({
        where: { userId: testUser.id }
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
