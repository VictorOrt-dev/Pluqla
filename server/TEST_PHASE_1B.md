# Phase 1B - Tests de Validation

Ce fichier contient tous les tests pour valider l'intégration Phase 1B.

---

## 🚀 Démarrage Rapide

```bash
# Terminal 1: Redis
docker-compose up redis

# Terminal 2: PostgreSQL
docker-compose up postgres

# Terminal 3: API Server
cd server
npm run dev

# Terminal 4: Workers
cd server
npm run workers:dev
```

---

## ✅ Tests de Validation

### 1. Health Check

```bash
curl http://localhost:3004/health | jq
```

**Résultat attendu**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-06T...",
  "uptime": 123.45,
  "subsystems": {
    "database": { "healthy": true },
    "redis": { "healthy": true }
  }
}
```

---

### 2. Prometheus Metrics

```bash
curl http://localhost:3004/metrics
```

**Métriques à vérifier**:
- `http_requests_total`
- `fraud_detections_total`
- `rate_limit_hits_total`
- `gdpr_exports_total`
- `recipe_interactions_total`

---

### 3. IP Deduplication

```bash
# Créer un compte de test
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-phase1b@example.com",
    "password": "TestPassword123!",
    "name": "Test User Phase 1B"
  }'

# Login
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-phase1b@example.com",
    "password": "TestPassword123!"
  }' | jq -r '.access_token'

# Copier le token et l'utiliser ci-dessous
export TOKEN="<votre_token>"

# Test interaction avec IP hash
curl -X POST http://localhost:3004/api/recipe-interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "test-recipe-1",
    "interactionType": "view"
  }' | jq
```

**Vérifier dans la réponse**:
- `fraudCheck.ipHash` présent
- `fraudCheck.score` calculé

---

### 4. Rate Limiting

```bash
# Tester limite auth (5 req/15min)
# Faire 6 requêtes login avec mauvais password
for i in {1..6}; do
  echo "Tentative $i"
  curl -X POST http://localhost:3004/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrong_password"
    }'
  echo ""
done
```

**Résultat attendu**:
- Requêtes 1-5: 401 Unauthorized
- Requête 6: 429 Too Many Requests

---

### 5. Fraud Detection - Burst Pattern

```bash
# Générer 30 interactions rapides
for i in {1..30}; do
  curl -s -X POST http://localhost:3004/api/recipe-interactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"recipeId\": \"test-recipe-$i\", \"interactionType\": \"view\"}" \
    | jq '.fraudCheck.score'
done
```

**Résultat attendu**:
- Premières requêtes: score faible (0-20)
- Après 20 requêtes/min: score augmente (+40 pour burst)
- Logs "Suspicious activity" dans la console API

---

### 6. Fraud Detection - Repeated Interactions

```bash
# Voir la même recette 10 fois de suite
for i in {1..10}; do
  echo "Interaction $i"
  curl -s -X POST http://localhost:3004/api/recipe-interactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"recipeId": "same-recipe", "interactionType": "view"}' \
    | jq '.fraudCheck.score'
  sleep 1
done
```

**Résultat attendu**:
- Après 5 interactions: +30 points au score
- Message dans logs: "Repeated interaction detected"

---

### 7. GDPR Export

```bash
# Exporter données utilisateur
curl http://localhost:3004/api/gdpr/export \
  -H "Authorization: Bearer $TOKEN" \
  -o user-export.json

# Vérifier le contenu
cat user-export.json | jq '.personalData.user'
cat user-export.json | jq '.recipeData.interactions | length'
```

**Résultat attendu**:
```json
{
  "exportDate": "...",
  "personalData": {
    "user": { "id": "...", "email": "test-phase1b@example.com" },
    "statistics": { "totalRecipeInteractions": 40 }
  },
  "recipeData": {
    "interactions": [...],
    "favorites": [...]
  },
  "legalNotice": {
    "regulation": "RGPD/GDPR Article 15"
  }
}
```

---

### 8. GDPR Audit Trail

```bash
curl http://localhost:3004/api/gdpr/audit-trail \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Résultat attendu**:
```json
{
  "success": true,
  "logs": [
    {
      "action": "data_export",
      "entityType": "User",
      "timestamp": "...",
      "metadata": { "exportSize": "..." }
    }
  ],
  "total": 1
}
```

---

### 9. Feature Flags

```bash
# Test flag via API (créer route test d'abord)
# Ou vérifier dans Redis directement
redis-cli GET feature-flag:RECIPE_ENRICHMENT_ENABLED
redis-cli GET feature-flag:FRAUD_DETECTION_ENABLED
```

**Résultat attendu**:
```
"{\"enabled\":true}"
"{\"enabled\":true}"
```

---

### 10. Sentry Error Capture (si configuré)

```bash
# Générer erreur intentionnelle
curl -X POST http://localhost:3004/api/test-error \
  -H "Authorization: Bearer $TOKEN"
```

**Vérifier**:
- Dashboard Sentry reçoit l'erreur
- Email de notification (si activé)
- Error contient contexte utilisateur

---

## 🧪 Tests de Performance

### Test Rate Limiting sous charge

```bash
# Générer 200 requêtes en parallèle
seq 1 200 | xargs -P 20 -I {} curl -s http://localhost:3004/api/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code}\n" -o /dev/null
```

**Vérifier**:
- Majorité: 200 OK
- Quelques: 429 Too Many Requests
- Métriques Prometheus: `rate_limit_hits_total` augmente

---

### Test Fraud Detection Stress

```bash
# Script pour simuler comportement suspect
cat > test-fraud.sh << 'EOF'
#!/bin/bash
TOKEN=$1

for i in {1..50}; do
  curl -s -X POST http://localhost:3004/api/recipe-interactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"recipeId\": \"recipe-$((RANDOM % 5))\", \"interactionType\": \"view\"}" &
done
wait
EOF

chmod +x test-fraud.sh
./test-fraud.sh "$TOKEN"
```

**Vérifier**:
- Logs API: messages "High fraud score"
- Métriques: `fraud_detections_total{severity="high"}` augmente
- Interactions marquées comme suspectes dans DB

---

## 📊 Vérifications Base de Données

### Interactions avec métadonnées fraud

```sql
-- Connexion PostgreSQL
psql -d pluqla_dev

-- Interactions suspectes
SELECT
  id,
  "userId",
  "recipeId",
  "interactionType",
  metadata->>'suspicious' as is_suspicious,
  metadata->>'fraudScore' as fraud_score,
  "createdAt"
FROM recipe_interactions
WHERE (metadata->>'suspicious')::boolean = true
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

### Feature Flags

```sql
SELECT
  name,
  enabled,
  description,
  "targetingRules",
  "updatedAt"
FROM feature_flags
ORDER BY name;
```

---

### Audit Logs GDPR

```sql
SELECT
  action,
  "entityType",
  "userId",
  metadata,
  "createdAt"
FROM audit_logs
WHERE action IN ('data_export', 'data_deletion', 'suspicious_activity')
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## 🔍 Vérifications Redis

```bash
# Connexion Redis
redis-cli

# Vérifier rate limiting keys
KEYS rl:*

# Vérifier fraud detection keys
KEYS fraud:*

# Vérifier feature flags cache
KEYS feature-flag:*

# Vérifier TTL d'un flag
TTL feature-flag:RECIPE_ENRICHMENT_ENABLED

# Voir toutes les clés
KEYS *
```

---

## 📈 Monitoring Grafana (si configuré)

### 1. Importer Dashboard Prometheus

```bash
# Démarrer Grafana
docker-compose up -d grafana

# Accéder à http://localhost:3001
# Login: admin / admin

# Ajouter datasource Prometheus
# URL: http://prometheus:9090

# Créer dashboard avec panels:
# - HTTP Request Rate
# - Fraud Detection Score Distribution
# - Rate Limit Hits
# - GDPR Export Count
```

---

## ✅ Checklist de Validation

- [ ] Health check retourne status healthy
- [ ] Prometheus metrics accessibles
- [ ] IP hash généré sur toutes requêtes
- [ ] Rate limiting bloque après limite
- [ ] Fraud detection détecte burst patterns
- [ ] Fraud detection détecte interactions répétées
- [ ] GDPR export génère JSON complet
- [ ] GDPR audit trail enregistre actions
- [ ] Feature flags retournent valeurs correctes (Redis cache)
- [ ] Sentry capture erreurs (si configuré)
- [ ] Métriques Prometheus correctement incrémentées
- [ ] Redis stocke données temporaires correctement
- [ ] PostgreSQL stocke interactions avec metadata fraud

---

## 🚨 Troubleshooting

### Problème: Rate limiting ne fonctionne pas

```bash
# Vérifier Redis
redis-cli ping  # Devrait retourner PONG

# Vérifier clés rate limiting
redis-cli KEYS rl:*

# Vérifier config
cat server/.env | grep RATE_LIMITING_ENABLED
```

---

### Problème: Fraud detection score toujours à 0

```bash
# Vérifier Redis pour burst detection
redis-cli KEYS fraud:burst:*

# Vérifier logs API
docker-compose logs api | grep fraud

# Tester manuellement
node -e "
  const { calculateFraudScore } = require('./server/src/services/fraudDetectionService');
  calculateFraudScore({
    userId: 'test',
    ipHash: 'testhash',
    userAgent: 'TestAgent',
    recipeId: 'test',
    interactionType: 'view'
  }).then(console.log);
"
```

---

### Problème: Prometheus metrics vides

```bash
# Vérifier middleware actif
curl http://localhost:3004/metrics | grep http_requests_total

# Générer trafic
for i in {1..10}; do curl http://localhost:3004/health; done

# Re-vérifier
curl http://localhost:3004/metrics | grep http_requests_total
```

---

## 🎉 Validation Complète

Si tous les tests passent:

```bash
echo "✅ Phase 1B - Security, Compliance & Observability - VALIDATED"
echo "🚀 Ready for production deployment"
```

---

**Date**: Décembre 2024
**Version**: 1.0.0
**Statut**: Tests de validation complets
