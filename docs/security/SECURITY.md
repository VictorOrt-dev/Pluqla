# Security Guidelines - Pluqla Backend

Comprehensive security guidelines for Pluqla's Better Auth implementation and overall system security.

## 🛡️ Security Overview

Pluqla implements defense-in-depth security with multiple layers of protection:

- **Authentication**: Better Auth with session-based security
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: End-to-end encryption for sensitive data
- **PII Sanitization**: AI endpoint data anonymization
- **Rate Limiting**: Tiered rate limiting by user role
- **Monitoring**: Comprehensive security logging and alerting

## 🔐 Authentication Security

### Session Management

**Secure Session Configuration**:
```javascript
// server/src/auth/betterAuth.js
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days max
    updateAge: 60 * 60 * 24,      // Update daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5              // 5 minute cache
    }
  },
  cookies: {
    sessionToken: {
      name: "better-auth.session-token",
      httpOnly: true,              // Prevent XSS
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: "strict",          // CSRF protection
      maxAge: 60 * 60 * 24 * 7    // 7 days
    }
  }
});
```

**Session Security Features**:
- ✅ Automatic session rotation every 24 hours
- ✅ Secure HTTP-only cookies
- ✅ Same-site strict policy
- ✅ HTTPS enforcement in production
- ✅ Session cleanup job removes expired sessions
- ✅ Maximum session lifetime (7 days)

### Password Security

**Password Requirements**:
```javascript
// Minimum password criteria
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,  // Optional but recommended
  maxLength: 128,
  preventCommonPasswords: true
};
```

**Password Storage**:
- ✅ Bcrypt hashing with salt rounds ≥12
- ✅ No plaintext password storage
- ✅ Password history prevention (last 5 passwords)
- ✅ Secure password reset flow with time-limited tokens

### Authentication Vulnerabilities Protection

**Brute Force Protection**:
```javascript
// Rate limiting for auth endpoints
const authRateLimit = {
  login: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    max: 5,                      // 5 attempts per IP
    skipSuccessfulRequests: true,
    standardHeaders: true
  },
  register: {
    windowMs: 60 * 60 * 1000,    // 1 hour
    max: 3,                      // 3 registrations per IP
    standardHeaders: true
  }
};
```

**Account Lockout Policy**:
- ✅ Account lockout after 5 failed attempts
- ✅ Progressive delay (exponential backoff)
- ✅ Admin override for account unlocking
- ✅ Automatic unlock after 30 minutes

## 🔑 Authorization & Access Control

### Role-Based Access Control (RBAC)

**Role Hierarchy**:
```typescript
enum UserRole {
  USER = 'user',        // Standard user access
  PREMIUM = 'premium',  // Premium features access
  ADMIN = 'admin'       // Full system access
}

interface RolePermissions {
  user: {
    ai: ['suggestions', 'categorize', 'insights'];
    transactions: ['read', 'create', 'update_own'];
    profile: ['read', 'update_own'];
  };
  premium: {
    ai: ['all_user_features', 'investment_analysis', 'portfolio_optimization'];
    transactions: ['all_user_features', 'export', 'advanced_analytics'];
    support: ['priority_support'];
  };
  admin: {
    ai: ['all_features', 'usage_stats', 'model_management'];
    users: ['read_all', 'update_roles', 'suspend', 'delete'];
    system: ['logs', 'settings', 'maintenance'];
  };
}
```

**Permission Enforcement**:
```javascript
// Middleware for role checking
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    const isPremium = req.user?.isPremium;

    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
      // Special case: premium features for premium users
      if (allowedRoles.includes('premium') && isPremium) {
        return next();
      }

      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};
```

### API Endpoint Protection

**Protection Levels**:
```javascript
// Public endpoints (no auth required)
app.use('/api/auth/*', publicRoutes);
app.use('/api/health', healthCheck);

// Protected endpoints (authentication required)
app.use('/api/ai-secure/*', protect, aiSecureRoutes);
app.use('/api/users/*', protect, userRoutes);
app.use('/api/transactions/*', protect, transactionRoutes);

// Premium endpoints (premium subscription required)
app.use('/api/ai-secure/analyze/*', protect, requirePremium, premiumAiRoutes);
app.use('/api/analytics/advanced/*', protect, requirePremium, analyticsRoutes);

// Admin endpoints (admin role required)
app.use('/api/admin/*', protect, requireAdmin, adminRoutes);
```

## 🔒 Data Protection

### Encryption Standards

**Encryption Keys Management**:
```env
# Required encryption keys (64 hex characters each)
FINANCIAL_ENCRYPTION_KEY="cd0d1761f682e3a0bb67e1a963f4791fd14dfa1596513e60431165148cec5444"
BANK_ENCRYPTION_KEY="862b02abd32adc3d9106d24ae2b9288518957468d9ce4513cae8e72aaf9b99f3"
BETTER_AUTH_SECRET="f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8"
SESSION_SECRET="your-session-secret-32-characters-minimum"
```

**Data Encryption Implementation**:
```javascript
// Financial data encryption
import crypto from 'crypto';

class DataEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
  }

  encrypt(data, encryptionKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, encryptionKey, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData, encryptionKey) {
    const { encrypted, iv, authTag } = encryptedData;
    const decipher = crypto.createDecipher(this.algorithm, encryptionKey, Buffer.from(iv, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
```

### PII Protection for AI Services

**Data Sanitization Pipeline**:
```javascript
// server/src/utils/piiSanitizer.js
class PIISanitizer {
  constructor() {
    this.patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+\d{1,3}[- ]?)?\d{10}/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
      names: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g // Simple name pattern
    };
  }

  sanitizeForAI(data, userId) {
    let sanitized = JSON.stringify(data);

    // Replace PII with anonymized tokens
    sanitized = sanitized.replace(this.patterns.email, `user_email_${this.hashUserId(userId)}`);
    sanitized = sanitized.replace(this.patterns.phone, `user_phone_${this.hashUserId(userId)}`);
    sanitized = sanitized.replace(this.patterns.names, `user_name_${this.hashUserId(userId)}`);

    // Remove any remaining sensitive patterns
    sanitized = sanitized.replace(this.patterns.ssn, '[SSN_REDACTED]');
    sanitized = sanitized.replace(this.patterns.creditCard, '[CARD_REDACTED]');

    return JSON.parse(sanitized);
  }

  hashUserId(userId) {
    const salt = process.env.AI_ANONYMIZATION_SALT || 'default-salt';
    return crypto.createHash('sha256').update(userId + salt).digest('hex').substring(0, 8);
  }
}
```

**AI Request Sanitization**:
```javascript
// Applied to all AI endpoint requests
app.use('/api/ai-secure/*', (req, res, next) => {
  const sanitizer = new PIISanitizer();

  // Sanitize request body
  if (req.body) {
    req.sanitizedBody = sanitizer.sanitizeForAI(req.body, req.user.id);
  }

  // Log sanitization for audit
  logger.info('AI request sanitized', {
    userId: req.user.id,
    endpoint: req.path,
    originalSize: JSON.stringify(req.body).length,
    sanitizedSize: JSON.stringify(req.sanitizedBody).length
  });

  next();
});
```

## 🚨 Security Monitoring

### Security Logging

**Comprehensive Audit Trail**:
```javascript
// server/src/utils/securityLogger.js
class SecurityLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/security.log' }),
        new winston.transports.Console({ level: 'warn' })
      ]
    });
  }

  logAuthEvent(event, userId, details = {}) {
    this.logger.info('Authentication Event', {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      success: details.success,
      reason: details.reason
    });
  }

  logPermissionDenied(userId, resource, action, details = {}) {
    this.logger.warn('Permission Denied', {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      requiredRole: details.requiredRole,
      userRole: details.userRole
    });
  }

  logSuspiciousActivity(userId, activity, details = {}) {
    this.logger.error('Suspicious Activity', {
      userId,
      activity,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'medium',
      details
    });
  }
}
```

**Security Events to Monitor**:
- ✅ Failed login attempts
- ✅ Permission denied events
- ✅ Unusual API usage patterns
- ✅ Multiple sessions from different IPs
- ✅ AI endpoint PII detection attempts
- ✅ Admin privilege usage
- ✅ Session token manipulation attempts

### Threat Detection

**Automated Security Alerts**:
```javascript
// server/src/security/threatDetection.js
class ThreatDetection {
  constructor() {
    this.suspiciousPatterns = {
      rapidRequests: { threshold: 100, window: 60000 }, // 100 req/min
      multipleFailedLogins: { threshold: 5, window: 300000 }, // 5 failures/5min
      unusualGeoLocation: { enabled: true },
      apiAbusePatterns: { enabled: true }
    };
  }

  async detectThreats(userId, activity) {
    const threats = [];

    // Check for rapid API requests
    const recentRequests = await this.getRecentRequests(userId, this.suspiciousPatterns.rapidRequests.window);
    if (recentRequests.length > this.suspiciousPatterns.rapidRequests.threshold) {
      threats.push({
        type: 'rapid_requests',
        severity: 'high',
        details: { requestCount: recentRequests.length }
      });
    }

    // Check for multiple failed logins
    const failedLogins = await this.getFailedLogins(userId, this.suspiciousPatterns.multipleFailedLogins.window);
    if (failedLogins.length > this.suspiciousPatterns.multipleFailedLogins.threshold) {
      threats.push({
        type: 'brute_force_attempt',
        severity: 'critical',
        details: { failureCount: failedLogins.length }
      });
    }

    return threats;
  }

  async handleThreat(threat, userId) {
    switch (threat.severity) {
      case 'critical':
        await this.suspendUser(userId, '24h');
        await this.notifyAdmins(threat);
        break;
      case 'high':
        await this.rateLimitUser(userId, '1h');
        await this.alertSecurity(threat);
        break;
      case 'medium':
        await this.logSuspiciousActivity(threat);
        break;
    }
  }
}
```

## 🔧 Security Configuration

### Environment Security

**Production Environment Variables**:
```env
# Core Security Settings
NODE_ENV=production
TRUST_PROXY=true

# Database Security
DATABASE_URL="postgresql://pluqla_user:secure_db_password@db.internal:5432/pluqla_prod?sslmode=require"
DB_SSL_MODE=require

# HTTPS and Security Headers
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000
CORS_ORIGIN="https://app.pluqla.com"

# Session Security
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict

# Rate Limiting
ENABLE_RATE_LIMITING=true
RATE_LIMIT_STRICT_MODE=true

# Security Monitoring
ENABLE_SECURITY_LOGGING=true
ALERT_WEBHOOK_URL="https://alerts.pluqla.com/webhook"
```

### Security Headers

**Express Security Middleware**:
```javascript
// server/src/middleware/security.js
import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // CORS configuration
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }),

  // Additional security headers
  (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  }
];
```

## 🛠️ Security Testing

### Automated Security Tests

**Authentication Security Tests**:
```javascript
// server/tests/security/auth.test.js
describe('Authentication Security', () => {
  describe('Session Security', () => {
    it('should set secure session cookies in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({ email: 'test@example.com', password: 'secure123' });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Secure');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should prevent session fixation attacks', async () => {
      const oldSessionId = 'fixed_session_id';

      const response = await request(app)
        .post('/api/auth/sign-in')
        .set('Cookie', `better-auth.session-token=${oldSessionId}`)
        .send({ email: 'test@example.com', password: 'secure123' });

      const newCookies = response.headers['set-cookie'];
      const newSessionId = extractSessionId(newCookies);

      expect(newSessionId).not.toBe(oldSessionId);
    });
  });

  describe('Brute Force Protection', () => {
    it('should rate limit login attempts', async () => {
      const email = 'test@example.com';

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/sign-in')
          .send({ email, password: 'wrong_password' });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({ email, password: 'wrong_password' });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('rate limit');
    });
  });
});
```

**PII Protection Tests**:
```javascript
// server/tests/security/piiProtection.test.js
describe('PII Protection', () => {
  it('should sanitize email addresses in AI requests', async () => {
    const { sessionToken } = await createTestUser({
      email: 'john.doe@example.com'
    });

    const spy = jest.spyOn(aiService, 'getSuggestions');

    await request(app)
      .post('/api/ai-secure/suggestions')
      .set('Cookie', `better-auth.session-token=${sessionToken}`)
      .send({
        description: 'Payment to john.doe@example.com',
        amount: 100
      });

    const aiRequest = spy.mock.calls[0][0];
    expect(aiRequest).not.toContain('john.doe@example.com');
    expect(aiRequest).toMatch(/user_email_[a-f0-9]{8}/);
  });

  it('should sanitize phone numbers in AI requests', async () => {
    const { sessionToken } = await createTestUser();

    const spy = jest.spyOn(aiService, 'getSuggestions');

    await request(app)
      .post('/api/ai-secure/suggestions')
      .set('Cookie', `better-auth.session-token=${sessionToken}`)
      .send({
        description: 'Call 555-123-4567 for support',
        amount: 50
      });

    const aiRequest = spy.mock.calls[0][0];
    expect(aiRequest).not.toContain('555-123-4567');
    expect(aiRequest).toMatch(/user_phone_[a-f0-9]{8}/);
  });
});
```

### Penetration Testing Checklist

**Manual Security Testing**:
- [ ] **Authentication bypass attempts**
  - Invalid session tokens
  - Expired session tokens
  - Session token manipulation
  - JWT signature bypass (legacy endpoints)

- [ ] **Authorization bypass attempts**
  - Role escalation attempts
  - Resource access without permission
  - Premium feature access without subscription
  - Admin endpoint access as regular user

- [ ] **Input validation testing**
  - SQL injection attempts
  - XSS payload injection
  - Command injection attempts
  - Path traversal attempts

- [ ] **Session management testing**
  - Session fixation attacks
  - Session hijacking attempts
  - Concurrent session handling
  - Session timeout validation

- [ ] **Rate limiting validation**
  - Bypass attempts using different IPs
  - Bypass attempts using different user agents
  - API endpoint abuse testing
  - Distributed request testing

## 🚨 Incident Response

### Security Incident Categories

**Critical Incidents (Immediate Response)**:
- Unauthorized access to admin functions
- Data breach or PII exposure
- System compromise or malware
- DDoS attacks
- Mass account takeover

**High Priority Incidents (4-hour Response)**:
- Authentication bypass
- Privilege escalation
- Suspicious admin activity
- Multiple failed security validations

**Medium Priority Incidents (24-hour Response)**:
- Rate limiting bypasses
- Unusual user behavior patterns
- Failed authentication spikes

### Incident Response Procedure

**Immediate Actions** (0-30 minutes):
1. **Assess severity** and classify incident
2. **Isolate affected systems** if necessary
3. **Notify security team** via emergency contacts
4. **Document initial findings** and timeline

**Investigation Phase** (30 minutes - 4 hours):
1. **Collect logs** and forensic evidence
2. **Identify attack vectors** and entry points
3. **Assess data exposure** and user impact
4. **Implement temporary mitigations**

**Containment Phase** (4-24 hours):
1. **Patch vulnerabilities** or security gaps
2. **Reset compromised credentials**
3. **Update security rules** and monitoring
4. **Notify affected users** if required

**Recovery Phase** (24-72 hours):
1. **Restore normal operations**
2. **Implement additional monitoring**
3. **Update security documentation**
4. **Conduct post-incident review**

### Emergency Contacts

```yaml
Security Team:
  Primary: security@pluqla.com
  Phone: +1-XXX-XXX-XXXX (24/7)

Legal/Compliance:
  Email: legal@pluqla.com
  Phone: +1-XXX-XXX-XXXX

External Services:
  Cloud Provider: AWS Support
  Security Vendor: [If applicable]
  Law Enforcement: [Local FBI field office]
```

## 📋 Security Compliance

### Regular Security Tasks

**Daily Tasks**:
- [ ] Review security logs for anomalies
- [ ] Monitor failed authentication attempts
- [ ] Check system resource usage
- [ ] Verify backup integrity

**Weekly Tasks**:
- [ ] Security patch assessment
- [ ] User access review
- [ ] Rate limiting effectiveness review
- [ ] Threat intelligence updates

**Monthly Tasks**:
- [ ] Security configuration audit
- [ ] Penetration testing (automated)
- [ ] User permission cleanup
- [ ] Security training updates

**Quarterly Tasks**:
- [ ] Full security audit
- [ ] Incident response drill
- [ ] Security policy review
- [ ] Third-party security assessment

### Compliance Requirements

**Data Protection**:
- ✅ GDPR compliance for EU users
- ✅ CCPA compliance for California users
- ✅ SOC 2 Type II controls
- ✅ PCI DSS for payment data

**Security Standards**:
- ✅ OWASP Top 10 protection
- ✅ NIST Cybersecurity Framework
- ✅ ISO 27001 controls
- ✅ Industry best practices

## 📚 Additional Resources

- [Authentication Implementation](./AUTH.md)
- [API Security Reference](./API.md)
- [Deployment Security](./DEPLOYMENT.md)
- [Security Testing Procedures](./TESTS.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Better Auth Security Guide](https://better-auth.com/docs/security)

---

**Last Updated**: December 2024 | **Version**: 2.0.0 | **Security Level**: Enterprise