# Redis + Workers Setup Guide

**Guide de configuration** : Redis et système de workers Bull pour Pluqla

---

## 🎯 Vue d'ensemble

Le système de workers Pluqla utilise **Redis** et **Bull** pour traiter des jobs asynchrones en arrière-plan :

- **Enrichissement recettes** : Calcul metadata (scores, tags, allergènes)
- **Calcul popularité** : Score 0-100 basé sur interactions utilisateurs
- **Jobs CRON** : Exécutions planifiées (toutes les 6h en production)

---

## 📦 Prérequis

### Local Development
```bash
# Redis (choisir une méthode)
# Option 1: Docker (recommandé)
docker-compose up -d redis

# Option 2: Installation locale
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows
# Télécharger depuis https://github.com/microsoftarchive/redis/releases
```

### Production
- Redis Cloud (recommandé) : https://redis.com/redis-enterprise-cloud/
- AWS ElastiCache
- Azure Cache for Redis
- Redis Sentinel pour HA

---

## ⚙️ Configuration

### 1. Variables d'environnement

Copier `.env.example` et ajuster :

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=         # Laisser vide pour dev, set en production
REDIS_DB=0

# Workers
WORKER_HTTP_PORT=3005   # Health check endpoint

# Security
IP_SALT=your_random_salt_here  # Générer un unique par environnement
```

### 2. Générer IP_SALT

```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🚀 Démarrage

### Development (Local)

**Terminal 1 : API Server**
```bash
cd server
npm run dev
```

**Terminal 2 : Workers**
```bash
cd server
npm run workers:dev
```

**Terminal 3 : Redis** (si pas Docker)
```bash
redis-server
```

### Docker Compose (Recommandé)

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f workers

# Stop services
docker-compose down
```

### Production (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start API server
pm2 start src/server.js --name "pluqla-api"

# Start workers
pm2 start src/workers/index.js --name "pluqla-workers"

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

---

## 🔍 Monitoring

### Health Check

Workers exposent un endpoint HTTP pour health checks :

```bash
# Check worker health
curl http://localhost:3005/health

# Response
{
  "status": "healthy",
  "uptime": 12345.67,
  "queues": {
    "enrichment": {
      "waiting": 0,
      "active": 2,
      "completed": 153,
      "failed": 1,
      "delayed": 0,
      "total": 156
    },
    "popularity": {
      "waiting": 0,
      "active": 0,
      "completed": 24,
      "failed": 0,
      "delayed": 0,
      "total": 24,
      "nextScheduledRun": "2025-01-12T18:00:00.000Z"
    }
  }
}
```

### Bull Dashboard (Optional)

```bash
# Install bull-board
npm install --save-dev @bull-board/express

# Add to server.js or workers/index.js
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullAdapter(enrichmentQueue),
    new BullAdapter(popularityQueue)
  ],
  serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

// Access: http://localhost:3004/admin/queues
```

### Redis CLI

```bash
# Connect
redis-cli

# Check keys
KEYS *

# Monitor commands in real-time
MONITOR

# Get queue stats
LLEN bull:recipe-enrichment:waiting
LLEN bull:recipe-enrichment:active
LLEN bull:popularity-calculation:completed

# Clear specific queue (use with caution!)
DEL bull:recipe-enrichment:waiting

# Get memory usage
INFO memory
```

---

## 📊 Queues

### Enrichment Queue

**Purpose** : Enrichir recettes avec metadata intelligente

**Job Types** :
- `enrich-recipe` : Enrichir une recette
- `backfill` : Enrichissement bulk (migration)

**Configuration** :
- Concurrency : 2 workers simultanés
- Timeout : 30s par job
- Retries : 3 tentatives (exponential backoff)

**Usage** :
```javascript
const { addEnrichmentJob } = require('./queues/enrichmentQueue');

// Single recipe
await addEnrichmentJob('recipe-id-123');

// Bulk with rate limiting
await bulkEnrichRecipes(['id1', 'id2', 'id3'], 500); // 500ms delay
```

### Popularity Queue

**Purpose** : Calculer scores de popularité

**Job Types** :
- `calculate-all` : CRON toutes les 6h (production)
- `calculate-one` : Calcul single recette (on-demand)

**Configuration** :
- Concurrency : 1 worker (calcul lourd)
- Timeout : 5 minutes
- Schedule : `0 */6 * * *` (production)

**Usage** :
```javascript
const { triggerCalculation, calculateRecipeScore } = require('./queues/popularityQueue');

// Trigger full recalculation
await triggerCalculation();

// Calculate single recipe
await calculateRecipeScore('recipe-id-123');
```

---

## 🧪 Testing

### Test Redis Connection

```bash
# Via Node.js
node -e "
const { testConnection } = require('./src/config/redis');
testConnection().then(ok => console.log('Redis:', ok ? 'OK' : 'FAIL'));
"

# Via CLI
redis-cli ping
# Expected: PONG
```

### Test Worker Manually

```bash
# Start workers with debug logs
LOG_LEVEL=debug npm run workers:dev

# In another terminal, add test job
node -e "
const { addEnrichmentJob } = require('./src/queues/enrichmentQueue');
addEnrichmentJob('test-recipe-id').then(() => console.log('Job added'));
"
```

### Unit Tests

```bash
# Run worker tests
npm test -- tests/unit/workers.test.js

# Test enrichment logic
npm test -- tests/unit/enrichmentProcessor.test.js

# Test popularity calculation
npm test -- tests/unit/popularityProcessor.test.js
```

---

## 🔧 Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# If not, start it
# Docker
docker-compose up -d redis

# Local
redis-server

# Check logs
docker-compose logs redis
```

### Workers Not Processing Jobs

```bash
# 1. Check worker logs
docker-compose logs workers

# 2. Check Redis connection in workers
curl http://localhost:3005/health

# 3. Check queue status
redis-cli
> LLEN bull:recipe-enrichment:waiting
> LLEN bull:recipe-enrichment:active

# 4. Restart workers
docker-compose restart workers
# OR
pm2 restart pluqla-workers
```

### Stalled Jobs

```bash
# Jobs stuck in "active" state
# Check worker logs for crashes

# Clean stalled jobs (automatic after lockDuration)
# Or manually via Bull dashboard

# Prevent: Increase lockDuration if jobs take long
```

### High Memory Usage

```bash
# Check Redis memory
redis-cli INFO memory

# Clean old completed jobs
redis-cli
> LRANGE bull:recipe-enrichment:completed 0 -1
> DEL bull:recipe-enrichment:completed

# Or programmatically
node -e "
const { cleanOldJobs } = require('./src/queues/enrichmentQueue');
cleanOldJobs(86400000); // 24h
"
```

---

## 📈 Performance

### Recommended Settings

**Development** :
- Redis : Local, no persistence
- Workers : 1 instance
- Enrichment concurrency : 2
- Popularity concurrency : 1

**Staging** :
- Redis : Docker/Cloud, AOF enabled
- Workers : 1-2 instances
- Enrichment concurrency : 3
- Popularity concurrency : 1

**Production** :
- Redis : Managed service (ElastiCache, Redis Cloud)
- Workers : 2-4 instances (HA)
- Enrichment concurrency : 5
- Popularity concurrency : 2
- Redis Sentinel for failover

### Scaling

**Horizontal** :
```bash
# Run multiple worker instances
# PM2 cluster mode
pm2 start src/workers/index.js -i 2 --name "pluqla-workers"

# Docker Compose scale
docker-compose up -d --scale workers=3
```

**Vertical** :
- Increase Redis memory
- Increase concurrency per worker
- Optimize job processing time

---

## 🔐 Security

### Production Checklist

- [ ] Set strong `REDIS_PASSWORD`
- [ ] Bind Redis to localhost or private network
- [ ] Enable Redis AUTH
- [ ] Set unique `IP_SALT` per environment
- [ ] Restrict worker health endpoint (firewall)
- [ ] Monitor for suspicious job patterns
- [ ] Enable Redis TLS (if over internet)
- [ ] Rotate `REDIS_PASSWORD` regularly

### Redis Security Config

```bash
# redis.conf
bind 127.0.0.1
requirepass your_strong_password_here
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## 📚 Resources

- **Bull Documentation** : https://github.com/OptimalBits/bull
- **Redis Documentation** : https://redis.io/docs/
- **POPULARITY_SCORE_SPEC.md** : Formule de calcul détaillée
- **Bull Board** : https://github.com/felixmosh/bull-board

---

## 🆘 Support

**Issues** : Créer un ticket GitHub avec :
- Logs workers (`docker-compose logs workers`)
- Redis info (`redis-cli INFO`)
- Queue stats (`curl localhost:3005/health`)
- Version Node.js / Redis

**Contact** : dev@pluqla.com

---

**Document maintenu par** : Équipe Backend Pluqla
**Dernière révision** : 2025-01-12
