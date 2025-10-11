# 🚨 Rate Limiting Rollback Guide

## Quick Reference

**Feature**: Rate Limiting System
**Last Updated**: December 2024
**Severity Levels**: 🟢 Low | 🟡 Medium | 🔴 Critical

---

## Emergency Contacts

- **Slack**: #pluqla-dev
- **On-Call**: Engineering Lead
- **Escalation**: CTO

---

## Quick Disable (30 seconds)

**Fastest way to disable rate limiting**:

```bash
# Set environment variable
export SKIP_RATE_LIMIT=true

# Restart server
pm2 restart pluqla-server
```

This bypasses ALL rate limiters while keeping code intact.

---

## Rollback Scenarios

### Scenario 1: Limits Too Strict (🟡 Medium)

**Symptoms**:
- Legitimate users being blocked
- 429 errors spiking
- Support tickets increasing

**Quick Fix** (2 minutes):

1. **Increase limits temporarily**:
   ```javascript
   // In src/middleware/rateLimiter.js
   const USER_TIER_LIMITS = {
     free: {
       ai: { requests: 200, window: 60 * 60 * 1000 } // Was: 50
     }
   };
   ```

2. **Deploy**:
   ```bash
   git add src/middleware/rateLimiter.js
   git commit -m "hotfix: increase rate limits temporarily"
   git push
   pm2 restart pluqla-server
   ```

3. **Monitor**: Check metrics for 1 hour
4. **Adjust**: Set permanent limits based on data

---

### Scenario 2: Redis Connection Issues (🔴 Critical)

**Symptoms**:
- Slow rate limit checks
- Redis connection errors in logs
- Timeouts on API requests

**Quick Fix** (1 minute):

The system automatically falls back to memory store. No action needed unless:

**Force Memory Store**:

```bash
# Unset REDIS_URL temporarily
unset REDIS_URL

# Or comment out in .env
# REDIS_URL=redis://localhost:6379

# Restart
pm2 restart pluqla-server
```

**Verify Fallback**:
```bash
# Check logs for:
grep "using memory store" logs/app.log
```

---

### Scenario 3: Breaking Production Traffic (🔴 Critical)

**Symptoms**:
- Major spike in 429 errors
- Users unable to access app
- Business-critical flows blocked

**Emergency Disable** (30 seconds):

```bash
# Method 1: Environment variable
export SKIP_RATE_LIMIT=true
pm2 restart pluqla-server

# Method 2: Code change (if env vars not working)
# Edit src/middleware/rateLimiter.js:
# Change createTierAwareLimiter to always return next()
```

**Immediate Code Fix**:

```javascript
// In src/middleware/rateLimiter.js
// Add at top of createTierAwareLimiter function:

function createTierAwareLimiter(limitType, options = {}) {
  return async (req, res, next) => {
    // EMERGENCY BYPASS
    return next();
  };
}
```

**Deploy**:
```bash
git add src/middleware/rateLimiter.js
git commit -m "EMERGENCY: disable rate limiting"
git push
pm2 restart pluqla-server
```

---

### Scenario 4: Tier Detection Bug (🟡 Medium)

**Symptoms**:
- Premium users getting free tier limits
- Admins being rate limited
- Incorrect tier in 429 responses

**Quick Fix** (5 minutes):

1. **Disable tier detection temporarily**:
   ```javascript
   // In src/middleware/rateLimiter.js
   function getUserTier(req) {
     // TEMPORARY: Default all to premium
     return 'premium';
   }
   ```

2. **Deploy and monitor**

3. **Fix root cause**:
   - Check `req.user` population
   - Verify `isPremium` field in database
   - Check authentication middleware

---

## Complete Rollback (10 minutes)

**Use when**: Multiple critical issues, system unstable

### Step 1: Revert Code

```bash
# Find rate limiting commits
git log --oneline | grep -i "rate"

# Revert to before rate limiting
git revert <rate-limit-commit-hash>

# Or reset (use with caution)
git reset --hard <commit-before-rate-limiting>
git push --force origin main
```

### Step 2: Remove Files

```bash
# Remove new rate limiter
rm server/src/middleware/rateLimiter.js

# Keep old rateLimit.js (remove enhanced import)
# Edit server/src/middleware/rateLimit.js
# Remove line: const enhancedLimiter = require('./rateLimiter');
# Remove line: enhanced: enhancedLimiter
```

### Step 3: Update Routes

Remove enhanced limiter imports:

```javascript
// Before
const { aiLimiter } = require('./middleware/rateLimiter');

// After (fallback to old)
const rateLimit = require('./middleware/rateLimit');
const { ai: aiLimiter } = rateLimit;
```

### Step 4: Deploy

```bash
npm install  # Ensure dependencies are correct
npm test     # Run tests
pm2 restart pluqla-server
```

### Step 5: Verify

```bash
# Test endpoints
curl http://localhost:3004/api/health
curl http://localhost:3004/api/ai/suggestions -H "Authorization: Bearer TOKEN"

# Check logs
tail -f logs/app.log | grep -i "rate"
```

---

## Partial Rollback Options

### Option 1: Disable for Specific Endpoints

```javascript
// In routes file
router.get('/api/critical-endpoint',
  // aiLimiter,  // DISABLED - issues reported
  authMiddleware,
  controller.handle
);
```

### Option 2: Increase Limits Globally

```javascript
// In rateLimiter.js
// Multiply all limits by 10
const USER_TIER_LIMITS = {
  free: {
    ai: { requests: 500, window: 60 * 60 * 1000 } // 10x original
  }
};
```

### Option 3: Premium-Only Rate Limiting

```javascript
// In rateLimiter.js
function createTierAwareLimiter(limitType, options = {}) {
  return async (req, res, next) => {
    const tier = getUserTier(req);

    // Skip rate limiting for free users temporarily
    if (tier === 'free') {
      return next();
    }

    // Continue with normal rate limiting for premium
    // ... existing code
  };
}
```

---

## Post-Rollback Checklist

### Immediate (0-1 hour)
- [ ] Verify all critical endpoints responding
- [ ] Check 429 error rate dropped
- [ ] Monitor API response times
- [ ] Test with free and premium accounts
- [ ] Update status page

### Short-term (1-24 hours)
- [ ] Document root cause
- [ ] Create bug tickets
- [ ] Plan fixes with team
- [ ] Communicate timeline to stakeholders
- [ ] Review monitoring alerts

### Long-term (1-7 days)
- [ ] Implement fixes
- [ ] Add missing tests
- [ ] Test in staging thoroughly
- [ ] Gradual rollout plan
- [ ] Monitor metrics closely

---

## Monitoring Commands

### Check Rate Limit Status

```bash
# View recent rate limit logs
tail -f logs/app.log | grep "Rate limit"

# Count 429 errors in last hour
grep "429" logs/app.log | wc -l

# View rate limit warnings
grep "Rate limit exceeded" logs/app.log | tail -20
```

### Redis Diagnostics

```bash
# Connect to Redis
redis-cli

# Check connection
PING

# View all rate limit keys
KEYS pluqla:rl:*

# Count rate limit keys
KEYS pluqla:rl:* | wc -l

# View specific user's limits
KEYS pluqla:rl:*user-123*

# Delete all rate limit keys (reset all limits)
EVAL "return redis.call('del', unpack(redis.call('keys', 'pluqla:rl:*')))" 0
```

### Health Check

```javascript
// In Node REPL or script
const { getHealthStatus } = require('./src/middleware/rateLimiter');

const health = await getHealthStatus();
console.log(health);

// Expected output:
{
  store: 'redis' or 'memory',
  redisAvailable: true/false,
  redisUrl: '***configured***' or 'not configured',
  redisPing: 'success'/'failed',
  timestamp: '2024-12-05T12:00:00.000Z'
}
```

---

## Prevention Checklist

### Before Deployment
- [ ] Full test suite passing
- [ ] Load testing completed (100+ concurrent users)
- [ ] Staging environment validated (24+ hours)
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment
- [ ] Redis backup completed

### After Deployment
- [ ] Monitor error rates for 1 hour
- [ ] Check performance metrics
- [ ] Verify user feedback channels
- [ ] Document any issues
- [ ] On-call engineer assigned
- [ ] Status page updated

---

## Testing After Rollback

### Manual Tests

```bash
# Login as test user
TOKEN=$(curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pluqla.com","password":"password123"}' \
  | jq -r '.tokens.accessToken')

# Make 60 requests (should not be rate limited if disabled)
for i in {1..60}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3004/api/ai/suggestions)
  echo "Request $i: $STATUS"
done
```

### Automated Tests

```bash
# Run test suite
npm test

# Run specific rate limit tests (should skip if disabled)
npm test -- tests/rateLimiter.test.js

# Run verification script
node scripts/verify-rate-limit.js
```

---

## Configuration Reference

### Environment Variables

```bash
# Enable/disable rate limiting
SKIP_RATE_LIMIT=true          # Skip all rate limits (dev/emergency)

# Redis configuration
REDIS_URL=redis://localhost:6379  # Comment out to use memory

# Development mode
NODE_ENV=development          # Applies 10x multiplier to limits
```

### Code Toggles

```javascript
// In rateLimiter.js

// Emergency bypass at function level
function createTierAwareLimiter(limitType, options = {}) {
  return async (req, res, next) => {
    // TOGGLE: Uncomment to bypass
    // return next();

    // Normal rate limiting...
  };
}

// Bypass for specific tiers
if (tier === 'free') {
  // TOGGLE: Uncomment to bypass free tier
  // return next();
}
```

---

## Communication Templates

### Internal Slack Notification

```
🚨 ALERT: Rate limiting disabled temporarily

Reason: [describe issue]
Duration: [estimated time]
Impact: Users may experience increased server load
Action: Monitoring API performance closely
ETA Fix: [time estimate]

Status updates: Every 30 minutes
```

### User-Facing Status Update

```
We're currently experiencing technical difficulties that may affect
API response times. Our team is working on a resolution.
All data is safe and no user information is at risk.

Status: Investigating
ETA: [time]
```

---

## Additional Resources

- **Main Documentation**: [README_RATE_LIMIT.md](./README_RATE_LIMIT.md)
- **AI Quotas**: [AI_USAGE_QUOTAS.md](./AI_USAGE_QUOTAS.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Monitoring Dashboard**: [Grafana](http://localhost:3001)

---

## Decision Matrix

| Severity | Symptoms | Action | Time | Risk |
|----------|----------|--------|------|------|
| 🟢 Low | Minor complaints | Increase limits | 5 min | Low |
| 🟡 Medium | Multiple issues | Partial rollback | 10 min | Medium |
| 🔴 Critical | Service down | Full disable | 30 sec | High |
| 🔴 Critical | Data corruption | Full rollback | 10 min | High |

---

**Remember**: It's better to roll back and fix properly than to leave broken features in production.

---

**Version**: 1.0.0
**Last Review**: December 2024
**Next Review**: January 2025
