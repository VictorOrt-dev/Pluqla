# 🛡️ Financial Rate Limiting Documentation

**Production-grade rate limiting middleware for financial APIs with subscription tier support**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Subscription Tiers](#subscription-tiers)
4. [Implementation](#implementation)
5. [Configuration](#configuration)
6. [Security Features](#security-features)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Financial Rate Limiting middleware provides enterprise-grade protection for financial APIs with subscription-aware rate limiting, multi-dimensional protection, and advanced security features.

### Key Features

- ✅ **Subscription Tier Support** - Different limits for free, premium, and enterprise users
- ✅ **Multi-dimensional Limiting** - Rate limiting by user ID, IP address, and API key combinations
- ✅ **Burst Protection** - Token bucket algorithm for handling traffic spikes
- ✅ **Progressive Backoff** - Increasing penalties for repeated violations
- ✅ **Redis Integration** - Distributed rate limiting support
- ✅ **Security-First Design** - Protection against bypass attempts and information disclosure
- ✅ **Comprehensive Monitoring** - Detailed logging and health checks

### Financial Operation Types

The system supports rate limiting for different types of financial operations:

- **Transactions** - Creating, updating, and querying financial transactions
- **Payments** - Processing payments and money transfers
- **Subscriptions** - Managing user subscriptions and billing
- **Reports** - Generating financial reports and analytics
- **API Calls** - General API operations and data retrieval

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Financial Rate Limiting                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Subscription  │  │ Multi-dimensional │  │   Progressive   │  │
│  │   Tier Config   │  │   Key Generator   │  │    Backoff      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Token Bucket    │  │   Redis Store   │  │   Monitoring    │  │
│  │ Burst Control   │  │   (Optional)    │  │   & Logging     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Request → Authentication → Subscription Detection → Rate Limit Check →
  ↓
Allow/Block → Logging → Response Headers → Continue/Block
```

---

## Subscription Tiers

### Free Tier
```javascript
{
  transactions: { requests: 10, window: 15 * 60 * 1000, burst: 2 },
  payments: { requests: 3, window: 60 * 60 * 1000, burst: 1 },
  subscriptions: { requests: 2, window: 24 * 60 * 60 * 1000, burst: 0 },
  reports: { requests: 5, window: 60 * 60 * 1000, burst: 1 },
  apiCalls: { requests: 50, window: 15 * 60 * 1000, burst: 5 }
}
```

### Premium Tier
```javascript
{
  transactions: { requests: 200, window: 15 * 60 * 1000, burst: 50 },
  payments: { requests: 50, window: 60 * 60 * 1000, burst: 10 },
  subscriptions: { requests: 20, window: 24 * 60 * 60 * 1000, burst: 5 },
  reports: { requests: 100, window: 60 * 60 * 1000, burst: 20 },
  apiCalls: { requests: 1000, window: 15 * 60 * 1000, burst: 100 }
}
```

### Enterprise Tier
```javascript
{
  transactions: { requests: 1000, window: 15 * 60 * 1000, burst: 200 },
  payments: { requests: 200, window: 60 * 60 * 1000, burst: 50 },
  subscriptions: { requests: 100, window: 24 * 60 * 60 * 1000, burst: 20 },
  reports: { requests: 500, window: 60 * 60 * 1000, burst: 100 },
  apiCalls: { requests: 5000, window: 15 * 60 * 1000, burst: 500 }
}
```

---

## Implementation

### Basic Usage

```javascript
const rateLimit = require('../middleware/rateLimit');

// Apply to transaction endpoints
router.post('/transactions',
  rateLimit.financial.transactions,
  transactionController.create
);

// Apply to payment endpoints
router.post('/payments',
  rateLimit.financial.payments,
  paymentController.process
);
```

### Advanced Configuration

```javascript
const { createFinancialRateLimit } = require('../middleware/financialRateLimit');

const customLimiter = createFinancialRateLimit({
  operationType: 'custom_operation',
  limits: {
    free: { requests: 5, window: 60000, burst: 1 },
    premium: { requests: 20, window: 60000, burst: 5 }
  },
  keyGenerator: (req) => `${req.user.id}:${req.ip}`,
  enableProgressiveBackoff: true,
  enableBurstProtection: true
});
```

### Multi-dimensional Limiting

```javascript
// Rate limit by user + IP + operation
const multiDimensionalLimiter = createFinancialRateLimit({
  operationType: 'sensitive_operation',
  keyGenerator: (req) => {
    const userKey = req.user?.id || 'anonymous';
    const ipKey = req.ip || 'unknown';
    const operationKey = req.path || 'generic';
    return `${userKey}:${ipKey}:${operationKey}`;
  }
});
```

---

## Configuration

### Environment Variables

```bash
# Rate limiting configuration
RATE_LIMIT_REDIS_URL=redis://localhost:6379
RATE_LIMIT_PREFIX=pluqla:ratelimit
RATE_LIMIT_DEFAULT_TIER=free

# Progressive backoff settings
RATE_LIMIT_BACKOFF_ENABLED=true
RATE_LIMIT_BACKOFF_MULTIPLIER=2
RATE_LIMIT_MAX_BACKOFF=300000

# Development settings
NODE_ENV=development
RATE_LIMIT_DEV_MULTIPLIER=10
```

### Custom Limits Configuration

```javascript
// backend/config/rateLimits.js
module.exports = {
  customOperations: {
    'account_creation': {
      free: { requests: 1, window: 24 * 60 * 60 * 1000, burst: 0 },
      premium: { requests: 5, window: 24 * 60 * 60 * 1000, burst: 1 }
    },
    'bulk_import': {
      free: { requests: 0, window: 60000, burst: 0 }, // Not allowed
      premium: { requests: 1, window: 60 * 60 * 1000, burst: 0 },
      enterprise: { requests: 10, window: 60 * 60 * 1000, burst: 2 }
    }
  }
};
```

---

## Security Features

### Attack Prevention

#### 1. Brute Force Protection
```javascript
// Automatically enabled for authentication endpoints
router.post('/auth/login',
  rateLimit.financial.payments, // Strict limits for auth
  authController.login
);
```

#### 2. Subscription Bypass Prevention
```javascript
// Rate limits are enforced based on JWT token subscription data
// Cannot be bypassed by modifying headers or query parameters
```

#### 3. Information Disclosure Prevention
```javascript
// Rate limit responses never expose:
// - User IDs
// - Internal keys
// - IP addresses
// - Redis keys
// - Internal state
```

#### 4. Resource Exhaustion Protection
```javascript
// Built-in protections:
// - Memory usage monitoring
// - Request size limits
// - Concurrent request throttling
// - Key cleanup and expiration
```

### Security Headers

Rate limited responses include security headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: financial-grade
Retry-After: 900
```

---

## API Reference

### createFinancialRateLimit(options)

Creates a new financial rate limiter middleware.

**Parameters:**
- `operationType` (string) - Type of operation (transactions, payments, etc.)
- `limits` (object) - Custom limits per subscription tier
- `keyGenerator` (function) - Custom key generation function
- `enableBurstProtection` (boolean) - Enable burst protection
- `enableProgressiveBackoff` (boolean) - Enable progressive backoff
- `redisClient` (object) - Redis client for distributed limiting

**Returns:** Express middleware function

**Example:**
```javascript
const limiter = createFinancialRateLimit({
  operationType: 'high_value_transactions',
  limits: {
    free: { requests: 1, window: 60000, burst: 0 },
    premium: { requests: 5, window: 60000, burst: 1 }
  },
  enableProgressiveBackoff: true
});
```

### getRateLimitConfig(tier, operationType)

Gets rate limit configuration for a specific tier and operation.

**Parameters:**
- `tier` (string) - Subscription tier (free, premium, enterprise)
- `operationType` (string) - Operation type

**Returns:** Configuration object with requests, window, and burst properties

### getUserSubscriptionTier(user)

Determines user's subscription tier from user object.

**Parameters:**
- `user` (object) - User object with subscription information

**Returns:** String representing the tier (free, premium, enterprise)

### healthCheck()

Returns health status of the rate limiting system.

**Returns:** Object with status, timestamp, and configuration information

---

## Testing

### Running Tests

```bash
# Run all rate limiting tests
npm test -- tests/unit/middleware/financialRateLimit.test.js
npm test -- tests/integration/financialRateLimitIntegration.test.js

# Run performance tests
npm test -- tests/performance/rateLimitPerformance.test.js

# Run security tests
npm test -- tests/security/rateLimitSecurityTests.test.js
```

### Test Coverage

The test suite covers:
- ✅ Subscription tier enforcement
- ✅ Multi-dimensional rate limiting
- ✅ Burst protection and progressive backoff
- ✅ Security attack prevention
- ✅ Performance under load
- ✅ Memory usage and resource management
- ✅ Race condition handling
- ✅ Error handling and edge cases

### Test Configuration

```javascript
// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_TEST_MODE = 'true';
process.env.RATE_LIMIT_WINDOW_MS = '5000'; // Faster testing
```

---

## Monitoring

### Health Monitoring

```javascript
const healthStatus = financialRateLimit.healthCheck();
console.log('Rate Limiting Health:', healthStatus);

// Example output:
// {
//   status: 'healthy',
//   timestamp: '2024-01-15T10:30:00.000Z',
//   limits: {...},
//   redis: { connected: true },
//   performance: { avgResponseTime: 45 }
// }
```

### Logging and Alerts

```javascript
// Rate limit violations are logged with context
logger.warn('Rate limit exceeded', {
  userId: req.user?.id,
  ip: req.ip,
  operationType: 'transactions',
  tier: 'free',
  limit: 10,
  current: 11,
  window: 900000
});
```

### Metrics Collection

```javascript
// Key metrics to monitor:
// - Rate limit hit rate by tier
// - Average response time impact
// - Memory usage trends
// - Redis performance (if used)
// - False positive rate
```

### Dashboard Integration

```javascript
// Export metrics for dashboard
app.get('/api/admin/rate-limit-metrics', adminAuth, (req, res) => {
  const metrics = {
    hitRates: getRateLimitHitRates(),
    performance: getPerformanceMetrics(),
    health: financialRateLimit.healthCheck()
  };
  res.json(metrics);
});
```

---

## Troubleshooting

### Common Issues

#### 1. High Rate Limit Hit Rate

**Symptoms:** Many legitimate users getting rate limited

**Solutions:**
- Review subscription tier limits
- Check for bot traffic
- Analyze usage patterns
- Consider increasing limits for specific operations

```javascript
// Temporarily increase limits
const emergencyLimits = {
  free: { requests: 20, window: 15 * 60 * 1000, burst: 5 }
};
```

#### 2. Memory Usage Growth

**Symptoms:** Increasing memory usage over time

**Solutions:**
- Enable Redis for distributed storage
- Check key expiration settings
- Review key generation patterns

```javascript
// Enable Redis
const redisClient = createClient({ url: process.env.REDIS_URL });
const limiter = createFinancialRateLimit({
  redisClient,
  // other options...
});
```

#### 3. Performance Impact

**Symptoms:** API responses slower than expected

**Solutions:**
- Profile rate limiting overhead
- Optimize key generation
- Use Redis for better performance
- Consider caching rate limit decisions

#### 4. False Positives

**Symptoms:** Legitimate requests being blocked

**Solutions:**
- Review key generation logic
- Check for shared IP addresses (corporate networks)
- Analyze user behavior patterns
- Implement whitelisting for trusted sources

### Debug Mode

```bash
# Enable debug logging
DEBUG=rate-limit* npm start

# Test specific endpoints
curl -H "Authorization: Bearer $TOKEN" \
  -H "X-Debug-Rate-Limit: true" \
  http://localhost:3004/api/transactions
```

### Performance Tuning

```javascript
// Optimize for high traffic
const optimizedLimiter = createFinancialRateLimit({
  operationType: 'high_traffic_endpoint',

  // Use efficient key generation
  keyGenerator: (req) => req.user?.id || req.ip,

  // Enable Redis for better performance
  redisClient: redisClient,

  // Optimize window size
  limits: {
    free: { requests: 100, window: 60000, burst: 10 }
  }
});
```

### Emergency Procedures

#### Rate Limit Bypass (Emergency Only)

```javascript
// Emergency bypass for critical issues
if (process.env.RATE_LIMIT_EMERGENCY_BYPASS === 'true') {
  console.warn('EMERGENCY: Rate limiting bypassed');
  return next(); // Skip rate limiting
}
```

#### Circuit Breaker Pattern

```javascript
let rateLimitFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 10;

// If rate limiting fails repeatedly, temporarily disable
if (rateLimitFailures > CIRCUIT_BREAKER_THRESHOLD) {
  console.error('Rate limiting circuit breaker triggered');
  return next(); // Allow requests through
}
```

---

## Best Practices

### Implementation Guidelines

1. **Always authenticate first** - Rate limiting should come after authentication
2. **Use appropriate operation types** - Match limits to operation sensitivity
3. **Monitor and adjust** - Regularly review limits based on usage patterns
4. **Test thoroughly** - Include rate limiting in integration tests
5. **Plan for scale** - Use Redis for production deployments

### Security Considerations

1. **Never expose internal keys** - Rate limit responses should not leak sensitive information
2. **Validate subscription data** - Always verify subscription tier from trusted source (JWT)
3. **Log security events** - Monitor for bypass attempts and suspicious patterns
4. **Regular security reviews** - Audit rate limiting configuration and code

### Performance Optimization

1. **Use Redis in production** - In-memory storage doesn't scale across instances
2. **Optimize key generation** - Avoid complex string operations in key generation
3. **Monitor memory usage** - Track memory usage in production
4. **Cache subscription data** - Avoid repeated database queries for subscription tiers

---

## Integration Examples

### Express.js Integration

```javascript
const express = require('express');
const rateLimit = require('./middleware/rateLimit');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Apply rate limiting to financial endpoints
app.use('/api/transactions',
  authenticateToken,
  rateLimit.financial.transactions
);

app.use('/api/payments',
  authenticateToken,
  rateLimit.financial.payments
);

app.use('/api/financial/reports',
  authenticateToken,
  rateLimit.financial.reports
);
```

### Custom Middleware Stack

```javascript
// Custom middleware with rate limiting
const financialMiddleware = [
  authenticateToken,
  validateFinancialInput,
  rateLimit.financial.transactions,
  auditLogger,
  transactionController.create
];

router.post('/transactions', ...financialMiddleware);
```

### Subscription-Aware Endpoints

```javascript
// Different endpoints for different tiers
router.get('/api/reports/basic',
  authenticateToken,
  rateLimit.financial.reports,
  reportController.getBasicReports
);

router.get('/api/reports/advanced',
  authenticateToken,
  requirePremiumTier, // Custom middleware to check subscription
  rateLimit.financial.reportsMulti,
  reportController.getAdvancedReports
);
```

---

## Change Log

### v1.0.0 (2024-01-15)
- Initial implementation
- Subscription tier support
- Multi-dimensional rate limiting
- Burst protection
- Progressive backoff
- Comprehensive test suite

### Future Enhancements

- Dynamic rate limit adjustment based on system load
- Machine learning-based anomaly detection
- Advanced analytics and reporting
- GraphQL support
- WebSocket rate limiting

---

**Documentation Version:** 1.0.0
**Last Updated:** January 15, 2024
**Maintained by:** Pluqla Security Team