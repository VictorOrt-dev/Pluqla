# Meal Suggestions - Implementation Guide

**Production-Ready AI-Powered Meal Suggestions Feature for Pluqla**

---

## 🎯 Overview

The Meal Suggestions feature provides users with AI-generated meal recommendations based on their preferences, dietary restrictions, budget, and cooking skills. It's designed for high performance with aggressive caching and batch pre-calculation to minimize AI costs.

### Key Features

✅ **3-5 AI-generated meals per request** with:
- Complete ingredients list with estimated costs
- Step-by-step recipe instructions
- Total estimated cost (EUR)
- Cooking time (minutes)
- Nutritional information
- Difficulty level

✅ **Async Processing** via Bull Queue + Redis

✅ **Aggressive Caching** (SHA-256 hash-based, 7-day TTL, ~50%+ hit rate target)

✅ **Quota Enforcement**:
- Free users: 5 requests/day (cost: 3 tokens each = 15 tokens/day max)
- Premium users: 50 requests/day (cost: 3 tokens each = 150 tokens/day max)

✅ **Multi-Provider AI Support**: OpenAI, Claude, Gemini

✅ **Prometheus Metrics** for monitoring and cost optimization

✅ **Comprehensive Security**: Authentication, rate limiting, input validation, CSRF protection

---

## 📁 Architecture

### Components

```
server/
├── src/
│   ├── services/
│   │   ├── mealSuggestionsService.js          # Core business logic
│   │   ├── aiMealService.js                   # Multi-provider AI integration
│   │   └── mealSuggestionsMetricsService.js   # Prometheus metrics
│   ├── queues/
│   │   └── mealSuggestionsQueue.js            # Bull queue configuration
│   ├── workers/
│   │   └── mealSuggestionsWorker.js           # Async job processor
│   ├── controllers/
│   │   └── mealSuggestionsController.js       # HTTP request handlers
│   ├── routes/
│   │   └── mealSuggestions.js                 # API routes
│   └── middleware/
│       └── validation/
│           └── mealSuggestionsValidation.js   # Input validation
└── prisma/
    └── schema.prisma                           # Database models
```

### Database Schema

#### **MealSuggestionJob**
Stores job metadata and request parameters.

```prisma
model MealSuggestionJob {
  id                    String                @id @default(cuid())
  userId                String
  status                String                @default("pending")
  requestHash           String                # SHA-256 hash for deduplication
  mealType              String?
  dietaryRestrictions   String?               # JSON array
  budget                Float?
  servings              Int?
  filters               String?               # JSON object
  processingStartedAt   DateTime?
  processingCompletedAt DateTime?
  errorMessage          String?
  retryCount            Int                   @default(0)
  metadata              String?
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  user                  User                  @relation(...)
  result                MealSuggestionResult?
}
```

#### **MealSuggestionResult**
Stores generated meal suggestions.

```prisma
model MealSuggestionResult {
  id                String            @id @default(cuid())
  jobId             String            @unique
  userId            String
  mealsData         String            # JSON array of meals
  totalMeals        Int               @default(0)
  avgCostEur        Float             @default(0)
  avgCookingTimeMin Int               @default(0)
  aiProvider        String            # openai, anthropic, cached
  tokensUsed        Int               @default(0)
  processingTimeMs  Int
  cacheKey          String
  cachedUntil       DateTime          # 7 days from creation
  metadata          String?
  createdAt         DateTime          @default(now())
}
```

#### **MealSuggestionCache**
Stores pre-calculated generic meals for instant serving.

```prisma
model MealSuggestionCache {
  id             String   @id @default(cuid())
  cacheKey       String   @unique
  category       String                  # generic, breakfast, lunch, dinner
  mealType       String?
  mealsData      String                  # JSON array
  totalMeals     Int      @default(0)
  avgCostEur     Float    @default(0)
  avgCookingTime Int      @default(0)
  expiresAt      DateTime
  metadata       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 🔄 Request Flow

### 1. User Submits Request

```http
POST /api/meal-suggestions
Authorization: Bearer <token>
Content-Type: application/json

{
  "mealType": "dinner",
  "dietaryRestrictions": ["vegetarian"],
  "budget": 15,
  "servings": 2,
  "cuisineType": "italian",
  "maxCookingTime": 30,
  "skillLevel": "intermediate",
  "avoidIngredients": ["mushrooms"],
  "preferredIngredients": ["tomatoes", "basil"]
}
```

### 2. Middleware Stack

```
Request → authenticateToken → addQuotaToResponse → rateLimit.ai →
aiQuotaMiddleware('meal_suggestions', 3 tokens) →
validateMealSuggestionCreate → Controller
```

### 3. Service Layer

**mealSuggestionsService.createMealSuggestionJob**:
1. Generate SHA-256 hash from request parameters
2. Check for duplicate jobs (within 1 hour)
3. If duplicate found → return existing job
4. Create job record in database
5. Enqueue job in Bull queue
6. Return job ID to client

### 4. Worker Processing

**mealSuggestionsWorker.processMealSuggestionJob**:
1. Update job status to 'processing'
2. Check Redis cache (by request hash)
3. If cache hit → store cached result + complete job
4. If cache miss → call AI service
5. Store result in database
6. Cache result in Redis (7-day TTL)
7. Update job status to 'completed'
8. Record Prometheus metrics

### 5. AI Service

**aiMealService.generateMealSuggestions**:
1. Build structured prompt with user preferences
2. Call AI provider (OpenAI/Claude/Mock)
3. Parse and validate AI response
4. Calculate statistics (avg cost, cooking time)
5. Return structured meal data

### 6. Client Polls for Result

```http
GET /api/meal-suggestions/:jobId
Authorization: Bearer <token>

Response (202 - Processing):
{
  "success": true,
  "data": {
    "jobId": "clxxx",
    "status": "processing",
    "requestInfo": {...},
    "createdAt": "2025-10-02T10:00:00Z"
  }
}

Response (200 - Completed):
{
  "success": true,
  "data": {
    "jobId": "clxxx",
    "status": "completed",
    "result": {
      "meals": [
        {
          "name": "Margherita Pizza",
          "description": "Classic Italian pizza with fresh mozzarella and basil",
          "ingredients": [
            {"item": "Pizza dough", "quantity": "400g", "estimatedCostEur": 1.50},
            {"item": "Tomato sauce", "quantity": "200ml", "estimatedCostEur": 1.00},
            ...
          ],
          "recipe": [
            "Preheat oven to 250°C",
            "Roll out dough on floured surface",
            ...
          ],
          "totalCostEur": 12.50,
          "cookingTimeMin": 25,
          "servings": 2,
          "difficulty": "intermediate",
          "cuisineType": "italian",
          "nutritionInfo": {
            "calories": 450,
            "protein": 20,
            "carbs": 50,
            "fat": 15
          }
        },
        ...
      ],
      "totalMeals": 3,
      "avgCostEur": 13.50,
      "avgCookingTimeMin": 28,
      "cacheHit": false,
      "tokensUsed": 2500
    }
  }
}
```

---

## 🎯 Caching Strategy

### Cache Key Generation

SHA-256 hash based on normalized request parameters:

```javascript
const hashInput = JSON.stringify({
  mealType: requestData.mealType?.toLowerCase().trim() || 'any',
  dietaryRestrictions: (requestData.dietaryRestrictions || [])
    .map(r => r.toLowerCase().trim())
    .sort()
    .join(','),
  budget: requestData.budget ? Math.round(requestData.budget * 100) / 100 : null,
  servings: requestData.servings || 2,
  cuisineType: requestData.cuisineType?.toLowerCase().trim() || null,
  maxCookingTime: requestData.maxCookingTime || null,
  skillLevel: requestData.skillLevel?.toLowerCase().trim() || null,
  avoidIngredients: (requestData.avoidIngredients || [])
    .map(i => i.toLowerCase().trim())
    .sort()
    .join(',')
});

const requestHash = crypto.createHash('sha256').update(hashInput).digest('hex');
```

### Cache Layers

1. **Redis Cache** (fastest): 7-day TTL, key = `meal-suggestions:{hash}`
2. **Database Cache** (MealSuggestionCache table): Pre-calculated generic meals
3. **Job Deduplication**: Recent jobs (1-hour window) by hash

### Target Cache Hit Rate

- **Goal**: 50%+ cache hit rate
- **Actual**: Monitor via `meal_suggestions_cache_hits_total` metric
- **Cost Savings**: Each cache hit saves ~2500 AI tokens (~$0.025 per request)

---

## 📊 Prometheus Metrics

### Counters

- `meal_suggestions_jobs_total{status, duplicate, cached}` - Total jobs created
- `meal_suggestions_cache_hits_total{hit}` - Cache hits vs misses
- `meal_suggestions_ai_tokens_total{ai_provider}` - AI tokens consumed
- `meal_suggestions_tokens_saved_total` - Tokens saved via caching
- `meal_suggestions_errors_total{error_type, stage}` - Errors
- `meal_suggestions_meals_generated_total{meal_type, ai_provider}` - Meals generated

### Histograms

- `meal_suggestions_processing_duration_seconds{status, cache_hit, ai_provider}` - Processing time
- `meal_suggestions_avg_cost_euros{meal_type}` - Average meal cost
- `meal_suggestions_cooking_time_minutes{meal_type}` - Cooking time distribution

### Gauges

- `meal_suggestions_queue_depth{status}` - Queue depth by status (waiting, active, completed, failed)

---

## 🔒 Security

### Authentication & Authorization
- All endpoints require JWT authentication
- Users can only access their own jobs
- Admin-only endpoints (metrics) verified via role check

### Rate Limiting
- **AI endpoints**: 10 requests/minute per user
- **Standard endpoints**: 100 requests/minute per user

### Input Validation
- **Servings**: 1-20
- **Budget**: 0-200 EUR
- **Cooking time**: 5-300 minutes
- **Dietary restrictions**: Max 10, whitelist validation
- **Ingredients lists**: Max 20 items, 50 chars each

### Quota Enforcement
- Atomic consumption via `consumeTokensAtomic()` (race-condition safe)
- Pre-flight quota check before job creation
- Daily quota resets at midnight UTC

### Data Sanitization
- All user inputs trimmed and length-limited
- Error messages sanitized (no API keys, paths, or PII)
- Logs structured (no sensitive data)

---

## 🚀 Deployment

### Environment Variables

```bash
# AI Provider Configuration
AI_PROVIDER=openai                    # openai, anthropic, or mock
OPENAI_API_KEY=sk-...                # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...         # Anthropic API key (optional)

# Redis Configuration (required for queues and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                      # Optional
REDIS_DB=0                           # Default: 0
REDIS_QUEUE_DB=1                     # Separate DB for Bull queues

# Worker Configuration
MEAL_SUGGESTIONS_WORKER_CONCURRENCY=3  # Number of concurrent jobs (default: 3)

# Quota Configuration (handled by aiUsageService)
# Free: 50 tokens/day, Premium: 500 tokens/day
# meal_suggestions cost: 3 tokens/request
```

### Database Migration

```bash
cd server
npx prisma migrate dev --name add_meal_suggestions
npx prisma generate
```

### Worker Startup

The worker must be started to process jobs:

```bash
cd server
node src/workers/mealSuggestionsWorker.js
```

Or include in your main server process:

```javascript
// server/index.js or server.js
require('./src/workers/mealSuggestionsWorker');
```

### Health Check

```bash
curl http://localhost:3004/api/meal-suggestions/metrics
```

---

## 📈 Monitoring & Observability

### Key Metrics Dashboard

```promql
# Cache Hit Rate (target: 50%+)
rate(meal_suggestions_cache_hits_total{hit="true"}[5m]) /
rate(meal_suggestions_cache_hits_total[5m]) * 100

# Average Processing Time (target: <15s)
rate(meal_suggestions_processing_duration_seconds_sum[5m]) /
rate(meal_suggestions_processing_duration_seconds_count[5m])

# AI Tokens Consumed (cost tracking)
sum(rate(meal_suggestions_ai_tokens_total[1h])) by (ai_provider)

# Tokens Saved (cost savings)
rate(meal_suggestions_tokens_saved_total[1h])

# Error Rate (target: <1%)
rate(meal_suggestions_errors_total[5m]) /
rate(meal_suggestions_jobs_total[5m]) * 100

# Queue Depth (should remain low)
meal_suggestions_queue_depth{status="waiting"}
```

### Grafana Dashboard

Create visualizations for:
- Request rate and completion rate
- Cache hit rate trend
- AI token consumption and cost
- Processing time percentiles (p50, p95, p99)
- Error rate by type
- Queue health (depth, processing time)

---

## 🧪 Testing

### Unit Tests

```bash
cd server
npm test -- tests/mealSuggestions.test.js
```

### Integration Tests

```bash
# Test quota enforcement
npm test -- tests/mealSuggestionsQuota.test.js

# Test caching
npm test -- tests/mealSuggestionsCache.test.js
```

### Load Testing

```bash
# Simulate concurrent users
npm run test:load -- --endpoint=/api/meal-suggestions --users=50
```

---

## 🔧 Troubleshooting

### High Queue Depth

**Symptom**: `meal_suggestions_queue_depth{status="waiting"}` > 100

**Solutions**:
1. Increase worker concurrency: `MEAL_SUGGESTIONS_WORKER_CONCURRENCY=5`
2. Scale workers horizontally (run multiple worker processes)
3. Check AI provider rate limits and quotas

### Low Cache Hit Rate

**Symptom**: Cache hit rate < 30%

**Analysis**:
1. Check if users are making highly customized requests
2. Verify cache TTL (should be 7 days)
3. Consider batch pre-calculation for popular combinations

### High AI Costs

**Symptom**: Token consumption > expected

**Solutions**:
1. Increase cache TTL to 14 days
2. Implement more aggressive pre-calculation
3. Reduce max_tokens in AI calls (currently 3000)
4. Use cheaper AI provider for specific request types

### Worker Not Processing Jobs

**Symptom**: Jobs stuck in 'pending' status

**Checks**:
1. Verify worker is running: `ps aux | grep mealSuggestionsWorker`
2. Check Redis connection: `redis-cli ping`
3. Review worker logs for errors
4. Verify Bull queue configuration

---

## 📚 API Reference

See [MEAL_SUGGESTIONS_QUICK_START.md](./MEAL_SUGGESTIONS_QUICK_START.md) for API endpoint documentation.

---

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Cache Hit Rate | 50%+ | Monitor via Prometheus |
| Avg Response Time (cached) | <500ms | Monitor via Prometheus |
| Avg Response Time (uncached) | <15s | Monitor via Prometheus |
| Queue Processing Rate | >10 jobs/min | Monitor via Prometheus |
| Error Rate | <1% | Monitor via Prometheus |
| Daily Token Consumption | <50,000 tokens | Monitor via Prometheus |
| Cost Per Request (cached) | €0.00 | €0.00 |
| Cost Per Request (uncached) | ~€0.025 | ~€0.025 (OpenAI GPT-4o-mini) |

---

## 🚀 Future Enhancements

1. **Batch Pre-Calculation Cron Job**: Nightly job to generate top 50 generic meal suggestions
2. **Smart Caching**: ML-based prediction of popular request patterns
3. **Personalization**: User taste profile learning over time
4. **Recipe Images**: Integration with image generation APIs
5. **Shopping List Export**: Generate shopping lists from meal suggestions
6. **Meal Planning**: Multi-day meal planning feature
7. **Cost Optimization**: Dynamic provider selection based on cost/quality

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Author**: Pluqla Dev Team
