# 📊 ML Recommendations Monitoring Guide

**Phase 9A - Complete Monitoring & Observability for ML System**

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Dashboard Overview](#dashboard-overview)
3. [Metrics Explained](#metrics-explained)
4. [Alerts & Response](#alerts--response)
5. [Performance Baselines](#performance-baselines)
6. [Troubleshooting](#troubleshooting)
7. [Optimization Tips](#optimization-tips)

---

## 🚀 Quick Start

### 1. Import Grafana Dashboard

```bash
# Copy dashboard JSON to Grafana
cp infra/grafana/dashboards/ml-recommendations-dashboard.json \
   /path/to/grafana/provisioning/dashboards/

# Or import via UI:
# 1. Login to Grafana (http://localhost:3000)
# 2. Go to Dashboards → Import
# 3. Upload: infra/grafana/dashboards/ml-recommendations-dashboard.json
```

### 2. Configure Prometheus Alerts

```bash
# Add to prometheus.yml
rule_files:
  - 'alerts/ml-alerts.yml'

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload

# Or restart Prometheus
docker-compose restart prometheus
```

### 3. Verify Metrics are Being Collected

```bash
# Check Prometheus is scraping ML metrics
curl http://localhost:9090/api/v1/query?query=ml_model_available

# Expected output:
# {
#   "status": "success",
#   "data": {
#     "resultType": "vector",
#     "result": [
#       {
#         "metric": {},
#         "value": [1234567890, "1"]  # 1 = model available
#       }
#     ]
#   }
# }
```

---

## 📊 Dashboard Overview

The **ML Recipe Recommendations** dashboard has **10 panels**:

### Top Row: Performance Overview

1. **🚀 ML Recommendation Latency** (Graph)
   - Shows p50, p95, p99 latency over time
   - Target: p95 < 2s (critical alert if > 5s)

2. **🤖 ML Usage Rate** (Gauge)
   - Percentage of recommendations using ML vs fallback
   - Target: > 80% (warning if < 70%, critical if < 20%)

3. **📦 ML Model Status** (Stat)
   - Binary: AVAILABLE (1) or NOT TRAINED (0)
   - Critical alert if 0 for > 30min

### Middle Row: Source & Engagement

4. **🎯 Recommendation Source Distribution** (Pie Chart)
   - Breakdown: ML Engine vs Fallback (Popular)
   - Visual representation of ML usage

5. **💬 User Engagement** (Stacked Bars)
   - Feedback rates: views, likes, favorites, dislikes
   - Shows user interaction trends

6. **📊 Recommendation Score Distribution** (Graph)
   - p50, p75, p95 of recommendation match scores
   - Target: p50 > 0.5 (warning if < 0.3)

### Bottom Row: Health & Efficiency

7. **📈 Recommendation Throughput** (Graph)
   - Requests per second, by source
   - Info alert if > 100 req/s (unusual traffic)

8. **⚠️ Fallback Usage Rate** (Gauge)
   - Percentage using fallback
   - Inverse of panel #2, shows degradation

9. **❤️ Favorite Conversion Rate** (Stat)
   - % of views that result in favorites
   - Target: > 5% (warning if < 2%)

10. **⏱️ Average Recommendation Latency Over Time** (Graph)
    - Mean latency trend
    - Threshold line at 5s (critical)

---

## 📐 Metrics Explained

### 1. `ml_recommendation_duration_seconds` (Histogram)

**Type**: Histogram
**Labels**: `source` (ml | fallback)
**Buckets**: [0.1, 0.5, 1, 2, 5, 10, 30] seconds

**Purpose**: Measures how long it takes to generate recommendations.

**PromQL Queries**:
```promql
# p95 latency by source
histogram_quantile(0.95,
  sum(rate(ml_recommendation_duration_seconds_bucket[5m])) by (le, source)
)

# Average latency
sum(rate(ml_recommendation_duration_seconds_sum[5m]))
/ sum(rate(ml_recommendation_duration_seconds_count[5m]))
```

**Good**: p95 < 500ms
**Target**: p95 < 2s
**Warning**: p95 > 2s
**Critical**: p95 > 5s

**Troubleshooting**:
- **High ML latency**: Python subprocess overhead, large model file, CPU bottleneck
- **High fallback latency**: Database slow queries, missing indexes

---

### 2. `ml_recommendation_source_total` (Counter)

**Type**: Counter
**Labels**: `source` (ml | fallback)

**Purpose**: Counts total recommendations served, by source.

**PromQL Queries**:
```promql
# Throughput (req/s) by source
sum(rate(ml_recommendation_source_total[5m])) by (source)

# ML usage percentage
100 * sum(rate(ml_recommendation_source_total{source="ml"}[5m]))
/ sum(rate(ml_recommendation_source_total[5m]))

# Fallback rate
100 * sum(rate(ml_recommendation_source_total{source="fallback"}[5m]))
/ sum(rate(ml_recommendation_source_total[5m]))
```

**Good**: ML > 90%, fallback < 10%
**Target**: ML > 80%, fallback < 20%
**Warning**: fallback > 30%
**Critical**: fallback > 80%

**Troubleshooting**:
- **High fallback rate**: Model not trained, Python errors, new users without data

---

### 3. `ml_recommendation_score` (Histogram)

**Type**: Histogram
**Labels**: `source`
**Buckets**: [0.1, 0.2, ..., 1.0]

**Purpose**: Tracks the confidence/quality scores of recommendations.

**PromQL Queries**:
```promql
# Median score
histogram_quantile(0.50,
  sum(rate(ml_recommendation_score_bucket[5m])) by (le, source)
)

# Score distribution (p25, p50, p75, p95)
histogram_quantile(0.25, sum(rate(ml_recommendation_score_bucket[5m])) by (le)),
histogram_quantile(0.50, sum(rate(ml_recommendation_score_bucket[5m])) by (le)),
histogram_quantile(0.75, sum(rate(ml_recommendation_score_bucket[5m])) by (le)),
histogram_quantile(0.95, sum(rate(ml_recommendation_score_bucket[5m])) by (le))
```

**Good**: p50 > 0.7
**Target**: p50 > 0.5
**Warning**: p50 < 0.3
**Critical**: p50 < 0.2

**Troubleshooting**:
- **Low scores**: Insufficient training data, model needs retraining, poor feature engineering

---

### 4. `ml_recommendation_feedback_total` (Counter)

**Type**: Counter
**Labels**: `action` (like | dislike | view | favorite)

**Purpose**: Tracks user interactions with recommendations.

**PromQL Queries**:
```promql
# Feedback rate by action
sum(rate(ml_recommendation_feedback_total[5m])) by (action)

# Favorite conversion rate (favorites / views)
100 * sum(rate(ml_recommendation_feedback_total{action="favorite"}[5m]))
/ sum(rate(ml_recommendation_feedback_total{action="view"}[5m]))

# Like ratio (likes / views)
100 * sum(rate(ml_recommendation_feedback_total{action="like"}[5m]))
/ sum(rate(ml_recommendation_feedback_total{action="view"}[5m]))
```

**Good**: Favorite rate > 10%
**Target**: Favorite rate > 5%
**Warning**: Favorite rate < 2%

**Insights**:
- High views + low favorites = recommendations not relevant
- High likes + high favorites = great personalization
- High dislikes = poor recommendations (needs investigation)

---

### 5. `ml_model_available` (Gauge)

**Type**: Gauge
**Values**: 1 (available) or 0 (not available)

**Purpose**: Binary health check for ML model.

**PromQL Queries**:
```promql
# Current model status
ml_model_available

# Uptime percentage (last 24h)
100 * avg_over_time(ml_model_available[24h])
```

**Target**: 1 (100% uptime)
**Critical**: 0 for > 30 minutes

**Troubleshooting**:
- **Value = 0**: Model file missing, not trained yet, corrupted

---

## 🚨 Alerts & Response

### Critical Alerts (P1) - Immediate Action Required

#### 1. MLModelNotAvailable

**Trigger**: `ml_model_available == 0` for 30 minutes

**Impact**: All users getting non-personalized recommendations

**Response Playbook**:

```bash
# Step 1: Check if model file exists
ls -lh server/ml-models/recommender_model.pkl

# If missing:
# Step 2: Export training data
cd server
node src/ml/export_training_data.js

# Step 3: Train model
python src/ml/train.py

# Step 4: Restart API (if needed)
pm2 restart pluqla-api

# Step 5: Verify model is now available
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3004/api/v1/ml/status
```

**Prevention**:
- Set up weekly cron job for model retraining
- Monitor disk space (model files can grow)
- Implement model health checks on startup

---

#### 2. MLHighLatency

**Trigger**: p95 latency > 5s for 10 minutes

**Impact**: Slow page loads, poor user experience

**Response Playbook**:

```bash
# Step 1: Check system resources
top -c
# Look for high CPU/memory usage by Python processes

# Step 2: Check model file size
du -h server/ml-models/recommender_model.pkl
# If > 100MB, model is too large

# Step 3: Check concurrent requests
ps aux | grep python | wc -l
# If > 50, too many Python subprocesses

# Step 4: Implement caching (temporary mitigation)
# Add Redis cache layer for frequently requested users

# Step 5: Restart API to clear any memory leaks
pm2 restart pluqla-api
```

**Prevention**:
- Implement Redis caching for ML results (TTL: 1h)
- Use connection pooling for Python subprocess
- Monitor model file size growth

---

#### 3. MLHighFallbackRate

**Trigger**: Fallback rate > 80% for 20 minutes

**Impact**: ML system effectively offline

**Response Playbook**:

```bash
# Step 1: Check Python subprocess errors
journalctl -u pluqla-api -n 100 | grep "ML"
# or
pm2 logs pluqla-api --lines 100 | grep "ML"

# Step 2: Test Python inference manually
python server/src/ml/predict.py --user-id test_user --n 5

# If error:
# Step 3: Check Python dependencies
pip install -r server/requirements.txt

# Step 4: Verify training data exists
ls -lh server/ml-data/

# Step 5: Retrain model
python server/src/ml/train.py

# Step 6: Monitor fallback rate
# Should drop below 20% within 5 minutes
```

**Root Causes**:
- Python errors (import errors, syntax errors)
- Model file corrupted
- Insufficient training data
- Database connection issues

---

### Warning Alerts (P2) - Investigate Within Hours

#### 4. MLModerateFallbackRate

**Trigger**: Fallback rate > 30% for 30 minutes

**Context**: May be normal for:
- Many new users (no favorites yet)
- Recent deployment/restart
- Peak traffic hours

**Action**: Monitor trend, investigate if persists > 1h

---

#### 5. MLLowRecommendationScores

**Trigger**: p50 score < 0.3 for 1 hour

**Meaning**: Recommendations are low-quality/confidence

**Response**:
1. Check user growth: Many new users = expected
2. Review training data freshness: > 7 days old?
3. Schedule model retraining
4. Consider algorithm tuning (collaborative/content weights)

---

#### 6. MLLowEngagementRate

**Trigger**: Favorite rate < 2% for 2 hours

**Meaning**: Users not finding recommendations relevant

**Response**:
1. Review recommendation explanations accuracy
2. A/B test different explanation templates
3. Survey users for feedback
4. Analyze dislike patterns
5. Consider retraining with recent interaction data

---

### Info Alerts (P3) - Informational

#### 7. MLModelStale

**Trigger**: Model age > 7 days

**Action**: Schedule retraining to capture recent preferences

```bash
python server/src/ml/train.py
```

---

## 📈 Performance Baselines

### Latency Targets

| Metric | Excellent | Good | Warning | Critical |
|--------|-----------|------|---------|----------|
| p50 | < 200ms | < 500ms | < 1s | > 2s |
| p95 | < 400ms | < 1s | < 2s | > 5s |
| p99 | < 800ms | < 2s | < 5s | > 10s |

### Quality Targets

| Metric | Excellent | Good | Warning | Critical |
|--------|-----------|------|---------|----------|
| ML Usage Rate | > 95% | > 80% | > 50% | < 20% |
| Fallback Rate | < 5% | < 20% | < 50% | > 80% |
| Score p50 | > 0.7 | > 0.5 | > 0.3 | < 0.2 |
| Favorite Rate | > 10% | > 5% | > 2% | < 1% |

### Throughput Baselines

| Users | Expected req/s | Alert Threshold |
|-------|----------------|-----------------|
| 100 | 0.1 - 1 | > 10 |
| 1,000 | 1 - 10 | > 100 |
| 10,000 | 10 - 50 | > 500 |
| 100,000 | 50 - 200 | > 2,000 |

---

## 🔧 Troubleshooting

### Problem: Dashboard shows no data

**Symptoms**: All panels are empty

**Diagnosis**:
```bash
# Check if Prometheus is scraping ML metrics
curl http://localhost:9090/api/v1/query?query=ml_model_available

# Check if app is running
curl http://localhost:3004/health
```

**Fix**:
1. Ensure API server is running
2. Verify Prometheus scrape config includes app endpoint
3. Check firewall rules (ports 3004, 9090, 3000)

---

### Problem: ML latency spikes

**Symptoms**: Periodic spikes in latency graph

**Diagnosis**:
```bash
# Check Python subprocess count
ps aux | grep "python.*predict" | wc -l

# Check model file size
du -h server/ml-models/recommender_model.pkl

# Monitor Python memory usage
watch -n 1 'ps aux | grep python | grep -v grep'
```

**Fix**:
- Implement subprocess pooling
- Add Redis caching layer
- Optimize model size (reduce features)

---

### Problem: Low engagement despite good scores

**Symptoms**: High match scores but low favorite rate

**Diagnosis**: Disconnect between algorithm and user expectations

**Fix**:
1. Review explanation accuracy ("Because you like X" → verify X is in user's favorites)
2. A/B test different UI presentations
3. Add user survey: "Why didn't you favorite this?"
4. Analyze user segments (new vs returning)

---

## 🎯 Optimization Tips

### 1. Caching Strategy

Implement Redis caching for frequently requested users:

```javascript
// In mlRecommendationService.js
const cacheKey = `ml:recs:${userId}:n${n}:budget${budgetMax}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await getMLRecommendations(userId, options);

await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1h TTL
return result;
```

**Impact**: Reduce latency by 80% for cached requests

---

### 2. Batch Predictions

For email campaigns or batch jobs, use batch prediction:

```bash
# Create batch prediction script
python server/src/ml/batch_predict.py \
  --user-ids user1,user2,user3 \
  --n 10 \
  --output batch_results.json
```

---

### 3. Model Optimization

Reduce model size without losing quality:

```python
# In recommender.py, reduce TF-IDF features
self.tfidf_vectorizer = TfidfVectorizer(
    max_features=50,  # Reduced from 100
    stop_words='english',
    ngram_range=(1, 1)  # Unigrams only
)
```

**Impact**: 50% smaller model, 30% faster inference

---

### 4. Scheduled Retraining

Set up weekly automatic retraining:

```bash
# Add to crontab
0 2 * * 0 cd /path/to/pluqla/server && \
  node src/ml/export_training_data.js && \
  python src/ml/train.py && \
  pm2 restart pluqla-api
```

---

### 5. A/B Testing Framework

Track ML vs fallback performance:

```javascript
// Assign 10% of users to fallback (control group)
const useML = Math.random() > 0.1;

const result = useML
  ? await getMLRecommendations(userId, options)
  : await getFallbackRecommendations(userId, limit);

// Tag with experiment group
result.experimentGroup = useML ? 'ml' : 'control';
```

---

## 📚 Resources

### Dashboards
- **ML Recommendations**: `infra/grafana/dashboards/ml-recommendations-dashboard.json`
- **Alimentation Monitoring**: `infra/grafana/dashboards/alimentation-monitoring-dashboard.json`

### Alerts
- **ML Alerts**: `infra/prometheus/alerts/ml-alerts.yml`
- **Performance Alerts**: `infra/prometheus/alerts/performance-alerts.yml`

### Documentation
- **Phase 9A Summary**: `PHASE9A_ML_RECOMMENDATIONS_COMPLETE.md`
- **ML Architecture**: `docs/README_ML_ARCHITECTURE.md`
- **API Documentation**: `docs/api/API.md#ml-recommendations`

### Runbooks
- Model Unavailable: `docs/runbooks/ml-model-unavailable.md`
- High Latency: `docs/runbooks/ml-high-latency.md`
- High Fallback: `docs/runbooks/ml-high-fallback.md`

---

## 🎓 Training Checklist

For new team members joining ML monitoring:

- [ ] Import Grafana dashboard and explore all panels
- [ ] Trigger test alert (set threshold very low temporarily)
- [ ] Practice runbook: "MLModelNotAvailable" response
- [ ] Retrain model manually to understand process
- [ ] Review 1 week of historical metrics
- [ ] Identify normal vs abnormal patterns
- [ ] Shadow on-call engineer during incident

---

## 📞 Support

### On-Call Escalation

1. **P1 Critical** (ML down): Page on-call immediately
2. **P2 Warning** (degraded): Slack #ml-alerts channel
3. **P3 Info**: Daily digest email

### Contact

- **ML Team Lead**: @ml-lead
- **On-Call Rotation**: PagerDuty schedule
- **Questions**: #ml-monitoring Slack channel

---

**Version**: 1.0.0
**Last Updated**: 2025-10-25
**Maintained By**: Pluqla Dev Team

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
