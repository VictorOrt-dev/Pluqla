# IA Photo Match - Quick Start Guide

Get the IA Photo Match feature running in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Anthropic API key (or OpenAI API key)

## Installation Steps

### 1. Install Dependencies

```bash
cd server
npm install bull --save
npm install
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# AI Provider (required)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Redis Configuration (required for queue and cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_QUEUE_DB=1

# Optional: Feature Configuration
PHOTO_MATCH_ENABLED=true
PHOTO_MATCH_MAX_IMAGE_SIZE=10485760  # 10MB
PHOTO_MATCH_CACHE_TTL=604800  # 7 days
```

### 3. Run Database Migration

```bash
cd server
npx prisma migrate dev
```

This will create:
- `photo_match_jobs` table
- `photo_match_results` table
- All necessary indexes and foreign keys

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start the Server

```bash
npm run dev
```

The worker will automatically start processing jobs from the queue.

### 6. Test the Feature

```bash
# Create a test photo match job
curl -X POST http://localhost:3004/api/photo-match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "metadata": {
      "source": "test",
      "category": "clothing"
    }
  }'

# Response:
{
  "success": true,
  "data": {
    "jobId": "cuid123456",
    "status": "pending",
    "estimatedCompletionTime": "2025-10-02T12:34:56Z"
  },
  "quota": {
    "remaining": 45,
    "limit": 50,
    "resetAt": "2025-10-03T00:00:00Z"
  }
}

# Check job status
curl http://localhost:3004/api/photo-match/cuid123456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Verify Installation

### Check Queue Connection

```bash
# Redis queue list should exist
redis-cli KEYS "bull:photo-match-jobs:*"
```

### Check Database Tables

```bash
# Connect to PostgreSQL
psql -d pluqla_dev

# Verify tables
\dt photo_match*
```

Expected output:
```
 photo_match_jobs
 photo_match_results
```

### Check Logs

```bash
# Look for worker startup
grep "Photo match worker started" logs/app.log

# Look for job processing
grep "Photo match job" logs/app.log
```

## Frontend Integration

Add photo match to your Features Mode:

### 1. Add Feature Card to CategoryGrid

Edit `client/src/components/home/CategoryGrid.jsx`:

```javascript
const categories = [
  // ... existing categories ...
  {
    id: 'photo-match',
    title: 'Style Match',
    icon: '/assets/logos/logo_photo_match.png',
    iconType: 'image',
    iconAlt: 'Photo Match AI',
    notifications: 0,
    isPremium: false
  }
];
```

### 2. Create Photo Match Component

Create `client/src/components/features/photoMatch/PhotoMatchUploader.jsx`:

```javascript
import React, { useState } from 'react';
import { usePhotoMatch } from '../../../hooks/usePhotoMatch';

const PhotoMatchUploader = ({ darkMode }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const { submitPhoto, loading, result, error } = usePhotoMatch();

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      submitPhoto(file);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">
        AI Photo Match
      </h2>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageSelect}
        className="mb-4"
      />

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
          <p className="mt-4">Analyzing your photo...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2">
            Match Results (Score: {result.matchScore}/100)
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Detected Items:</h4>
              <ul className="list-disc list-inside">
                {result.matchData.items.map((item, i) => (
                  <li key={i}>
                    {item.type} - {item.color} ({item.style})
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">Style: {result.matchData.styleCategory}</h4>
            </div>

            <div>
              <h4 className="font-semibold">Recommendations:</h4>
              <ul className="list-disc list-inside">
                {result.matchData.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoMatchUploader;
```

### 3. Add Route Handler

Update your router to show Photo Match component when `currentScreen === 'photo-match'`.

## Monitoring

### Prometheus Metrics

Available at `http://localhost:3004/metrics`:

```
photo_match_jobs_total{status="completed"} 42
photo_match_processing_duration_seconds_bucket{le="10"} 38
photo_match_queue_depth{status="waiting"} 3
photo_match_cache_hits_total{hit="true"} 15
```

### Queue Dashboard

Get queue stats (admin only):

```bash
curl http://localhost:3004/api/photo-match/metrics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Grafana Dashboard

Import the Prometheus metrics into Grafana:
- Queue depth over time
- Processing time P50/P95/P99
- Cache hit rate
- Error rate

## Troubleshooting

### Issue: "Queue not processing jobs"

**Solution:**
```bash
# 1. Check Redis connection
redis-cli ping
# Should return: PONG

# 2. Check if worker is running
grep "Photo match worker started" logs/app.log

# 3. Restart server
npm run dev
```

### Issue: "Quota exceeded immediately"

**Solution:**
```bash
# Reset quota for testing
psql -d pluqla_dev -c "DELETE FROM ai_usage WHERE feature = 'photo_match';"
```

### Issue: "AI provider timeout"

**Solution:**
```bash
# Check API key is valid
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"

# Increase timeout in photoMatchWorker.js
# Look for: timeout: 30000
```

### Issue: "Image validation failed"

**Solution:**
- Ensure image is <10MB
- Use JPEG, PNG, or WebP format
- Base64 must include data URI prefix: `data:image/jpeg;base64,...`

## Performance Tuning

### Increase Queue Concurrency

Edit `server/src/workers/photoMatchWorker.js`:

```javascript
// Change from:
photoMatchQueue.process(1, processPhotoMatchJob);

// To (for more concurrent processing):
photoMatchQueue.process(5, processPhotoMatchJob);
```

### Adjust Cache TTL

Edit `server/src/workers/photoMatchWorker.js`:

```javascript
// Change CACHE_TTL
const CACHE_TTL = 3600 * 24 * 14; // 14 days instead of 7
```

### Enable Aggressive Caching

Edit `server/src/services/photoMatchService.js`:

```javascript
// Increase duplicate detection window
const duplicateJob = await checkDuplicateJob(userId, imageHash, 86400000); // 24 hours
```

## Next Steps

1. **Add to homescreen:** Integrate photo match card into CategoryGrid
2. **Test quota limits:** Create 50+ jobs to test quota enforcement
3. **Monitor performance:** Set up Grafana dashboards
4. **Customize AI prompts:** Edit worker to adjust match categories
5. **Add user feedback:** Collect ratings on match quality

## Support

- **Documentation:** [IA_PHOTO_MATCH_IMPLEMENTATION.md](./IA_PHOTO_MATCH_IMPLEMENTATION.md)
- **GitHub Issues:** https://github.com/pluqla/app/issues
- **Team Slack:** #pluqla-dev

---

**Estimated Setup Time:** 5-10 minutes

**Ready to use!** 🚀
