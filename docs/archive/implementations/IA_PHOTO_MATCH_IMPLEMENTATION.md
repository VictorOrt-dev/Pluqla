# IA Photo Match Feature - Implementation Guide

## Overview

The IA Photo Match feature allows users to submit photos and receive AI-generated fashion/style matches. The system uses asynchronous processing, caching, and quota enforcement to provide a scalable and secure experience.

## Architecture

### Components

1. **API Endpoint** (`/api/photo-match`)
   - RESTful API for job creation and status checking
   - Input validation and sanitization
   - Authentication and authorization
   - Rate limiting and quota enforcement

2. **Bull Queue** (Redis-backed)
   - Asynchronous job processing
   - Retry logic with exponential backoff
   - Dead letter queue for failed jobs
   - Concurrency control

3. **Worker Process**
   - AI-powered image analysis
   - Image preprocessing (resize, optimize)
   - Result caching
   - Error handling and logging

4. **Database** (PostgreSQL)
   - Job records (PhotoMatchJob)
   - Results (PhotoMatchResult)
   - AI usage tracking (AiUsage)

5. **Cache Layer** (Redis)
   - Result caching by image hash
   - Deduplication
   - TTL-based expiration (7 days)

6. **Observability**
   - Prometheus metrics
   - Structured logging (Winston)
   - Performance monitoring

## API Reference

### Create Photo Match Job

**Endpoint:** `POST /api/photo-match`

**Authentication:** Required

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "metadata": {
    "source": "camera",
    "category": "clothing",
    "priority": 5
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "cuid123456",
    "status": "pending",
    "duplicate": false,
    "estimatedCompletionTime": "2025-10-02T12:34:56Z",
    "createdAt": "2025-10-02T12:33:56Z"
  },
  "quota": {
    "remaining": 45,
    "limit": 50,
    "resetAt": "2025-10-03T00:00:00Z"
  }
}
```

**Rate Limit:** AI tier (10 requests/minute)

**Quota Cost:** 5 tokens

**Image Requirements:**
- Format: JPEG, PNG, WebP, HEIC
- Max size: 10MB
- Max dimensions: 25 megapixels
- Delivery: Base64 or HTTPS URL (whitelisted domains)

**Security Validations:**
- Base64 format validation
- URL domain whitelist
- MIME type verification
- Size limits
- Decompression bomb protection

---

### Get Job Status

**Endpoint:** `GET /api/photo-match/:jobId`

**Authentication:** Required (user must own job)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "jobId": "cuid123456",
    "status": "completed",
    "createdAt": "2025-10-02T12:33:56Z",
    "processingStartedAt": "2025-10-02T12:34:01Z",
    "processingCompletedAt": "2025-10-02T12:34:12Z",
    "processingTimeMs": 11000,
    "result": {
      "matchType": "clothing_analysis",
      "matchScore": 87,
      "matchData": {
        "items": [
          {
            "type": "shirt",
            "color": "blue",
            "style": "casual"
          }
        ],
        "styleCategory": "casual",
        "colorPalette": ["#1E3A8A", "#FFFFFF"],
        "recommendations": [
          "white sneakers",
          "blue jeans",
          "minimal accessories"
        ]
      },
      "aiProvider": "anthropic",
      "tokensUsed": 512,
      "processingTimeMs": 11000,
      "cacheHit": false
    }
  }
}
```

**Status Values:**
- `pending` - Job queued, waiting for processing
- `processing` - AI analysis in progress
- `completed` - Job finished successfully
- `failed` - Job failed (see error field)

---

### Get Job History

**Endpoint:** `GET /api/photo-match/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): 1-100, default 20
- `offset` (optional): ≥0, default 0
- `status` (optional): pending|processing|completed|failed

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "cuid123456",
        "status": "completed",
        "createdAt": "2025-10-02T12:33:56Z",
        "result": {
          "matchType": "clothing_analysis",
          "matchScore": 87,
          "processingTimeMs": 11000,
          "cacheHit": false
        }
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### Get Analytics

**Endpoint:** `GET /api/photo-match/analytics`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalJobs": 42,
    "statusBreakdown": {
      "completed": 38,
      "failed": 2,
      "pending": 1,
      "processing": 1
    },
    "avgProcessingTimeMs": 9234
  }
}
```

---

### Get Queue Metrics (Admin Only)

**Endpoint:** `GET /api/photo-match/metrics`

**Authentication:** Required (admin role)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 1234,
    "failed": 12,
    "delayed": 0,
    "total": 1253
  }
}
```

---

## Database Schema

### PhotoMatchJob

```sql
CREATE TABLE photo_match_jobs (
  id                     TEXT PRIMARY KEY,
  userId                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'pending',
  imageUrl               TEXT NOT NULL,
  imageHash              TEXT NOT NULL,
  imageSize              INTEGER NOT NULL,
  mimeType               TEXT NOT NULL,
  processingStartedAt    TIMESTAMP,
  processingCompletedAt  TIMESTAMP,
  errorMessage           TEXT,
  retryCount             INTEGER NOT NULL DEFAULT 0,
  metadata               TEXT,
  createdAt              TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt              TIMESTAMP NOT NULL
);

CREATE INDEX idx_photo_match_job_user ON photo_match_jobs(userId);
CREATE INDEX idx_photo_match_job_status ON photo_match_jobs(status);
CREATE INDEX idx_photo_match_job_image_hash ON photo_match_jobs(imageHash);
```

### PhotoMatchResult

```sql
CREATE TABLE photo_match_results (
  id               TEXT PRIMARY KEY,
  jobId            TEXT UNIQUE NOT NULL REFERENCES photo_match_jobs(id) ON DELETE CASCADE,
  userId           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matchType        TEXT NOT NULL,
  matchScore       FLOAT NOT NULL DEFAULT 0,
  matchData        TEXT NOT NULL,
  aiProvider       TEXT NOT NULL,
  tokensUsed       INTEGER NOT NULL DEFAULT 0,
  processingTimeMs INTEGER NOT NULL,
  cacheKey         TEXT NOT NULL,
  cachedUntil      TIMESTAMP NOT NULL,
  metadata         TEXT,
  createdAt        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photo_match_result_user ON photo_match_results(userId);
CREATE INDEX idx_photo_match_result_cache_key ON photo_match_results(cacheKey);
```

---

## Security Considerations

### 1. **Input Validation**
- Base64 format validation with regex
- URL domain whitelist (only approved CDNs)
- Image size limits (max 10MB)
- MIME type verification
- Decompression bomb protection (max 25MP)

### 2. **Authentication & Authorization**
- All endpoints require JWT authentication
- Users can only access their own jobs
- Admin-only metrics endpoint

### 3. **Quota Enforcement**
- Atomic quota checks before job creation
- Database-backed quota tracking
- Middleware-level enforcement
- Free tier: 50 tokens/day
- Premium tier: 500 tokens/day
- Photo match cost: 5 tokens

### 4. **Rate Limiting**
- AI tier: 10 requests/minute
- Standard tier: 100 requests/minute
- Redis-backed sliding window

### 5. **Data Protection**
- Image URLs sanitized in logs
- Error messages don't leak sensitive paths
- User isolation (can't access others' jobs)
- GDPR-compliant data retention (CASCADE deletes)

### 6. **DDoS Prevention**
- Request size limits
- Queue depth monitoring
- Automatic job cleanup
- Stalled job detection

---

## Quota System

### Tier Limits

| Tier     | Daily Quota | Photo Match Cost | Max Jobs/Day |
|----------|-------------|------------------|--------------|
| Free     | 50 tokens   | 5 tokens         | 10 jobs      |
| Premium  | 500 tokens  | 5 tokens         | 100 jobs     |

### Quota Reset
- Resets daily at **00:00 UTC**
- Atomic decrements (race-condition safe)
- Warning at 80% usage

### Quota Enforcement Flow

```
1. Request arrives
2. aiQuotaMiddleware checks quota
   - Query AiUsage table for today's usage
   - Calculate remaining = quota - used
   - If remaining < cost: REJECT (429)
   - If remaining >= cost: ALLOW + set req.aiQuota
3. Controller processes request
4. aiUsageService.consumeTokens() atomically decrements
5. Response includes updated quota info
```

---

## Caching Strategy

### Cache Key Generation
```javascript
const cacheKey = `photo-match:${imageHash}`
```

### Deduplication Flow

1. Calculate SHA-256 hash of image data
2. Check Redis for existing result
3. If cache hit:
   - Return cached result immediately
   - Store reference for new user in DB
   - Cost: 0 tokens (no AI call)
4. If cache miss:
   - Process with AI
   - Store result in Redis (TTL: 7 days)
   - Store result in DB
   - Cost: 5 tokens

### Cache TTL
- Default: 7 days (604800 seconds)
- Configurable per feature
- Automatic expiration cleanup

### Cache Failure Handling
- Cache errors don't fail requests
- Graceful degradation (proceed without cache)
- Logged but not thrown

---

## Observability & Monitoring

### Prometheus Metrics

```prometheus
# Job creation counter
photo_match_jobs_total{status="pending|completed|failed", duplicate="true|false"}

# Processing duration histogram
photo_match_processing_duration_seconds{status, ai_provider, cache_hit}

# Queue depth gauge
photo_match_queue_depth{status="waiting|active|completed|failed|delayed"}

# AI provider counter
photo_match_ai_provider_total{provider="anthropic|openai", success="true|false"}

# Cache hit rate
photo_match_cache_hits_total{hit="true|false"}

# Quota usage counter
photo_match_quota_usage_total{user_tier="free|premium"}

# Error counter
photo_match_errors_total{error_type, stage}
```

### Logging

All events use structured logging (Winston):

```json
{
  "timestamp": "2025-10-02T12:34:56.789Z",
  "level": "info",
  "message": "Photo match job completed successfully",
  "jobId": "cuid123456",
  "userId": "user789",
  "processingTimeMs": 11234,
  "matchScore": 87,
  "aiProvider": "anthropic",
  "cacheHit": false
}
```

### Key Metrics to Monitor

1. **Queue Health**
   - Queue depth (alert if >100)
   - Processing rate (jobs/minute)
   - Failed job ratio (alert if >5%)

2. **Performance**
   - P50, P95, P99 processing times
   - Cache hit rate (target >30%)
   - AI provider latency

3. **Quota**
   - Tokens consumed per hour
   - Quota exhaustion events
   - Premium conversion opportunities

4. **Errors**
   - Error rate by stage
   - Most common error types
   - Retry success rate

### Alerting Rules

```yaml
# Grafana/Prometheus alerts

- alert: PhotoMatchQueueBacklog
  expr: photo_match_queue_depth{status="waiting"} > 100
  for: 5m
  annotations:
    summary: "Photo match queue backlog detected"

- alert: PhotoMatchHighErrorRate
  expr: rate(photo_match_errors_total[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High error rate in photo match processing"

- alert: PhotoMatchSlowProcessing
  expr: histogram_quantile(0.95, photo_match_processing_duration_seconds) > 30
  for: 10m
  annotations:
    summary: "Photo match processing is slow (P95 >30s)"
```

---

## Deployment

### Environment Variables

```bash
# Redis (Queue & Cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_QUEUE_DB=1  # Separate DB for queues

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pluqla

# Feature Flags
PHOTO_MATCH_ENABLED=true
PHOTO_MATCH_MAX_IMAGE_SIZE=10485760  # 10MB
PHOTO_MATCH_CACHE_TTL=604800  # 7 days
```

### Database Migration

```bash
# Run Prisma migration
cd server
npx prisma migrate dev --name add_photo_match_feature

# Or for production
npx prisma migrate deploy
```

### Worker Process

The worker runs in the same Node.js process as the API server:

```javascript
// src/workers/photoMatchWorker.js is auto-loaded
// Starts processing jobs from Bull queue
```

For horizontal scaling, run workers separately:

```bash
# API server (no worker)
NODE_ENV=production WORKER_ENABLED=false node src/server.js

# Dedicated worker
NODE_ENV=production WORKER_ONLY=true node src/workers/photoMatchWorker.js
```

### Queue Maintenance

Automated cleanup job (runs daily at 3 AM):

```javascript
const cron = require('node-cron');
const { cleanOldJobs } = require('./queues/photoMatchQueue');

cron.schedule('0 3 * * *', async () => {
  await cleanOldJobs();
});
```

---

## Testing

### Unit Tests

```bash
npm test -- tests/photoMatch.test.js
```

### Integration Tests

```bash
# Requires running PostgreSQL + Redis
npm run test:integration
```

### Load Testing

```bash
# Autocannon benchmark
npm run bench:photo-match

# K6 load test
k6 run scripts/bench/photo-match-load-test.js
```

### Test Coverage Goals

- Unit: >85%
- Integration: >70%
- E2E: Critical paths

---

## Performance Benchmarks

### Target Metrics

| Metric                 | Target    |
|------------------------|-----------|
| Job creation latency   | <200ms    |
| Processing time (P95)  | <15s      |
| Cache hit rate         | >30%      |
| Queue throughput       | 60 jobs/min |
| Failed job rate        | <2%       |

### Optimization Tips

1. **Image Preprocessing**
   - Resize large images before sending to AI
   - Use mozjpeg compression (85% quality)
   - Limit to 2048x2048 max dimension

2. **Caching**
   - Cache aggressively by image hash
   - Preload popular style categories
   - Use Redis cluster for high throughput

3. **AI Provider**
   - Use Claude 3.5 Sonnet for best accuracy
   - Fallback to GPT-4 Vision if quota exceeded
   - Batch similar requests (future enhancement)

4. **Queue Tuning**
   - Adjust concurrency based on AI rate limits
   - Use priority queues for premium users
   - Implement adaptive backoff

---

## Frontend Integration

### Example React Hook

```javascript
import { useState, useEffect } from 'react';
import apiAdapter from '../services/api/apiAdapter';

export function usePhotoMatch() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submitPhoto = async (imageFile) => {
    setLoading(true);
    setError(null);

    try {
      // Convert image to base64
      const base64 = await fileToBase64(imageFile);

      // Create job
      const { data } = await apiAdapter.post('/photo-match', {
        image: base64,
        metadata: {
          source: 'camera',
          category: 'clothing'
        }
      });

      const jobId = data.data.jobId;

      // Poll for result
      const result = await pollJobStatus(jobId);
      setResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await apiAdapter.get(`/photo-match/${jobId}`);

      if (data.data.status === 'completed') {
        return data.data.result;
      }

      if (data.data.status === 'failed') {
        throw new Error(data.data.error.message);
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Job timeout');
  };

  return { submitPhoto, loading, result, error };
}
```

---

## Troubleshooting

### Common Issues

**1. Queue not processing jobs**
```bash
# Check Redis connection
redis-cli ping

# Check queue metrics
curl http://localhost:3004/api/photo-match/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**2. High quota consumption**
```bash
# Check AI usage logs
grep "AI quota check" logs/app.log | tail -100

# Review quota by user
SELECT userId, COUNT(*), SUM(tokensUsed)
FROM ai_usage
WHERE feature = 'photo_match'
AND createdAt > NOW() - INTERVAL '1 day'
GROUP BY userId
ORDER BY SUM(tokensUsed) DESC;
```

**3. Slow processing**
```bash
# Check AI provider latency
grep "AI analysis completed" logs/app.log | \
  jq '.processingTimeMs' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count "ms"}'

# Review queue depth
redis-cli LLEN bull:photo-match-jobs:wait
```

**4. Cache misses**
```bash
# Check cache hit rate
SELECT
  COUNT(CASE WHEN aiProvider = 'cached' THEN 1 END) as cache_hits,
  COUNT(*) as total,
  ROUND(COUNT(CASE WHEN aiProvider = 'cached' THEN 1 END) * 100.0 / COUNT(*), 2) as hit_rate_percent
FROM photo_match_results
WHERE createdAt > NOW() - INTERVAL '1 day';
```

---

## Future Enhancements

1. **Batch Processing**
   - Process multiple images in single AI call
   - Reduce API costs by 40%

2. **Advanced Matching**
   - Similarity search with vector embeddings
   - Personalized recommendations based on history
   - Multi-image outfit matching

3. **Real-time Processing**
   - WebSocket updates instead of polling
   - Server-Sent Events (SSE) for job status

4. **ML Model Fine-tuning**
   - Train custom vision models on user feedback
   - Improve match accuracy over time

5. **Cost Optimization**
   - Smart AI provider selection
   - Adaptive quality settings
   - Aggressive caching for popular items

---

## License

MIT License - Pluqla Team © 2025
