# Meal Suggestions - Quick Start Guide

**Get the Meal Suggestions feature up and running in 5 minutes!**

---

## 🚀 Quick Setup

### 1. Run Database Migration

```bash
cd server
npx prisma migrate dev --name add_meal_suggestions
npx prisma generate
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# AI Provider (required)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here

# Redis (required for queues and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_QUEUE_DB=1

# Optional: Worker configuration
MEAL_SUGGESTIONS_WORKER_CONCURRENCY=3
```

### 3. Start Redis

```bash
# macOS/Linux
redis-server

# Windows (via WSL or Docker)
docker run -d -p 6379:6379 redis:latest
```

### 4. Start the Worker

The worker should be started automatically when your server starts. If not:

```bash
cd server
node src/workers/mealSuggestionsWorker.js
```

### 5. Test the API

```bash
# Health check
curl http://localhost:3004/api/health

# Create a meal suggestion (requires auth token)
curl -X POST http://localhost:3004/api/meal-suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "dinner",
    "servings": 2,
    "budget": 15
  }'

# Response:
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "pending",
    "estimatedCompletionTime": "2025-10-02T10:00:15Z"
  },
  "quota": {
    "remaining": 47,
    "limit": 50,
    "resetAt": "2025-10-03T00:00:00Z"
  }
}

# Get job status
curl http://localhost:3004/api/meal-suggestions/clxxx... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📡 API Endpoints

### POST /api/meal-suggestions

Create a new meal suggestion job.

**Request Body**:

```json
{
  "mealType": "dinner",           // Optional: breakfast, lunch, dinner, snack, dessert, any
  "dietaryRestrictions": [        // Optional: array
    "vegetarian",
    "gluten-free"
  ],
  "budget": 15,                   // Optional: 0-200 EUR
  "servings": 2,                  // Optional: 1-20
  "cuisineType": "italian",       // Optional: italian, french, chinese, etc.
  "maxCookingTime": 30,           // Optional: 5-300 minutes
  "skillLevel": "intermediate",   // Optional: beginner, easy, intermediate, advanced, expert
  "avoidIngredients": [           // Optional: array (max 20)
    "mushrooms"
  ],
  "preferredIngredients": [       // Optional: array (max 20)
    "tomatoes",
    "basil"
  ]
}
```

**Response (202 Accepted)**:

```json
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "pending",
    "duplicate": false,
    "estimatedCompletionTime": "2025-10-02T10:00:15Z",
    "createdAt": "2025-10-02T10:00:00Z"
  },
  "quota": {
    "remaining": 47,
    "limit": 50,
    "resetAt": "2025-10-03T00:00:00Z"
  }
}
```

**Response (200 OK - Duplicate)**:

```json
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "completed",
    "duplicate": true,
    "createdAt": "2025-10-02T09:45:00Z"
  }
}
```

**Response (429 Too Many Requests - Quota Exceeded)**:

```json
{
  "success": false,
  "error": {
    "message": "Daily quota exceeded. You have 0 tokens remaining. Quota resets at 2025-10-03T00:00:00.000Z.",
    "code": "QUOTA_EXCEEDED"
  }
}
```

---

### GET /api/meal-suggestions/:jobId

Get the status and result of a meal suggestion job.

**Response (200 OK - Pending)**:

```json
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "pending",
    "requestInfo": {
      "mealType": "dinner",
      "dietaryRestrictions": ["vegetarian"],
      "budget": 15,
      "servings": 2,
      "filters": {
        "cuisineType": "italian",
        "maxCookingTime": 30,
        "skillLevel": "intermediate"
      }
    },
    "createdAt": "2025-10-02T10:00:00Z"
  }
}
```

**Response (200 OK - Completed)**:

```json
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "completed",
    "result": {
      "meals": [
        {
          "name": "Margherita Pizza",
          "description": "Classic Italian pizza with fresh mozzarella and basil",
          "ingredients": [
            {
              "item": "Pizza dough",
              "quantity": "400g",
              "estimatedCostEur": 1.50
            },
            {
              "item": "Tomato sauce",
              "quantity": "200ml",
              "estimatedCostEur": 1.00
            },
            {
              "item": "Fresh mozzarella",
              "quantity": "250g",
              "estimatedCostEur": 3.50
            },
            {
              "item": "Fresh basil",
              "quantity": "1 bunch",
              "estimatedCostEur": 1.00
            },
            {
              "item": "Olive oil",
              "quantity": "2 tbsp",
              "estimatedCostEur": 0.50
            }
          ],
          "recipe": [
            "Preheat oven to 250°C (480°F) with pizza stone if available",
            "Roll out pizza dough on a floured surface to 30cm diameter",
            "Spread tomato sauce evenly, leaving 2cm border",
            "Tear mozzarella and distribute evenly over sauce",
            "Drizzle with olive oil",
            "Bake for 10-12 minutes until crust is golden and cheese bubbles",
            "Remove from oven, top with fresh basil leaves",
            "Slice and serve immediately"
          ],
          "totalCostEur": 12.50,
          "cookingTimeMin": 25,
          "servings": 2,
          "difficulty": "intermediate",
          "cuisineType": "Italian",
          "nutritionInfo": {
            "calories": 450,
            "protein": 20,
            "carbs": 50,
            "fat": 15
          }
        },
        {
          "name": "Pasta Primavera",
          "description": "Fresh vegetable pasta with herbs and parmesan",
          "ingredients": [...],
          "recipe": [...],
          "totalCostEur": 13.00,
          "cookingTimeMin": 20,
          "servings": 2,
          "difficulty": "easy",
          "cuisineType": "Italian",
          "nutritionInfo": {...}
        },
        {
          "name": "Caprese Salad with Grilled Vegetables",
          "description": "Light and fresh Italian salad",
          "ingredients": [...],
          "recipe": [...],
          "totalCostEur": 14.50,
          "cookingTimeMin": 15,
          "servings": 2,
          "difficulty": "easy",
          "cuisineType": "Italian",
          "nutritionInfo": {...}
        }
      ],
      "totalMeals": 3,
      "avgCostEur": 13.33,
      "avgCookingTimeMin": 20,
      "aiProvider": "openai",
      "tokensUsed": 2500,
      "processingTimeMs": 12500,
      "cacheHit": false,
      "cachedUntil": "2025-10-09T10:00:15Z"
    },
    "processingStartedAt": "2025-10-02T10:00:01Z",
    "processingCompletedAt": "2025-10-02T10:00:15Z",
    "processingTimeMs": 12500,
    "createdAt": "2025-10-02T10:00:00Z"
  }
}
```

**Response (200 OK - Failed)**:

```json
{
  "success": true,
  "data": {
    "jobId": "clxxx...",
    "status": "failed",
    "error": {
      "message": "AI service unavailable",
      "retryCount": 3
    },
    "createdAt": "2025-10-02T10:00:00Z"
  }
}
```

---

### GET /api/meal-suggestions/history

Get the user's meal suggestion history.

**Query Parameters**:
- `limit` (optional): Number of results (1-100, default 20)
- `offset` (optional): Pagination offset (default 0)
- `status` (optional): Filter by status (pending, processing, completed, failed)
- `mealType` (optional): Filter by meal type

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "clxxx...",
        "status": "completed",
        "requestInfo": {
          "mealType": "dinner",
          "dietaryRestrictions": ["vegetarian"],
          "budget": 15,
          "servings": 2
        },
        "result": {
          "totalMeals": 3,
          "avgCostEur": 13.33,
          "avgCookingTimeMin": 20,
          "cacheHit": false
        },
        "createdAt": "2025-10-02T10:00:00Z",
        "processingTimeMs": 12500
      },
      ...
    ],
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### GET /api/meal-suggestions/analytics

Get analytics for the user's meal suggestions.

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "totalJobs": 15,
    "totalMeals": 45,
    "avgCostEur": 12.50,
    "avgCookingTime": 25,
    "averageProcessingTime": 10500,
    "mostRequestedMealType": "dinner",
    "mealTypeDistribution": {
      "dinner": { "count": 8, "percentage": 53 },
      "lunch": { "count": 5, "percentage": 33 },
      "breakfast": { "count": 2, "percentage": 13 }
    },
    "cacheHitRate": 47,
    "recentJobs": [...]
  }
}
```

---

### GET /api/meal-suggestions/metrics

Get system-wide metrics (admin only).

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "queue": {
      "waiting": 5,
      "active": 3,
      "completed": 1250,
      "failed": 15,
      "delayed": 0,
      "total": 1273
    },
    "database": {
      "totalJobs": 1250,
      "completedJobs": 1235,
      "failedJobs": 15,
      "totalMeals": 3705,
      "totalTokensUsed": 3125000,
      "avgCostEur": 12.75,
      "avgCookingTimeMin": 23,
      "avgProcessingTimeMs": 11200
    },
    "rates": {
      "completionRate": 99,
      "failureRate": 1
    }
  }
}
```

---

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus metrics at: `http://localhost:3004/metrics`

**Key Metrics**:

```promql
# Cache hit rate
rate(meal_suggestions_cache_hits_total{hit="true"}[5m]) /
rate(meal_suggestions_cache_hits_total[5m]) * 100

# Average processing time
rate(meal_suggestions_processing_duration_seconds_sum[5m]) /
rate(meal_suggestions_processing_duration_seconds_count[5m])

# AI tokens consumed
sum(rate(meal_suggestions_ai_tokens_total[1h])) by (ai_provider)

# Error rate
rate(meal_suggestions_errors_total[5m]) /
rate(meal_suggestions_jobs_total[5m]) * 100
```

---

## 🔒 Quota Limits

### Free Users

- **Daily Limit**: 5 requests/day
- **Token Cost**: 3 tokens per request
- **Max Daily Tokens**: 15 tokens

### Premium Users

- **Daily Limit**: 50 requests/day
- **Token Cost**: 3 tokens per request
- **Max Daily Tokens**: 150 tokens

**Quota resets**: Midnight UTC daily

---

## 🧪 Testing

### Manual Testing

```bash
# 1. Get authentication token
TOKEN=$(curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.token')

# 2. Create meal suggestion
JOB_ID=$(curl -X POST http://localhost:3004/api/meal-suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "dinner",
    "servings": 2,
    "budget": 15,
    "cuisineType": "italian"
  }' | jq -r '.data.jobId')

# 3. Wait 15 seconds for processing
sleep 15

# 4. Get result
curl http://localhost:3004/api/meal-suggestions/$JOB_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Run Automated Tests

```bash
cd server
npm test -- tests/mealSuggestions.test.js
```

---

## 🐛 Troubleshooting

### Jobs Stuck in "Pending"

**Check**:
1. Worker is running: `ps aux | grep mealSuggestionsWorker`
2. Redis is running: `redis-cli ping`
3. Worker logs: Check console output for errors

**Solution**:
```bash
# Restart worker
pkill -f mealSuggestionsWorker
node src/workers/mealSuggestionsWorker.js
```

### "Quota Exceeded" Error

**Check**:
- Current usage: `GET /api/meal-suggestions/history?status=completed`
- User tier: Free (5/day) vs Premium (50/day)

**Solution**:
- Wait until midnight UTC for quota reset
- Upgrade to premium for higher limits

### High Processing Times

**Check**:
- Cache hit rate (should be >50%): Check Prometheus metrics
- AI provider response times: Check worker logs

**Solution**:
- Verify Redis is running and connected
- Check AI provider status (OpenAI/Anthropic)
- Increase worker concurrency: `MEAL_SUGGESTIONS_WORKER_CONCURRENCY=5`

---

## 📚 Next Steps

1. **Read Full Documentation**: [MEAL_SUGGESTIONS_IMPLEMENTATION.md](./MEAL_SUGGESTIONS_IMPLEMENTATION.md)
2. **Set Up Monitoring**: Configure Grafana dashboards for metrics
3. **Optimize Caching**: Implement batch pre-calculation cron job
4. **Scale Workers**: Add more worker instances for high load
5. **Add Tests**: Write integration and load tests

---

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| Cache Hit Rate | 50%+ |
| Avg Response Time (cached) | <500ms |
| Avg Response Time (uncached) | <15s |
| Error Rate | <1% |
| Queue Processing Rate | >10 jobs/min |

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Support**: Slack #pluqla-dev
