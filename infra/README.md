# Infra - Déploiement & Infrastructure

> Configuration Docker, CI/CD et monitoring pour déploiement Pluqla

## 🎯 Rôle

Infrastructure as Code pour déploiement sécurisé :
- Containerisation Docker
- CI/CD GitHub Actions
- Monitoring et observabilité
- Scripts de déploiement automatisés

## 🚀 Déploiement Local (Docker)

```bash
# Setup complet avec Docker
cd infra
docker-compose up -d          # Lance app + PostgreSQL + Redis
```

**Services** :
- **App** : http://localhost:3000
- **API** : http://localhost:3004
- **DB** : PostgreSQL:5432
- **Cache** : Redis:6379

## 🐳 Docker

```bash
# Build images
docker build -t pluqla-app .
docker build -t pluqla-api ./server

# Run containers
docker-compose up -d
docker-compose logs -f        # Logs temps réel
docker-compose down           # Stop services
```

### Configuration

| Service | Port | Health Check |
|---------|------|--------------|
| **Client** | 3000 | `/health` |
| **Server** | 3004 | `/api/health` |
| **PostgreSQL** | 5432 | `pg_isready` |
| **Redis** | 6379 | `redis-cli ping` |

## 🚀 Déploiement Production

### Méthode 1 : Docker Compose

```bash
# Production stack
cp docker-compose.prod.yml docker-compose.yml
docker-compose up -d
```

### Méthode 2 : Scripts Automatisés

```bash
./scripts/deploy.sh production    # Déploiement complet
./scripts/health-check.sh         # Vérification santé
./scripts/rollback.sh             # Rollback si nécessaire
```

## 📊 Monitoring

### Health Checks

```bash
# Vérification services
curl http://localhost:3004/api/health
curl http://localhost:3000/health
```

### Logs

```bash
# Logs en temps réel
docker-compose logs -f app
docker-compose logs -f api

# Logs spécifiques
docker logs pluqla-api --tail 100
```

### Métriques

- **Prometheus** : Métriques système
- **Grafana** : Dashboards visuels
- **Winston** : Logs structurés

## 🔒 Sécurité Production

### Variables d'Environnement

```bash
# .env.production
NODE_ENV=production
DATABASE_URL="postgresql://user:secure_pass@prod_host:5432/pluqla_prod"
JWT_SECRET="production-32-char-cryptographically-secure-secret"
JWT_REFRESH_SECRET="production-32-char-refresh-secret"
REDIS_URL="redis://redis:6379"
```

### SSL/TLS

```bash
# Configuration Nginx avec Let's Encrypt
./scripts/setup-ssl.sh domain.com
```

## 🔄 CI/CD

### GitHub Actions

Workflows automatiques :
- **Tests** : Unitaires + E2E + sécurité
- **Build** : Images Docker optimisées
- **Deploy** : Déploiement staging/production
- **Monitoring** : Health checks post-deploy

### Pipeline

```
Git Push → Tests → Build → Security Scan → Deploy → Health Check
```

## 🛠️ Scripts Utilitaires

```bash
# Scripts disponibles
./scripts/backup-database.sh     # Backup PostgreSQL
./scripts/restore-database.sh    # Restore DB
./scripts/setup-monitoring.sh    # Install monitoring stack
./scripts/update-ssl.sh          # Renouveler certificats
```

## 📈 Performance

### Optimisations

- **Multi-stage builds** : Images Docker optimisées
- **nginx** : Reverse proxy + compression
- **Redis** : Cache session + rate limiting
- **PostgreSQL** : Index optimisés

### Scaling

```bash
# Scale horizontal
docker-compose up --scale api=3
docker-compose up --scale client=2
```

## 🚨 Troubleshooting

### Problèmes Communs

```bash
# Base de données inaccessible
docker-compose restart postgres

# Containers en erreur
docker-compose logs app
docker system prune             # Nettoyer Docker

# Port occupé
lsof -i :3004                   # Trouver processus
kill -9 PID                     # Arrêter processus
```

### Support

- **Logs** : `docker-compose logs -f`
- **Monitoring** : Grafana dashboard
- **Health** : `/api/health` endpoints

## 📚 Documentation Associée

- [Guide Déploiement](../docs/DEPLOYMENT.md)
- [Production Checklist](../docs/guides/PRODUCTION_CHECKLIST.md)
- [Monitoring Guide](../docs/development/MONITORING.md)
- [Production Monitoring](../docs/PRODUCTION_MONITORING_GUIDE.md)
- [Security Guidelines](../docs/security/SECURITY.md)

## 🔄 CI/CD Workflows

GitHub Actions workflows disponibles:
- [`.github/workflows/e2e-tests.yml`](../.github/workflows/e2e-tests.yml) - Tests E2E (87+ tests)
- [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) - Déploiement staging
- [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml) - Déploiement production
- [`.github/workflows/lighthouse-ci.yml`](../.github/workflows/lighthouse-ci.yml) - Performance CI

---

**Stack** : Docker + nginx + PostgreSQL + Redis | **CI/CD** : GitHub Actions | **Monitoring** : Prometheus + Grafana