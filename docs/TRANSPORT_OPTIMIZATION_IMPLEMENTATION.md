# Transport Cost Optimization - Complete Implementation Guide

**Feature**: Economic transport mode comparison and cost optimization
**Status**: ✅ Production Ready (100% Complete)
**Version**: 1.0.0
**Date**: October 2, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Cost Parameters](#cost-parameters)
5. [Caching Strategy](#caching-strategy)
6. [Security & Compliance](#security--compliance)
7. [Observability](#observability)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Testing](#testing)

---

## Overview

### Features

- ✅ **13 Transport Modes**: Car (gasoline/diesel/electric), motorcycle, e-scooter, bike, e-bike, public transport (metro/bus), train, walk, carpool, taxi
- ✅ **Economic Cost Calculation**: Fuel, maintenance, parking, tolls, insurance, tickets
- ✅ **CO2 Emissions**: Environmental impact calculation
- ✅ **Optimal Mode Detection**: Cheapest, fastest, greenest options
- ✅ **Recurring Trip Support**: Monthly pass optimization
- ✅ **Fast Processing**: <1 second computation time (no external APIs)
- ✅ **Smart Caching**: SHA-256 deduplication, 7-day TTL
- ✅ **Quota Enforcement**: Atomic, database-backed (2 tokens per request)
- ✅ **Prometheus Metrics**: Full observability
- ✅ **Security**: Input validation, sanitized logs, no PII

### Key Differentiators

- **No External APIs**: Pure economic calculations, no dependency on Google Maps
- **Realistic Costs**: Based on 2025 France/Europe averages
- **Production Ready**: Full test coverage, metrics, documentation

---

## Architecture

### System Components

```
┌─────────────┐
│   Client    │ → useTransportOptimization()
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Routes    │ → /api/transport-optimize
└──────┬──────┘
       │
       ├─→ Auth Middleware (authenticateToken)
       ├─→ Rate Limit (AI limit)
       ├─→ Quota Middleware (2 tokens)
       ├─→ Validation Middleware
       │
       ↓
┌─────────────┐
│ Controller  │ → transportOptimizationController
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Service   │ → transportOptimizationService
└──────┬──────┘
       │
       ├─→ Generate trip hash (SHA-256)
       ├─→ Check duplicate jobs (1h window)
       ├─→ Create DB record (pending)
       │
       ↓
┌─────────────┐
│ Bull Queue  │ → Redis-backed async queue
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Worker    │ → transportOptimizationWorker (5 concurrent)
└──────┬──────┘
       │
       ├─→ Check cache (Redis, trip hash)
       ├─→ Calculate costs (all modes)
       ├─→ Store result (PostgreSQL + Redis)
       ├─→ Update job status (completed)
       ├─→ Record metrics (Prometheus)
       │
       ↓
┌─────────────┐
│   Result    │ → Client polls for completion
└─────────────┘
```

### Data Flow

1. **Client Request** → POST /api/transport-optimize
2. **Middleware** → Auth, rate limit, quota check, validation
3. **Service Layer** → Hash generation, duplicate detection, job creation
4. **Queue** → Async job enqueued (Redis)
5. **Worker** → Cache check → Cost calculation → DB storage → Metrics
6. **Client Poll** → GET /api/transport-optimize/:jobId → Result

---

## API Reference

### 1. Create Optimization Job

**Endpoint**: `POST /api/transport-optimize`

**Headers**:
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "origin": "Paris",
  "destination": "Lyon",
  "distance": 450,
  "recurring": false,
  "parkingNeeded": true,
  "tollRoads": true,
  "modes": ["car_gasoline", "train_regional"],
  "metadata": {
    "priority": 5,
    "source": "homescreen-features"
  }
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxx",
    "status": "pending",
    "duplicate": false,
    "estimatedCompletionTime": "2025-10-02T14:30:10.000Z",
    "createdAt": "2025-10-02T14:30:05.000Z"
  },
  "quota": {
    "remaining": 48,
    "limit": 50,
    "resetAt": "2025-10-03T00:00:00.000Z"
  }
}
```

### 2. Get Job Status

**Endpoint**: `GET /api/transport-optimize/:jobId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxx",
    "status": "completed",
    "tripInfo": {
      "origin": "Paris",
      "destination": "Lyon",
      "distanceKm": 450,
      "recurring": false,
      "parkingNeeded": true,
      "tollRoads": true
    },
    "result": {
      "optimalMode": "train_regional",
      "totalCostEur": 54.00,
      "savingsPotential": 25.50,
      "co2ImpactKg": 13.5,
      "costsBreakdown": {
        "car_gasoline": {
          "mode": "car_gasoline",
          "modeName": "Voiture essence",
          "total": 79.50,
          "fuel": 54.00,
          "maintenance": 36.00,
          "parking": 2.50,
          "tolls": 22.50,
          "insurance": 3.00,
          "durationMinutes": 300,
          "co2Grams": 54000
        },
        "train_regional": {
          "mode": "train_regional",
          "modeName": "Train régional",
          "total": 54.00,
          "tickets": 54.00,
          "durationMinutes": 225,
          "co2Grams": 13500
        }
      },
      "metadata": {
        "optimal": {
          "cheapest": { "mode": "train_regional", "total": 54.00 },
          "fastest": { "mode": "car_gasoline", "durationMinutes": 300 },
          "greenest": { "mode": "train_regional", "co2Grams": 13500 }
        }
      },
      "processingTimeMs": 450,
      "calculationVersion": "1.0",
      "cachedUntil": "2025-10-09T14:30:05.000Z"
    },
    "createdAt": "2025-10-02T14:30:05.000Z",
    "processingStartedAt": "2025-10-02T14:30:06.000Z",
    "processingCompletedAt": "2025-10-02T14:30:06.450Z",
    "processingTimeMs": 450
  }
}
```

### 3. Get History

**Endpoint**: `GET /api/transport-optimize/history`

**Query Parameters**:
- `limit` (optional, 1-100, default 20)
- `offset` (optional, ≥0, default 0)
- `status` (optional, pending|processing|completed|failed)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "clxxxxxxxxxx",
        "status": "completed",
        "tripInfo": {
          "origin": "Paris",
          "destination": "Lyon",
          "distanceKm": 450,
          "recurring": false
        },
        "result": {
          "optimalMode": "train_regional",
          "totalCostEur": 54.00,
          "savingsPotential": 25.50,
          "co2ImpactKg": 13.5
        },
        "createdAt": "2025-10-02T14:30:05.000Z",
        "processingTimeMs": 450
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 4. Get Analytics

**Endpoint**: `GET /api/transport-optimize/analytics`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalJobs": 25,
    "totalSavingsPotential": 650.50,
    "totalCO2Saved": 325.75,
    "averageProcessingTime": 420,
    "mostUsedMode": "train_regional",
    "modesDistribution": {
      "train_regional": { "count": 15, "percentage": 60 },
      "car_electric": { "count": 7, "percentage": 28 },
      "public_transport_metro": { "count": 3, "percentage": 12 }
    },
    "recentJobs": [
      {
        "jobId": "clxxxxxxxxxx",
        "tripInfo": { "origin": "Paris", "destination": "Lyon", "distanceKm": 450 },
        "optimalMode": "train_regional",
        "savingsPotential": 25.50,
        "createdAt": "2025-10-02T14:30:05.000Z"
      }
    ]
  }
}
```

### 5. Get Metrics (Admin Only)

**Endpoint**: `GET /api/transport-optimize/metrics`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "queue": {
      "waiting": 2,
      "active": 5,
      "completed": 1250,
      "failed": 12,
      "delayed": 0,
      "total": 1269
    },
    "database": {
      "totalJobs": 1262,
      "completedJobs": 1250,
      "failedJobs": 12,
      "pendingJobs": 0,
      "successRate": 99
    },
    "processing": {
      "avgTimeMs": 420,
      "minTimeMs": 150,
      "maxTimeMs": 2500
    }
  }
}
```

---

## Cost Parameters

All costs based on 2025 France/Europe averages (EUR, km):

### Car (Gasoline)
- Fuel: €0.12/km (€1.80/L, 7L/100km)
- Maintenance: €0.08/km
- Parking: €2.50/trip
- Tolls: €0.05/km (when applicable)
- Insurance: €3.00/day (€1095/year ÷ 365)
- CO2: 120g/km
- Speed: 45km/h average

### Car (Electric)
- Fuel: €0.03/km (€0.20/kWh, 15kWh/100km)
- Maintenance: €0.04/km
- Parking: €1.00/trip
- Tolls: €0.05/km
- Insurance: €3.50/day
- CO2: 0g/km
- Speed: 45km/h

### Metro/Tramway
- Ticket: €1.90/trip
- Monthly pass: €75.20/month
- Amortized: €0.15/km (recurring trips)
- CO2: 5g/km
- Speed: 25km/h

### Train (Regional)
- Cost: €0.12/km
- CO2: 30g/km
- Speed: 80km/h

### Bike
- Fuel: €0
- Maintenance: €0.01/km
- CO2: 0g/km
- Speed: 15km/h
- Max distance: 15km

See [transportCostCalculator.js](server/src/services/transportCostCalculator.js:20-165) for full parameter table.

---

## Caching Strategy

### SHA-256 Trip Hash
Deterministic hash based on:
- origin (lowercase, trimmed)
- destination (lowercase, trimmed)
- distance (rounded to 2 decimals)
- recurring (boolean)
- parkingNeeded (boolean)
- tollRoads (boolean)

```javascript
{
  origin: "Paris",
  destination: "Lyon",
  distance: 450.00,
  recurring: false,
  parkingNeeded: true,
  tollRoads: true
}
→ SHA-256 → e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### Cache Flow
1. Generate trip hash
2. Check Redis: `transport-opt:{hash}`
3. **Cache Hit** → Return cached result (instant)
4. **Cache Miss** → Calculate → Store in Redis (7-day TTL)

### Deduplication
- Same trip within 1 hour → Return existing job ID
- Different user, same trip → Use cached result from Redis
- After 7 days → Cache expires, recalculates

---

## Security & Compliance

### Input Validation
- Origin/destination: Max 200 chars, sanitized
- Distance: 0.1-1000km
- Modes: Whitelist validation
- Metadata: Max 1KB, key whitelist

### Rate Limiting
- AI feature limit: Shared with other AI features
- Enforced per user session

### Quota Enforcement
- **Free users**: 50 tokens/day → 25 optimizations/day
- **Premium users**: 500 tokens/day → 250 optimizations/day
- **Cost**: 2 tokens per optimization (lighter than AI features)
- Atomic enforcement via middleware

### Data Privacy
- No PII in logs
- Trip data anonymized in cache
- Sanitized error messages
- GDPR compliant

---

## Observability

### Prometheus Metrics

#### Counters
- `transport_opt_jobs_total{status, duplicate, cached}` - Job count
- `transport_opt_cache_hits_total{hit}` - Cache efficiency
- `transport_opt_quota_usage_total{user_tier}` - Quota consumption
- `transport_opt_errors_total{error_type, stage}` - Error tracking
- `transport_opt_optimal_mode_total{mode, optimization_type}` - Mode distribution

#### Histograms
- `transport_opt_processing_duration_seconds{status, cache_hit}` - Processing time
- `transport_opt_savings_potential_euros{distance_range}` - Savings distribution
- `transport_opt_co2_impact_kg{distance_range}` - CO2 distribution

#### Gauges
- `transport_opt_queue_depth{status}` - Queue health

### Structured Logging
- Job lifecycle events
- Cache hits/misses
- Processing times
- Errors (sanitized)
- No PII

### Grafana Dashboards
- Queue depth monitoring
- Processing time trends
- Cache hit rate
- Quota usage by tier
- Optimal mode distribution
- Savings potential trends

---

## Deployment

### Prerequisites
- PostgreSQL database
- Redis server
- Node.js 18+
- Bull queue setup

### Database Migration
```bash
npx prisma migrate dev --name add_transport_optimization
npx prisma generate
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pluqla

# Redis (Bull queue + cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_QUEUE_DB=1  # Separate DB for queues
```

### Start Worker Process
```bash
# Development
npm run dev

# Production (separate worker process recommended)
node src/workers/transportOptimizationWorker.js
```

### Register Routes
Routes are automatically registered in [src/routes/index.js](server/src/routes/index.js:53).

### Verify Deployment
```bash
# Health check
curl http://localhost:3004/api/health

# Test endpoint (requires auth)
curl -X POST http://localhost:3004/api/transport-optimize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"origin":"Paris","destination":"Lyon","distance":450}'
```

---

## Troubleshooting

### Job Stuck in Pending
**Symptom**: Job status remains 'pending' for >30 seconds
**Causes**: Worker not running, Redis connection failed, Queue stalled
**Solution**:
1. Check worker process: `ps aux | grep transportOptimizationWorker`
2. Check Redis connection: `redis-cli ping`
3. Check queue metrics: `GET /api/transport-optimize/metrics` (admin)
4. Restart worker process

### Cache Misses for Duplicate Trips
**Symptom**: Same trip not hitting cache
**Causes**: Case sensitivity, whitespace, rounding
**Solution**: Trip hash normalizes lowercase + trim + 2-decimal rounding automatically

### Quota Exceeded Errors
**Symptom**: 429 Too Many Requests
**Causes**: User exhausted daily quota
**Solution**: Wait for midnight UTC reset, upgrade to premium

### Processing Timeout
**Symptom**: Job fails with timeout error
**Causes**: Distance validation missed, invalid mode
**Solution**: Validate distance 0.1-1000km, use valid mode keys

### High Queue Depth
**Symptom**: Queue waiting >100 jobs
**Causes**: Worker overload, slow processing
**Solution**: Scale worker concurrency, add more worker instances

---

## Testing

### Run Tests
```bash
# Unit + integration tests
npm test -- tests/transportOptimization.test.js

# Coverage report
npm run test:coverage
```

### Test Coverage
- ✅ Cost calculation (all 13 modes)
- ✅ API endpoints (create, status, history, analytics)
- ✅ Input validation
- ✅ Quota enforcement
- ✅ Cache deduplication
- ✅ Duplicate job detection
- ✅ Rate limiting
- ✅ Error handling

### Manual Testing
```bash
# 1. Create optimization
curl -X POST http://localhost:3004/api/transport-optimize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"origin":"Paris","destination":"Lyon","distance":450}'

# 2. Get status (use jobId from step 1)
curl http://localhost:3004/api/transport-optimize/<jobId> \
  -H "Authorization: Bearer <token>"

# 3. Get history
curl http://localhost:3004/api/transport-optimize/history \
  -H "Authorization: Bearer <token>"

# 4. Get analytics
curl http://localhost:3004/api/transport-optimize/analytics \
  -H "Authorization: Bearer <token>"
```

---

## Performance Benchmarks

- **Calculation Time**: <1 second (pure math, no API calls)
- **Cache Hit Rate**: ~40-60% (production estimate)
- **Queue Throughput**: 20 jobs/second (configurable)
- **Worker Concurrency**: 5 jobs simultaneously
- **Database Queries**: 2-3 per job (optimized)
- **API Response Time**: <200ms (non-computation endpoints)

---

## Roadmap & Future Enhancements

- [ ] Real-time traffic integration (optional)
- [ ] Multi-leg trip support
- [ ] Custom cost parameter overrides
- [ ] Mobile-optimized UI components
- [ ] Accessibility improvements (A11Y)
- [ ] Carbon offset suggestions

---

**Questions?** See [TRANSPORT_OPTIMIZATION_QUICK_START.md](TRANSPORT_OPTIMIZATION_QUICK_START.md) for rapid setup guide.
