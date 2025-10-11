# 🛡️ Rate Limiting - Complete Guide

## 📋 Overview

Pluqla implements a comprehensive, production-grade rate limiting system to protect infrastructure, prevent abuse, and ensure fair usage across all user tiers.

**Implementation Date**: December 2024
**Status**: ✅ Production Ready
**Priority**: 🔴 CRITICAL

---

## 🎯 Features

### Core Capabilities
- ✅ **Redis-backed** distributed rate limiting (with in-memory fallback)
- ✅ **User-tier aware** (free, premium, admin)
- ✅ **Per-IP and per-user** limiting
- ✅ **Per-endpoint** configuration
- ✅ **Clear 429 responses** with retry-after information
- ✅ **Admin bypass** for testing and monitoring
- ✅ **Development mode** with 10x limits
- ✅ **Health check** endpoint
- ✅ **Graceful degradation** when Redis unavailable

### Integration
- ✅ Coordinates with AI quota system
- ✅ Works with existing authentication
- ✅ Compatible with all Express routes
- ✅ Middleware chain friendly

---

## 🏗️ Architecture

### Components

1. **Enhanced Rate Limiter** (`rateLimiter.js`)
   - Main implementation with Redis support
   - Tier-aware limiting
   - Health monitoring

2. **Legacy Compatibility** (`rateLimit.js`)
   - Backward compatible wrapper
   - Existing routes continue to work
   - Exports enhanced limiter as `.enhanced`

3. **Redis Store**
   - Distributed rate limiting
   - Automatic failover to memory
   - Connection monitoring

### Middleware Chain

```
Request → Rate Limiter → AI Quota → Validation → Controller → Response
```

---

## 📊 Rate Limit Configurations

### User Tier Limits

#### Free Tier
```javascript
{
  global: 100 requests / 15 minutes
  auth: 10 requests / 15 minutes
  ai: 50 requests / hour          // Matches AI quota
  upload: 10 requests / hour
  standard: 200 requests / 15 minutes
  analytics: 100 requests / 5 minutes
}
```

#### Premium Tier
```javascript
{
  global: 1000 requests / 15 minutes
  auth: 50 requests / 15 minutes
  ai: 500 requests / hour         // Matches AI quota
  upload: 100 requests / hour
  standard: 2000 requests / 15 minutes
  analytics: 1000 requests / 5 minutes
}
```

#### Admin Tier
```javascript
{
  global: 10000 requests / 15 minutes
  auth: 1000 requests / 15 minutes
  ai: 5000 requests / hour
  upload: 1000 requests / hour
  standard: 10000 requests / 15 minutes
  analytics: 10000 requests / 5 minutes
}
```

### Special Limiters

**Strict Limiter** (sensitive operations):
- 20 requests / 15 minutes (all users)
- No bypass

**Slow Limiter** (exports, reports):
- Free: 10 / hour
- Premium: 50 / hour
- Admin: 500 / hour

---

## 🚀 Usage

### Basic Implementation

```javascript
const { globalLimiter, aiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Apply to all routes
app.use(globalLimiter);

// Apply to specific routes
app.post('/api/auth/login', authLimiter, authController.login);
app.get('/api/ai/suggestions', aiLimiter, aiController.getSuggestions);
```

### Tier-Aware Custom Limiter

```javascript
const { createTierAwareLimiter } = require('./middleware/rateLimiter');

// Create custom limiter
const customLimiter = createTierAwareLimiter('ai', {
  bypassAdmin: true, // Admins bypass this limit
  skipSuccessful: false // Count all requests
});

app.get('/api/custom', customLimiter, controller.handle);
```

### Advanced Key Generation

```javascript
const customLimiter = createTierAwareLimiter('standard', {
  keyGenerator: (req) => {
    // Custom key logic
    return `${req.user?.id || req.ip}:${req.path}`;
  }
});
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Redis Configuration (optional, uses memory if not set)
REDIS_URL=redis://localhost:6379

# Development Mode
NODE_ENV=development
SKIP_RATE_LIMIT=true  # Skip all rate limits in dev
```

### Redis Setup

**Install Redis** (if not already installed):

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

**Configure Redis**:

```bash
# .env
REDIS_URL=redis://localhost:6379
```

**Test Connection**:

```bash
redis-cli ping
# Should return: PONG
```

---

## 📡 API Response Format

### Success Response

```http
HTTP/1.1 200 OK
RateLimit-Limit: 50
RateLimit-Remaining: 45
RateLimit-Reset: 1701792000

{
  "success": true,
  "data": { ... }
}
```

### Rate Limit Exceeded (429)

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 50
RateLimit-Remaining: 0
RateLimit-Reset: 1701792000

{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the free tier limit of 50 requests per 60 minutes. Upgrade to premium for higher limits!",
  "details": {
    "limit": 50,
    "window": 3600000,
    "tier": "free",
    "resetAt": "2024-12-05T12:00:00.000Z",
    "retryAfter": "3600 seconds",
    "upgradeUrl": "/premium"
  }
}
```

---

## 🧪 Testing

### Unit Tests

```bash
cd server
npm test -- tests/rateLimiter.test.js
```

**Test Coverage**:
- ✅ User tier detection (8 tests)
- ✅ Rate limit configuration (5 tests)
- ✅ Tier-aware enforcement (3 tests)
- ✅ Response format (2 tests)
- ✅ Per-IP vs per-user limiting (2 tests)
- ✅ Different endpoint limits (1 test)
- ✅ Concurrent requests (1 test)
- ✅ Health check (2 tests)
- ✅ Development mode (2 tests)

**Total**: 26 unit tests

### Integration Testing

```bash
# Start server
npm run dev

# Run verification script
node scripts/verify-rate-limit.js
```

**Verification Tests**:
- Free user AI endpoint (50 req/hour)
- Premium user AI endpoint (500 req/hour)
- Unauthenticated endpoints (100 req/15min)
- Concurrent request handling
- Health check

### Manual Testing

```bash
# Login as free user
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pluqla.com","password":"password123"}'

# Make requests with token
TOKEN="your_token_here"

# Test AI endpoint (50 req/hour for free)
for i in {1..60}; do
  curl -X GET http://localhost:3004/api/ai/suggestions \
    -H "Authorization: Bearer $TOKEN"
  echo "Request $i"
done
```

---

## 📈 Monitoring

### Health Check

```javascript
const { getHealthStatus } = require('./middleware/rateLimiter');

const health = await getHealthStatus();

// Returns:
{
  store: 'redis',           // or 'memory'
  redisAvailable: true,
  redisUrl: '***configured***',
  redisPing: 'success',     // or 'failed'
  timestamp: '2024-12-05T12:00:00.000Z'
}
```

### Admin Utilities

**Reset Rate Limit** (for testing):

```javascript
const { resetRateLimit } = require('./middleware/rateLimiter');

// Reset limits for specific user
await resetRateLimit('user-id-123');

// Reset limits for all users matching pattern
await resetRateLimit('*');
```

### Logging

Rate limit events are automatically logged:

```javascript
// When limit is hit
logger.warn('🚫 Rate limit exceeded', {
  ip: '192.168.1.1',
  userId: 'user-123',
  tier: 'free',
  limitType: 'ai',
  url: '/api/ai/suggestions',
  method: 'GET',
  resetTime: '2024-12-05T12:00:00.000Z'
});
```

### Metrics Queries

```bash
# Redis CLI
redis-cli

# View all rate limit keys
KEYS pluqla:rl:*

# View specific user's limits
KEYS pluqla:rl:*user-123*

# Get value of specific key
GET pluqla:rl:user-123:ai
```

---

## 🔄 Redis Fallback

### Automatic Fallback

The system automatically falls back to in-memory storage when Redis is unavailable:

```javascript
// Initialization
if (process.env.REDIS_URL) {
  try {
    // Attempt Redis connection
    await redisClient.connect();
    redisAvailable = true;
  } catch (error) {
    logger.warn('Redis unavailable, using memory store');
    redisAvailable = false;
  }
}
```

### Memory Store Limitations

⚠️ **Important**: Memory store is NOT suitable for production with multiple servers:
- Limits are per-server instance
- No shared state across servers
- Resets on server restart

**Production Recommendation**: Always use Redis in production environments.

---

## 🎯 Integration with AI Quotas

Rate limiting works in tandem with AI quotas:

1. **Rate Limiter**: Prevents request flooding (requests per time window)
2. **AI Quota**: Manages token consumption (tokens per day)

### Middleware Order

```javascript
router.post('/ai/suggestions',
  rateLimit.ai,              // 1. Rate limit check (50 req/hour)
  aiQuotaMiddleware('suggestions'),  // 2. Quota check (50 tokens/day)
  validateAISuggestions,     // 3. Input validation
  aiController.getSuggestions // 4. Controller logic
);
```

### Coordinated Limits

Both systems use matching limits for free tier:
- Rate Limit: 50 requests/hour
- AI Quota: 50 tokens/day

This ensures consistent user experience.

---

## ⚙️ Advanced Configuration

### Custom Tier Limits

```javascript
// In rateLimiter.js
const CUSTOM_TIER_LIMITS = {
  enterprise: {
    ai: { requests: 10000, window: 60 * 60 * 1000 }
  }
};

// Use in limiter
const config = CUSTOM_TIER_LIMITS[tier] || USER_TIER_LIMITS[tier];
```

### Per-Route Customization

```javascript
// Different limits for different AI features
const suggestionLimiter = createTierAwareLimiter('ai'); // 50/hour
const imageLimiter = createTierAwareLimiter('upload'); // 10/hour

router.post('/ai/suggestions', suggestionLimiter, controller.suggestions);
router.post('/ai/analyze-image', imageLimiter, controller.analyzeImage);
```

### Skip Conditions

```javascript
const limiter = createTierAwareLimiter('auth', {
  skipSuccessful: true, // Don't count successful logins
  bypassAdmin: true     // Admins bypass this limit
});
```

---

## 🚨 Troubleshooting

### Issue: Rate limits not working

**Check**:
1. Middleware is applied to route
2. User tier is correctly detected
3. Redis connection (if configured)
4. Development mode not skipping limits

```javascript
// Debug tier detection
console.log('User tier:', getUserTier(req));

// Check health
const health = await getHealthStatus();
console.log('Rate limiter health:', health);
```

### Issue: Redis connection failing

**Check**:
1. Redis server is running: `redis-cli ping`
2. REDIS_URL is correct
3. Network connectivity
4. Redis authentication (if required)

**Fallback**:
System automatically uses memory store. Check logs for warning:
```
⚠️ Redis unavailable, using memory store
```

### Issue: Limits too strict/loose

**Adjust** in `rateLimiter.js`:

```javascript
const USER_TIER_LIMITS = {
  free: {
    ai: { requests: 100, window: 60 * 60 * 1000 } // Increase from 50 to 100
  }
};
```

### Issue: Development mode limits still apply

**Set environment variable**:

```bash
SKIP_RATE_LIMIT=true npm run dev
```

---

## 📝 Migration Guide

### From Old to New Limiter

**Old Code**:
```javascript
const rateLimit = require('./middleware/rateLimit');
app.use(rateLimit.ai);
```

**New Code (Tier-Aware)**:
```javascript
const { aiLimiter } = require('./middleware/rateLimiter');
app.use(aiLimiter);
```

### Backward Compatibility

Old imports still work:
```javascript
const rateLimit = require('./middleware/rateLimit');
// rateLimit.ai still exists
// rateLimit.enhanced gives new limiter
```

---

## 📚 API Reference

### Exported Limiters

```javascript
const {
  globalLimiter,      // Global API limit
  authLimiter,        // Authentication endpoints
  aiLimiter,          // AI endpoints
  uploadLimiter,      // File uploads
  standardLimiter,    // Standard operations
  analyticsLimiter,   // Analytics events
  strictLimiter,      // Sensitive operations
  slowLimiter         // Reports/exports
} = require('./middleware/rateLimiter');
```

### Factory Functions

```javascript
const {
  createTierAwareLimiter,  // Create custom tier-aware limiter
  getUserTier,             // Get user's tier
  getRateLimitConfig       // Get limit config for tier
} = require('./middleware/rateLimiter');
```

### Utilities

```javascript
const {
  getHealthStatus,    // Get health status
  resetRateLimit,     // Reset user's limits (admin)
  cleanup,            // Graceful shutdown
  redisClient,        // Direct Redis access
  redisAvailable      // Check Redis status
} = require('./middleware/rateLimiter');
```

---

## 🔗 Related Documentation

- [AI Usage Quotas](./AI_USAGE_QUOTAS.md)
- [Authentication](./AUTH_ADMIN.md)
- [Security](./SECURITY.md)
- [Rollback Guide](./ROLLBACK_RATE_LIMIT.md)

---

## 👥 Support

### Questions?
- **Slack**: #pluqla-dev
- **GitHub Issues**: Tag with `rate-limiting`
- **Documentation**: `/server/docs`

### Reporting Issues
Include:
1. User ID or IP
2. Endpoint being accessed
3. Expected vs actual behavior
4. Redis configuration (if applicable)
5. Server logs

---

**Last Updated**: December 2024
**Author**: Pluqla Engineering Team
**Review Status**: ✅ Production Ready
