# Transport Optimization - Quick Start Guide

**5-Minute Setup** | **Production Ready** | **Zero External Dependencies**

---

## ⚡ Quick Setup

### 1. Run Database Migration
```bash
cd server
npx prisma migrate dev --name add_transport_optimization
npx prisma generate
```

### 2. Configure Environment
Already configured if you have PostgreSQL + Redis running:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/pluqla
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Server (Worker Included)
```bash
npm run dev
```

Worker automatically starts with server. ✅

---

## 🧪 Test API

### Create Optimization
```bash
# Get auth token first
TOKEN="your-auth-token-here"

# Create optimization job
curl -X POST http://localhost:3004/api/transport-optimize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Paris",
    "destination": "Lyon",
    "distance": 450,
    "recurring": false,
    "parkingNeeded": true,
    "tollRoads": true
  }'
```

**Response**: Job ID + status
```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxx",
    "status": "pending",
    "estimatedCompletionTime": "2025-10-02T14:30:10.000Z"
  },
  "quota": { "remaining": 48, "limit": 50 }
}
```

### Get Result (Fast, ~1-5 seconds)
```bash
# Replace <jobId> with ID from previous response
curl http://localhost:3004/api/transport-optimize/<jobId> \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: Complete optimization result
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "result": {
      "optimalMode": "train_regional",
      "totalCostEur": 54.00,
      "savingsPotential": 25.50,
      "co2ImpactKg": 13.5,
      "costsBreakdown": { ... }
    }
  }
}
```

---

## 🎨 Frontend Integration

### Use Hook
```javascript
import { useTransportOptimization } from '../hooks/useTransportOptimization';

function TransportOptimizer() {
  const { submitTrip, loading, result, error, quota } = useTransportOptimization();

  const handleOptimize = async () => {
    try {
      const result = await submitTrip({
        origin: 'Paris',
        destination: 'Lyon',
        distance: 450,
        recurring: false,
        parkingNeeded: true,
        tollRoads: true
      });

      console.log('Optimal mode:', result.optimal.cheapest);
      console.log('Savings:', result.savings, '€');
      console.log('CO2:', result.optimal.greenest.co2Grams, 'g');
    } catch (err) {
      console.error('Optimization failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleOptimize} disabled={loading}>
        Optimize Transport
      </button>
      {loading && <p>Loading... {progress}%</p>}
      {result && <ResultDisplay result={result} />}
      {error && <p>Error: {error}</p>}
      {quota && <p>Quota: {quota.remaining}/{quota.limit}</p>}
    </div>
  );
}
```

---

## 📊 Monitoring

### Check Queue Health
```bash
# Admin only
curl http://localhost:3004/api/transport-optimize/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Prometheus Metrics
Available at: `http://localhost:3004/metrics`

Key metrics:
- `transport_opt_jobs_total` - Job count
- `transport_opt_processing_duration_seconds` - Processing time
- `transport_opt_cache_hits_total` - Cache efficiency
- `transport_opt_optimal_mode_total` - Mode distribution

---

## 🔍 Troubleshooting

### Job Stuck in Pending?
1. Check worker is running: `ps aux | grep transportOptimizationWorker`
2. Check Redis: `redis-cli ping`
3. Check logs: `tail -f logs/combined.log`

### Quota Exceeded?
- Free users: 25 optimizations/day (50 tokens)
- Premium users: 250 optimizations/day (500 tokens)
- Resets daily at midnight UTC

### Invalid Distance Error?
- Distance must be between 0.1 and 1000 km

---

## 📚 Full Documentation

See [TRANSPORT_OPTIMIZATION_IMPLEMENTATION.md](TRANSPORT_OPTIMIZATION_IMPLEMENTATION.md) for:
- Complete API reference
- Cost parameter details
- Architecture overview
- Security guidelines
- Performance benchmarks

---

## 🚀 Production Checklist

- [x] Database migration applied
- [x] Redis configured
- [x] Worker process running
- [x] Routes registered
- [x] Tests passing
- [x] Metrics configured
- [x] Logs structured
- [x] Error handling
- [x] Quota enforcement
- [x] Rate limiting

**Status**: Ready for production ✅

---

**Questions?** Check logs, metrics, or full documentation.
