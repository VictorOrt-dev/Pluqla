# Benchmarking & Performance Testing

**Load Testing and Performance Benchmarks for Pluqla API**
Version: 1.0
Last Updated: December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Tools](#tools)
3. [Running Benchmarks](#running-benchmarks)
4. [Interpreting Results](#interpreting-results)
5. [Performance Targets](#performance-targets)
6. [Optimization Recommendations](#optimization-recommendations)
7. [CI/CD Integration](#cicd-integration)

---

## Overview

Pluqla uses two complementary load testing tools:

1. **Autocannon**: Fast HTTP/1.1 benchmarking (throughput-focused)
2. **K6**: Advanced load testing with scenarios (behavior-focused)

### When to Benchmark

✅ **Before production deployment**
✅ **After major refactoring**
✅ **When adding new features**
✅ **Monthly performance regression testing**
✅ **After infrastructure changes**

### What We Measure

- **Throughput**: Requests per second
- **Latency**: Response time distribution (P50, P95, P99)
- **Error Rate**: Failed requests / total requests
- **Concurrency**: Behavior under concurrent load
- **Resource Usage**: CPU, memory, database connections

---

## Tools

### Autocannon

**Best for:**
- Quick throughput benchmarks
- Single-endpoint stress testing
- Comparing performance before/after changes

**Strengths:**
- Fast execution (written in Node.js)
- Low overhead
- Built-in progress bar
- JSON output for CI/CD

**Installation:**

Already included as dev dependency:

```bash
npm install --save-dev autocannon
```

---

### K6

**Best for:**
- Complex user journeys
- Gradual load ramping
- Scenario-based testing
- SLA validation (thresholds)

**Strengths:**
- JavaScript scripting (ES6 modules)
- Rich metrics and reports
- Virtual user scenarios
- Cloud execution support

**Installation:**

Follow official guide: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Verify installation:

```bash
k6 version
```

---

## Running Benchmarks

### Prerequisites

1. **Server Running**: Ensure API is running locally or on test environment
2. **Database Seeded**: Use test data for consistent results
3. **Auth Token**: Generate test JWT if testing authenticated endpoints

```bash
# Start server
npm run dev

# Verify server is up
curl http://localhost:3004/health
```

### Configuration

**Environment Variables:**

```env
# Base URL for testing
BENCHMARK_URL=http://localhost:3004

# Test JWT token (for authenticated endpoints)
BENCHMARK_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Autocannon specific
BENCHMARK_DURATION=30        # seconds
BENCHMARK_CONNECTIONS=10     # concurrent connections
BENCHMARK_PIPELINING=1       # requests per connection
```

---

### Autocannon Benchmarks

**Run all tests:**

```bash
npm run bench:autocannon
```

**With custom configuration:**

```bash
BENCHMARK_DURATION=60 BENCHMARK_CONNECTIONS=50 npm run bench:autocannon
```

**Output Example:**

```
🚀 Starting Autocannon Benchmarks for Pluqla API
Base URL: http://localhost:3004
Duration: 30s per test

============================================================
Benchmarking: Health Check (Baseline)
Endpoint: /health
Method: GET
Duration: 30s | Connections: 10
============================================================

Running 30s test @ http://localhost:3004/health
10 connections

📊 RESULTS:
────────────────────────────────────────────────────────────

✅ Requests:
   Total:     45000
   Avg/sec:   1500.00
   Min/sec:   1450
   Max/sec:   1550

⏱️  Latency:
   Avg:       6.50 ms
   Median:    6.00 ms
   P95:       8.00 ms
   P99:       10.00 ms
   Max:       25.00 ms

🚀 Throughput:
   Avg:       1.5 MB/sec
   Total:     45 MB

❌ Errors:    0
⏱️  Timeouts:  0

📈 Status Codes:
   200: 45000

────────────────────────────────────────────────────────────
```

**Results Location:**

```
server/bench/results/autocannon_benchmark_2024-12-24T10-00-00-000Z.json
```

---

### K6 Load Tests

**Run load test:**

```bash
npm run bench:k6
```

**With custom configuration:**

```bash
BENCHMARK_URL=https://staging-api.pluqla.com BENCHMARK_JWT=$STAGING_JWT k6 run scripts/bench/k6-script.js
```

**Output Example:**

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
  script: scripts/bench/k6-script.js
  output: -

  scenarios: (100.00%) 1 scenario, 100 max VUs, 6m30s max duration
           * default: Up to 100 looping VUs for 6m0s over 7 stages

running (6m00.0s), 000/100 VUs, 15000 complete and 0 interrupted iterations
default ✓ [======================================] 000/100 VUs  6m0s

     ✓ status is 200
     ✓ response time < 500ms
     ✓ has status field

     checks.........................: 100.00% ✓ 45000      ✗ 0
     data_received..................: 45 MB   125 kB/s
     data_sent......................: 3.5 MB  9.7 kB/s
     http_req_blocked...............: avg=10.5µs  min=1µs     med=5µs    max=2ms
     http_req_connecting............: avg=5.2µs   min=0s      med=0s     max=1.5ms
     http_req_duration..............: avg=95ms    min=50ms    med=85ms   max=450ms
       { expected_response:true }...: avg=95ms    min=50ms    med=85ms   max=450ms
     http_req_failed................: 0.00%   ✓ 0          ✗ 15000
     http_req_receiving.............: avg=125µs   min=50µs    med=100µs  max=5ms
     http_req_sending...............: avg=75µs    min=30µs    med=60µs   max=2ms
     http_req_tls_handshaking.......: avg=0s      min=0s      med=0s     max=0s
     http_req_waiting...............: avg=94.8ms  min=49.9ms  med=84.9ms max=449ms
     http_reqs......................: 15000   41.666667/s
     iteration_duration.............: avg=1.2s    min=1.05s   med=1.15s  max=2.5s
     iterations.....................: 15000   41.666667/s
     vus............................: 100     min=0        max=100
     vus_max........................: 100     min=100      max=100

📊 K6 LOAD TEST SUMMARY
============================================================

✅ Total Requests:
   Sent: 15000
   Failed: 0.00%

⏱️  Response Times:
   Avg: 95.00ms
   P95: 180.00ms
   P99: 350.00ms
   Max: 450.00ms

🔐 Auth Latency:
   P95: 120.00ms

💾 DB Query Latency:
   P95: 250.00ms

📈 Threshold Status:
   http_req_duration (p(95)<500): ✅ PASS
   http_req_duration (p(99)<1000): ✅ PASS
   http_req_failed (rate<0.01): ✅ PASS
   errors (rate<0.05): ✅ PASS

============================================================
```

**Results Location:**

```
server/bench/results/k6_results_2024-12-24T10-00-00-000Z.json
```

---

### Run All Benchmarks

```bash
npm run bench:all
```

Executes:
1. Autocannon benchmarks (30s per endpoint)
2. K6 load test (6 minutes with ramping)

Total time: ~10-15 minutes

---

## Interpreting Results

### Key Metrics

#### 1. Throughput (Requests/sec)

**Good:**
- Health endpoint: 1000+ req/s
- Read-only API: 500+ req/s
- Database queries: 200+ req/s
- AI endpoints: 50+ req/s

**Poor:**
- <100 req/s for simple endpoints
- Investigate bottlenecks

#### 2. Latency

**Response Time Targets:**

| Endpoint Type | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| Health check | <10ms | <20ms | <50ms |
| Auth (JWT verify) | <100ms | <200ms | <300ms |
| Database read | <150ms | <300ms | <500ms |
| Database write | <200ms | <400ms | <800ms |
| AI requests | <1000ms | <2000ms | <3000ms |

**Latency Percentiles Explained:**

- **P50 (Median)**: 50% of requests faster than this
- **P95**: 95% of requests faster than this (good SLA target)
- **P99**: 99% of requests faster than this (catches tail latency)

#### 3. Error Rate

**Acceptable:**
- <0.1% for production
- <1% for load testing (stress conditions)

**Investigate if:**
- >1% errors under normal load
- Errors increase with concurrency
- Specific endpoints failing

**Common Error Causes:**

- **429 Too Many Requests**: Rate limiting triggered (expected in load test)
- **500 Internal Server Error**: Application bug
- **503 Service Unavailable**: Database connections exhausted
- **ECONNREFUSED**: Server not running or crashed

#### 4. Resource Usage

Monitor during benchmarks:

```bash
# CPU usage
top -p $(pgrep -f "node.*server.js")

# Memory
ps aux | grep node

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

**Warning Signs:**
- CPU >80% sustained
- Memory growing unbounded (leak)
- Database connection pool exhausted
- High disk I/O wait

---

## Performance Targets

### Production SLA

```yaml
Availability: 99.9%           # <43 min downtime/month
Response Time (P95): <500ms   # 95% of requests
Response Time (P99): <1000ms  # 99% of requests
Error Rate: <0.1%             # 99.9% success rate
Throughput: 100+ req/sec      # Normal traffic
```

### Benchmark Targets

#### Autocannon (30s, 10 connections)

```
Endpoint          | Req/sec | P95 Latency | P99 Latency | Error %
------------------|---------|-------------|-------------|--------
/health           | 1500+   | <20ms       | <50ms       | 0%
/metrics          | 800+    | <50ms       | <100ms      | 0%
/api/auth/login   | 300+    | <200ms      | <400ms      | <1%
/api/user/profile | 400+    | <150ms      | <300ms      | <1%
/api/transactions | 200+    | <300ms      | <500ms      | <1%
/api/ai/suggest   | 50+     | <2000ms     | <3000ms     | <5%
```

#### K6 (6min, ramp 0→100 VUs)

```
Metric                    | Target
--------------------------|------------------
http_req_duration (P95)   | <500ms
http_req_duration (P99)   | <1000ms
http_req_failed           | <1%
auth_latency (P95)        | <200ms
db_query_latency (P95)    | <300ms
total iterations          | 10,000+
```

---

## Optimization Recommendations

### Based on Benchmark Results

#### High Latency (P95 >500ms)

**Diagnose:**

```bash
# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10
"

# Profile Node.js (0x)
npm install -g 0x
0x node src/server.js
# Run load test, then Ctrl+C
# Opens flamegraph
```

**Solutions:**

1. **Add database indexes**
   ```sql
   CREATE INDEX idx_transactions_user_date
   ON transactions(user_id, created_at DESC);
   ```

2. **Enable caching** (Redis)
   ```javascript
   const cachedData = await redis.get(cacheKey);
   if (cachedData) return JSON.parse(cachedData);

   const freshData = await prisma.getData();
   await redis.setex(cacheKey, 3600, JSON.stringify(freshData));
   ```

3. **Optimize queries**
   ```javascript
   // Bad: N+1 queries
   const users = await prisma.user.findMany();
   for (const user of users) {
     user.transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
   }

   // Good: Single query with includes
   const users = await prisma.user.findMany({
     include: { transactions: true }
   });
   ```

---

#### Low Throughput (<100 req/s)

**Diagnose:**

```bash
# Check event loop lag
node --prof src/server.js
# Run load test, then Ctrl+C
node --prof-process isolate-*.log > profile.txt
```

**Solutions:**

1. **Remove synchronous operations**
   ```javascript
   // Bad: Blocks event loop
   const data = fs.readFileSync('file.json');

   // Good: Non-blocking
   const data = await fs.promises.readFile('file.json');
   ```

2. **Use connection pooling**
   ```javascript
   // Prisma config
   datasource db {
     url          = env("DATABASE_URL")
     pool_timeout = 30
     pool_size    = 10
   }
   ```

3. **Enable compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

---

#### High Error Rate (>1%)

**Diagnose:**

```bash
# Check logs during load test
tail -f logs/combined.log | grep ERROR

# Check database errors
psql $DATABASE_URL -c "
  SELECT * FROM pg_stat_database_conflicts
  WHERE datname = 'pluqla_dev'
"
```

**Solutions:**

1. **Increase connection pool**
   ```env
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=20
   DATABASE_POOL_TIMEOUT=30000
   ```

2. **Add request timeout**
   ```javascript
   const timeout = require('connect-timeout');
   app.use(timeout('30s'));
   ```

3. **Implement retry logic**
   ```javascript
   async function queryWithRetry(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(1000 * (i + 1)); // Exponential backoff
       }
     }
   }
   ```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2am

jobs:
  benchmark:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd server
          npm ci

      - name: Setup database
        run: |
          cd server
          npx prisma migrate deploy
          npx prisma db seed

      - name: Start server
        run: |
          cd server
          npm start &
          sleep 5
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run autocannon benchmarks
        run: |
          cd server
          npm run bench:autocannon

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 load tests
        run: |
          cd server
          npm run bench:k6

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: server/bench/results/

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('server/bench/results/k6_results_latest.json', 'utf8');
            const data = JSON.parse(results);

            const comment = `
            ## 📊 Benchmark Results

            **Response Time (P95):** ${data.metrics.http_req_duration.values['p(95)']}ms
            **Throughput:** ${data.metrics.http_reqs.values.rate} req/s
            **Error Rate:** ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

            [Full results](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Performance Regression Detection

```javascript
// scripts/check-performance-regression.js
const fs = require('fs');

const currentResults = JSON.parse(fs.readFileSync('bench/results/current.json'));
const baselineResults = JSON.parse(fs.readFileSync('bench/results/baseline.json'));

const currentP95 = currentResults.metrics.http_req_duration.values['p(95)'];
const baselineP95 = baselineResults.metrics.http_req_duration.values['p(95)'];

const regression = ((currentP95 - baselineP95) / baselineP95) * 100;

if (regression > 10) {
  console.error(`❌ Performance regression detected: ${regression.toFixed(2)}% slower`);
  process.exit(1);
} else {
  console.log(`✅ Performance OK: ${regression.toFixed(2)}% change`);
}
```

---

## Additional Resources

- [Autocannon Documentation](https://github.com/mcollina/autocannon)
- [K6 Documentation](https://k6.io/docs/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Version:** 1.0.0
**Last Updated:** December 2024
**Maintained by:** Pluqla Performance Team

For questions: performance@pluqla.com
