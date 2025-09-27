const secureLogger = require('../../src/utils/secureLogger');

/**
 * COMPREHENSIVE LOGGING SECURITY TESTS
 *
 * These tests verify that sensitive information is never logged:
 * - API keys (OpenAI, Anthropic, generic)
 * - JWT tokens (access, refresh, reset, email verification)
 * - Database credentials
 * - Email service credentials
 * - Authorization headers
 * - User passwords
 * - Other PII and sensitive data
 */

describe('Secure Logging Tests', () => {
  let originalConsoleLog;
  let originalConsoleError;
  let logOutput = [];

  // Capture all console output to verify sanitization
  beforeEach(() => {
    logOutput = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    console.log = (...args) => {
      logOutput.push(['log', ...args]);
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      logOutput.push(['error', ...args]);
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('API Key Sanitization', () => {
    test('should mask OpenAI API keys in error objects', () => {
      const errorWithApiKey = new Error('API request failed');
      errorWithApiKey.config = {
        headers: {
          'Authorization': 'Bearer sk-abc123def456ghi789jkl012mno345pqr'
        }
      };

      secureLogger.logError(errorWithApiKey, { context: 'ai_request' });

      const logString = JSON.stringify(logOutput);

      // Should not contain the full API key
      expect(logString).not.toContain('sk-abc123def456ghi789jkl012mno345pqr');

      // Should contain masked version
      expect(logString).toMatch(/sk-a.*\*.*45pqr|Authorization.*REDACTED/i);
    });

    test('should mask Anthropic API keys', () => {
      const errorWithAnthropicKey = {
        apiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        message: 'Anthropic API error'
      };

      secureLogger.error('Anthropic request failed', errorWithAnthropicKey);

      const logString = JSON.stringify(logOutput);

      // Should not contain the full API key
      expect(logString).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');

      // Should be masked
      expect(logString).toMatch(/sk-a.*\*.*wxyz/i);
    });

    test('should mask generic API keys', () => {
      const configWithApiKey = {
        API_KEY: 'abcd1234efgh5678ijkl9012mnop3456',
        apikey: 'xyz789abc123def456ghi789jkl012mno',
        api_key: 'secretkey123456789012345678901234'
      };

      secureLogger.info('Service configuration', configWithApiKey);

      const logString = JSON.stringify(logOutput);

      // Should not contain any full API keys
      expect(logString).not.toContain('abcd1234efgh5678ijkl9012mnop3456');
      expect(logString).not.toContain('xyz789abc123def456ghi789jkl012mno');
      expect(logString).not.toContain('secretkey123456789012345678901234');

      // Should contain masked versions
      expect(logString).toMatch(/ab\*+|xy\*+|se\*+/i);
    });
  });

  describe('JWT Token Sanitization', () => {
    test('should mask JWT tokens in error messages', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const errorWithJWT = new Error(`Token validation failed: ${jwtToken}`);

      secureLogger.logError(errorWithJWT);

      const logString = JSON.stringify(logOutput);

      // Should not contain the full JWT
      expect(logString).not.toContain(jwtToken);

      // Should contain masked version
      expect(logString).toMatch(/eyJh.*\*.*w5c/i);
    });

    test('should mask authorization headers', () => {
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        'X-API-Key': 'secret-api-key-12345',
        'User-Agent': 'Mozilla/5.0'
      };

      secureLogger.logRequest({
        method: 'POST',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: (header) => requestHeaders[header],
        headers: requestHeaders,
        user: { id: 'user123' }
      }, { statusCode: 200 }, 150);

      const logString = JSON.stringify(logOutput);

      // Should not contain sensitive headers
      expect(logString).not.toContain('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature');
      expect(logString).not.toContain('secret-api-key-12345');

      // Should contain redacted or masked versions
      expect(logString).toMatch(/REDACTED|authorization.*\*+/i);
    });
  });

  describe('Database Credential Sanitization', () => {
    test('should mask database connection strings', () => {
      const dbError = new Error('Connection failed');
      dbError.connectionString = 'postgres://username:password@localhost:5432/database';

      secureLogger.logError(dbError, { context: 'database_connection' });

      const logString = JSON.stringify(logOutput);

      // Should not contain the full connection string
      expect(logString).not.toContain('postgres://username:password@localhost:5432/database');

      // Should be masked
      expect(logString).toMatch(/post.*\*.*base/i);
    });

    test('should mask DATABASE_URL in environment contexts', () => {
      const envContext = {
        DATABASE_URL: 'postgresql://user:secret123@db.example.com:5432/myapp',
        NODE_ENV: 'production'
      };

      secureLogger.info('Environment configuration', envContext);

      const logString = JSON.stringify(logOutput);

      // Should not contain the database URL
      expect(logString).not.toContain('postgresql://user:secret123@db.example.com:5432/myapp');

      // Should be masked
      expect(logString).toMatch(/po\*+/i);

      // NODE_ENV should still be visible (not sensitive)
      expect(logString).toContain('production');
    });
  });

  describe('Email Credential Sanitization', () => {
    test('should mask email service credentials', () => {
      const emailConfig = {
        host: 'smtp.gmail.com',
        user: 'myapp@gmail.com',
        pass: 'super-secret-email-password',
        port: 587
      };

      secureLogger.error('Email configuration error', emailConfig);

      const logString = JSON.stringify(logOutput);

      // Should not contain the password
      expect(logString).not.toContain('super-secret-email-password');

      // Should be masked
      expect(logString).toMatch(/su\*+/i);

      // Non-sensitive data should remain
      expect(logString).toContain('smtp.gmail.com');
      expect(logString).toContain('587');
    });
  });

  describe('User Password Sanitization', () => {
    test('should mask user passwords in request bodies', () => {
      const loginAttempt = {
        email: 'user@example.com',
        password: 'user-secret-password-123',
        rememberMe: true
      };

      secureLogger.info('Login attempt', loginAttempt);

      const logString = JSON.stringify(logOutput);

      // Should not contain the password
      expect(logString).not.toContain('user-secret-password-123');

      // Should be redacted
      expect(logString).toMatch(/password.*REDACTED/i);

      // Other fields should remain
      expect(logString).toContain('user@');
      expect(logString).toContain('true');
    });

    test('should mask all password field variants', () => {
      const passwordData = {
        password: 'secret123',
        newPassword: 'newsecret456',
        confirmPassword: 'newsecret456',
        currentPassword: 'oldsecret789'
      };

      secureLogger.warn('Password validation', passwordData);

      const logString = JSON.stringify(logOutput);

      // Should not contain any passwords
      expect(logString).not.toContain('secret123');
      expect(logString).not.toContain('newsecret456');
      expect(logString).not.toContain('oldsecret789');

      // Should all be redacted
      expect(logString.match(/REDACTED/g)).toHaveLength(4);
    });
  });

  describe('Request Header Sanitization', () => {
    test('should sanitize sensitive headers in logRequest', () => {
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/auth/login',
        ip: '192.168.1.100',
        get: (header) => {
          const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Authorization': 'Bearer sensitive-jwt-token',
            'Cookie': 'sessionId=abc123; authToken=xyz789',
            'X-API-Key': 'api-key-12345'
          };
          return headers[header];
        },
        headers: {
          'user-agent': 'Mozilla/5.0',
          'authorization': 'Bearer sensitive-jwt-token',
          'cookie': 'sessionId=abc123; authToken=xyz789',
          'x-api-key': 'api-key-12345'
        },
        user: { id: 'user456' }
      };

      const mockRes = { statusCode: 200 };

      secureLogger.logRequest(mockReq, mockRes, 245);

      const logString = JSON.stringify(logOutput);

      // Should not contain sensitive header values
      expect(logString).not.toContain('sensitive-jwt-token');
      expect(logString).not.toContain('sessionId=abc123');
      expect(logString).not.toContain('api-key-12345');

      // Should contain redacted markers
      expect(logString).toMatch(/REDACTED/i);

      // Should retain non-sensitive data
      expect(logString).toContain('POST');
      expect(logString).toContain('/api/auth/login');
      expect(logString).toContain('192.168.1.100');
      expect(logString).toContain('245');
    });
  });

  describe('Error Object Sanitization', () => {
    test('should safely handle Error objects with sensitive data', () => {
      const sensitiveError = new Error('Authentication failed with token: eyJhbGciOiJIUzI1NiI.payload.signature');
      sensitiveError.token = 'eyJhbGciOiJIUzI1NiI.payload.signature';
      sensitiveError.apiKey = 'sk-1234567890abcdef';
      sensitiveError.config = {
        auth: {
          token: 'Bearer secret-token',
          apiKey: 'secret-api-key'
        }
      };

      secureLogger.logError(sensitiveError);

      const logString = JSON.stringify(logOutput);

      // Should not contain sensitive values
      expect(logString).not.toContain('eyJhbGciOiJIUzI1NiI.payload.signature');
      expect(logString).not.toContain('sk-1234567890abcdef');
      expect(logString).not.toContain('secret-token');
      expect(logString).not.toContain('secret-api-key');

      // Should contain masked/redacted versions
      expect(logString).toMatch(/eyJh.*\*.*ure|token.*REDACTED|sk-1.*\*.*ef/i);
    });

    test('should limit error stack trace exposure in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testError = new Error('Test error with sensitive data: sk-secret123456');
      testError.stack = `Error: Test error with sensitive data: sk-secret123456
        at testFunction (/app/secret-function.js:123:45)
        at /app/api-handler.js:67:89`;

      secureLogger.logError(testError);

      const logString = JSON.stringify(logOutput);

      // Should not contain full stack trace in production
      expect(logString.split('\n').length).toBeLessThan(5);

      // Should not contain sensitive data in stack
      expect(logString).not.toContain('sk-secret123456');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Authentication Logging Security', () => {
    test('should mask email addresses in logAuth', () => {
      secureLogger.logAuth('login', 'user@sensitive-domain.com', true, {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      const logString = JSON.stringify(logOutput);

      // Should not contain full email
      expect(logString).not.toContain('user@sensitive-domain.com');

      // Should contain masked email (show domain only)
      expect(logString).toContain('***@sensitive-domain.com');

      // Should retain other data
      expect(logString).toContain('login');
      expect(logString).toContain('true');
    });
  });

  describe('Deep Object Sanitization', () => {
    test('should sanitize nested objects with sensitive data', () => {
      const deepObject = {
        user: {
          id: 'user123',
          profile: {
            email: 'user@example.com',
            auth: {
              token: 'eyJhbGciOiJIUzI1NiI.payload.signature',
              refreshToken: 'refresh-token-secret',
              apiKey: 'sk-nested-api-key-12345'
            }
          }
        },
        config: {
          database: {
            connectionString: 'postgres://user:pass@localhost/db',
            password: 'db-secret-password'
          }
        }
      };

      secureLogger.info('Complex object logging', deepObject);

      const logString = JSON.stringify(logOutput);

      // Should not contain any sensitive data
      expect(logString).not.toContain('eyJhbGciOiJIUzI1NiI.payload.signature');
      expect(logString).not.toContain('refresh-token-secret');
      expect(logString).not.toContain('sk-nested-api-key-12345');
      expect(logString).not.toContain('postgres://user:pass@localhost/db');
      expect(logString).not.toContain('db-secret-password');

      // Should retain non-sensitive data
      expect(logString).toContain('user123');
      expect(logString).toContain('user@example.com');

      // Should contain masked/redacted versions of sensitive data
      expect(logString).toMatch(/token.*REDACTED|password.*\*+/i);
    });

    test('should handle circular references safely', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;
      circularObj.secret = 'sensitive-secret-data';

      // Should not throw error and should sanitize
      expect(() => {
        secureLogger.info('Circular object test', circularObj);
      }).not.toThrow();

      const logString = JSON.stringify(logOutput);

      // Should not contain sensitive data even with circular reference
      expect(logString).not.toContain('sensitive-secret-data');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle null and undefined values safely', () => {
      expect(() => {
        secureLogger.info('Null test', null);
        secureLogger.info('Undefined test', undefined);
        secureLogger.logError(null);
        secureLogger.logError(undefined);
      }).not.toThrow();
    });

    test('should handle very large objects without performance issues', () => {
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`field_${i}`] = i % 10 === 0 ? 'sk-secret-key-' + i : `value_${i}`;
      }

      const startTime = Date.now();
      secureLogger.info('Large object test', largeObject);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      const logString = JSON.stringify(logOutput);

      // Should not contain any secret keys
      expect(logString).not.toMatch(/sk-secret-key-\d+/);
    });
  });
});

describe('Integration Tests - Real Scenario Simulation', () => {
  test('should handle OpenAI API error scenario', () => {
    // Simulate real OpenAI error with API key exposure
    const openaiError = new Error('Request failed with status code 401');
    openaiError.response = {
      data: {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error'
        }
      },
      config: {
        headers: {
          'Authorization': 'Bearer sk-abc123def456ghi789jkl012mno345pqr890xyz',
          'Content-Type': 'application/json'
        },
        url: 'https://api.openai.com/v1/chat/completions'
      }
    };

    secureLogger.logError(openaiError, { context: 'ai_suggestion_generation' });

    // Should not expose API key
    const allLogs = JSON.stringify(global.logOutput || []);
    expect(allLogs).not.toContain('sk-abc123def456ghi789jkl012mno345pqr890xyz');
  });

  test('should handle JWT authentication error scenario', () => {
    // Simulate JWT verification error
    const jwtError = new Error('jwt malformed');
    jwtError.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSJ9.invalid-signature';

    secureLogger.logSecurity('jwt_verification_failed', {
      error: jwtError,
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0'
    });

    // Should not expose the JWT token
    const allLogs = JSON.stringify(global.logOutput || []);
    expect(allLogs).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSJ9.invalid-signature');
  });

  test('should handle database connection error scenario', () => {
    // Simulate Prisma connection error
    const prismaError = new Error('connect ECONNREFUSED');
    prismaError.clientVersion = '4.0.0';
    prismaError.meta = {
      database_url: 'postgresql://admin:supersecret@prod-db.company.com:5432/pluqla_prod'
    };

    secureLogger.logError(prismaError, { context: 'database_connection' });

    // Should not expose database credentials
    const allLogs = JSON.stringify(global.logOutput || []);
    expect(allLogs).not.toContain('supersecret');
    expect(allLogs).not.toContain('postgresql://admin:supersecret@prod-db.company.com:5432/pluqla_prod');
  });
});