/**
 * JWT Manager Unit Tests
 *
 * Tests JWT signing, verification, rotation, and revocation
 */

const crypto = require('crypto');

// Mock environment before importing jwtManager
process.env.JWT_SECRETS = [
  crypto.randomBytes(32).toString('hex'),
  crypto.randomBytes(32).toString('hex')
].join(',');
process.env.JWT_ISSUER = 'test-issuer';
process.env.JWT_AUDIENCE = 'test-audience';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_GRACE_PERIOD_HOURS = '24';

const jwtManager = require('../src/lib/jwtManager');

describe('JWT Manager', () => {
  describe('Initialization', () => {
    it('should initialize with valid secrets', () => {
      const stats = jwtManager.getStats();
      expect(stats.activeSecrets).toBeGreaterThanOrEqual(2);
      expect(stats.algorithm).toBe('HS256');
      expect(stats.allowedAlgorithms).toContain('HS256');
    });

    it('should validate secret length requirements', () => {
      expect(jwtManager.MIN_SECRET_LENGTH).toBe(32);
      expect(jwtManager.JWT_SECRETS_COUNT).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Token Signing', () => {
    it('should sign a valid token with required claims', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should automatically add JTI to token', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const decoded = jwtManager.decodeToken(token);

      expect(decoded.jti).toBeDefined();
      expect(decoded.jti).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should include standard JWT claims', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const decoded = jwtManager.decodeToken(token);

      expect(decoded.iss).toBe('test-issuer');
      expect(decoded.aud).toBe('test-audience');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should allow custom expiration', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload, { expiresIn: '1h' });
      const decoded = jwtManager.decodeToken(token);

      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(3600); // 1 hour in seconds
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid token signed with primary secret', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const verified = jwtManager.verifyToken(token);

      expect(verified.userId).toBe('test-user-123');
      expect(verified.type).toBe('access');
      expect(verified.jti).toBeDefined();
    });

    it('should reject token with invalid signature', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const tamperedToken = token.slice(0, -10) + 'tampered123';

      expect(() => {
        jwtManager.verifyToken(tamperedToken);
      }).toThrow();
    });

    it('should reject token with wrong issuer', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);

      expect(() => {
        jwtManager.verifyToken(token, { issuer: 'wrong-issuer' });
      }).toThrow();
    });

    it('should reject token with wrong audience', () => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);

      expect(() => {
        jwtManager.verifyToken(token, { audience: 'wrong-audience' });
      }).toThrow();
    });

    it('should reject expired token', (done) => {
      const payload = {
        userId: 'test-user-123',
        type: 'access'
      };

      const token = jwtManager.signToken(payload, { expiresIn: '1ms' });

      setTimeout(() => {
        expect(() => {
          jwtManager.verifyToken(token);
        }).toThrow(/expired/i);
        done();
      }, 100);
    }, 10000);

    it('should reject token without required userId claim', () => {
      const payload = {
        type: 'access'
        // Missing userId
      };

      const token = jwtManager.signToken(payload);

      expect(() => {
        jwtManager.verifyToken(token);
      }).toThrow(/userId/i);
    });
  });

  describe('Key Rotation', () => {
    it('should accept tokens signed with rotated (previous) secret', () => {
      // Create a test with fresh secrets to avoid interference
      const oldSecret = crypto.randomBytes(32).toString('hex');
      const newSecret = crypto.randomBytes(32).toString('hex');

      // Temporarily override secrets
      const originalSecretsCount = jwtManager.JWT_SECRETS_COUNT;

      // Sign with "old" secret (simulate token signed before rotation)
      const payload = {
        userId: 'test-user-rotation',
        type: 'access'
      };

      // We'll use the current second secret as our "old" token
      const token = jwtManager.signToken(payload);

      // Now rotate to add a new secret
      jwtManager.rotateSecret(newSecret);

      // Token should still verify with old secret (now secondary)
      const verified = jwtManager.verifyToken(token);
      expect(verified.userId).toBe('test-user-rotation');

      // Stats should show increased secret count
      const stats = jwtManager.getStats();
      expect(stats.activeSecrets).toBeGreaterThan(originalSecretsCount);
    });

    it('should use new secret for signing after rotation', () => {
      const initialStats = jwtManager.getStats();
      const initialSecretCount = initialStats.activeSecrets;

      const newSecret = crypto.randomBytes(32).toString('hex');
      jwtManager.rotateSecret(newSecret);

      const payload = {
        userId: 'test-user-new-secret',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const verified = jwtManager.verifyToken(token);

      expect(verified.userId).toBe('test-user-new-secret');

      const newStats = jwtManager.getStats();
      expect(newStats.activeSecrets).toBe(initialSecretCount + 1);
    });

    it('should generate valid secrets', () => {
      const secret = jwtManager.generateSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
    });

    it('should reject rotation with too short secret', () => {
      const shortSecret = crypto.randomBytes(16).toString('hex'); // Only 16 bytes

      expect(() => {
        jwtManager.rotateSecret(shortSecret);
      }).toThrow(/too short/i);
    });

    it('should maintain grace period limits', () => {
      // Rotate multiple times
      for (let i = 0; i < 5; i++) {
        const newSecret = crypto.randomBytes(32).toString('hex');
        jwtManager.rotateSecret(newSecret);
      }

      const stats = jwtManager.getStats();
      // Should not exceed max secrets (gracePeriod/24 hours + buffer)
      expect(stats.activeSecrets).toBeLessThanOrEqual(10);
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a token by JTI', () => {
      const payload = {
        userId: 'test-user-revoke',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const decoded = jwtManager.decodeToken(token);

      // Revoke token
      jwtManager.revokeToken(decoded.jti, decoded.exp * 1000);

      // Token should now be rejected
      expect(() => {
        jwtManager.verifyToken(token);
      }).toThrow(/revoked/i);
    });

    it('should check if token is revoked', () => {
      const jti = 'test-jti-' + crypto.randomBytes(8).toString('hex');

      expect(jwtManager.isTokenRevoked(jti)).toBe(false);

      jwtManager.revokeToken(jti, Date.now() + 3600000);

      expect(jwtManager.isTokenRevoked(jti)).toBe(true);
    });

    it('should track revoked tokens in statistics', () => {
      const initialStats = jwtManager.getStats();
      const initialRevokedCount = initialStats.revokedTokensInMemory;

      const jti = 'test-jti-stats-' + crypto.randomBytes(8).toString('hex');
      jwtManager.revokeToken(jti, Date.now() + 3600000);

      const newStats = jwtManager.getStats();
      expect(newStats.revokedTokensInMemory).toBe(initialRevokedCount + 1);
    });
  });

  describe('Security Features', () => {
    it('should only allow HS256 and RS256 algorithms', () => {
      const stats = jwtManager.getStats();
      expect(stats.allowedAlgorithms).toEqual(['HS256', 'RS256']);
    });

    it('should reject none algorithm tokens', () => {
      // Create a fake token with 'none' algorithm
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        userId: 'attacker',
        iss: 'test-issuer',
        aud: 'test-audience'
      })).toString('base64url');
      const signature = '';
      const noneToken = `${header}.${payload}.${signature}`;

      expect(() => {
        jwtManager.verifyToken(noneToken);
      }).toThrow();
    });

    it('should perform constant-time comparison', () => {
      const secret1 = 'test-secret-123';
      const secret2 = 'test-secret-123';
      const secret3 = 'different-secret';

      expect(jwtManager.constantTimeCompare(secret1, secret2)).toBe(true);
      expect(jwtManager.constantTimeCompare(secret1, secret3)).toBe(false);
    });

    it('should handle invalid token formats gracefully', () => {
      expect(() => jwtManager.verifyToken('')).toThrow();
      expect(() => jwtManager.verifyToken('not.a.token')).toThrow();
      expect(() => jwtManager.verifyToken(null)).toThrow();
      expect(() => jwtManager.verifyToken(undefined)).toThrow();
      expect(() => jwtManager.verifyToken(123)).toThrow();
    });
  });

  describe('Token Decoding', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: 'test-user-decode',
        type: 'access',
        customClaim: 'test-value'
      };

      const token = jwtManager.signToken(payload);
      const decoded = jwtManager.decodeToken(token);

      expect(decoded.userId).toBe('test-user-decode');
      expect(decoded.customClaim).toBe('test-value');
    });

    it('should decode token header', () => {
      const payload = {
        userId: 'test-user-header',
        type: 'access'
      };

      const token = jwtManager.signToken(payload);
      const header = jwtManager.decodeTokenHeader(token);

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive stats', () => {
      const stats = jwtManager.getStats();

      expect(stats).toHaveProperty('activeSecrets');
      expect(stats).toHaveProperty('revokedTokensInMemory');
      expect(stats).toHaveProperty('revokedTokensCacheSize');
      expect(stats).toHaveProperty('gracePeriodHours');
      expect(stats).toHaveProperty('algorithm');
      expect(stats).toHaveProperty('allowedAlgorithms');
      expect(stats).toHaveProperty('expiresIn');

      expect(typeof stats.activeSecrets).toBe('number');
      expect(typeof stats.gracePeriodHours).toBe('number');
      expect(stats.algorithm).toBe('HS256');
    });
  });
});
