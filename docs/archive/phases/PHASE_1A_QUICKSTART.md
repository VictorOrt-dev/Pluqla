# Phase 1A - Quick Start Guide

## ✅ Modifications Terminées

### 1. Schema Prisma Modifié

**Fichier**: `server/prisma/schema.prisma`

#### Modèle Recipe - Champs Ajoutés
```prisma
model Recipe {
  // ... champs existants ...

  // ✨ Phase 1A - Enrichment fields (nullable)
  metadata        Json?
  popularityScore Float               @default(0)
  lastEnriched    DateTime?
  interactions    RecipeInteraction[]

  // ✨ Phase 1A - New indexes
  @@index([popularityScore(sort: Desc)], map: "idx_recipe_popularity")
  @@index([isActive, createdAt(sort: Desc)], map: "idx_recipe_active_created")
  @@index([category, difficulty, estimatedPrice], map: "idx_recipe_filters")
}
```

#### Nouveaux Modèles Créés

**UserProfile** (lignes 1133-1148)
- Préférences utilisateur pour suggestions personnalisées
- Relation 1-1 avec User

**RecipeInteraction** (lignes 1151-1168)
- Tracking des interactions (view, cook, favorite)
- IP hash pour anti-spam
- Indexes optimisés pour calcul popularityScore

**AuditLog** (lignes 1171-1187)
- Conformité GDPR
- Trace toutes les actions importantes

#### Modèle User - Relations Ajoutées
```prisma
model User {
  // ... relations existantes ...
  userProfile            UserProfile?
  recipeInteractions     RecipeInteraction[]
}
```

---

## ⏳ Prochaines Étapes

### Étape 2: Démarrer l'Infrastructure

**Prérequis**: Docker Desktop doit être en cours d'exécution

```bash
# 1. Démarrer Docker Desktop manuellement

# 2. Démarrer PostgreSQL + Redis
cd C:\Users\Victor\Desktop\PLUQLA
docker-compose up -d postgres redis

# 3. Vérifier que les services sont actifs
docker-compose ps
```

**Résultat attendu**:
```
NAME                    STATUS    PORTS
pluqla-postgres-1      Up        0.0.0.0:5432->5432/tcp
pluqla-redis-1         Up        0.0.0.0:6379->6379/tcp
```

### Étape 3: Générer la Migration

```bash
cd server
npx prisma migrate dev --name add_recipe_metadata_nullable --create-only
```

**Ce que fait cette commande**:
- Crée un fichier SQL dans `prisma/migrations/`
- **N'applique PAS** la migration (flag `--create-only`)
- Génère automatiquement les ALTER TABLE nécessaires

### Étape 4: Vérifier le SQL Généré

**Fichier à vérifier**: `server/prisma/migrations/YYYYMMDDHHMMSS_add_recipe_metadata_nullable/migration.sql`

**Points critiques à valider**:

1. **Colonnes Recipe sont nullable** ✅
```sql
ALTER TABLE "recipes" ADD COLUMN "metadata" JSONB;
ALTER TABLE "recipes" ADD COLUMN "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "recipes" ADD COLUMN "lastEnriched" TIMESTAMP(3);
```

2. **Index GIN pour JSONB** (à ajouter manuellement si manquant)
```sql
-- Ajouter après les ALTER TABLE si Prisma ne le génère pas automatiquement
CREATE INDEX IF NOT EXISTS "idx_recipe_metadata_gin" ON "recipes" USING GIN ("metadata");
```

3. **Nouvelles tables créées**
```sql
CREATE TABLE "user_profiles" (...);
CREATE TABLE "recipe_interactions" (...);
CREATE TABLE "audit_logs" (...);
```

### Étape 5: Appliquer la Migration

⚠️ **ATTENTION**: Cette étape est irréversible en production!

```bash
# Sur environnement local (développement)
npx prisma migrate dev

# Vérifier l'application
npx prisma db push --accept-data-loss
```

### Étape 6: Tester l'Enrichissement

**Créer le script de test**: `server/src/scripts/testBackfill.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const { addEnrichmentJob, bulkEnrichRecipes } = require('../queues/enrichmentQueue');

const prisma = new PrismaClient();

async function testEnrichment() {
  console.log('🧪 Test Enrichment - Phase 1A');

  // 1. Récupérer 10 recettes aléatoires
  const recipes = await prisma.recipe.findMany({
    take: 10,
    where: { metadata: null },
    select: { id: true, title: true }
  });

  console.log(`\n📊 ${recipes.length} recettes sélectionnées pour test`);

  // 2. Envoyer les jobs d'enrichissement
  const recipeIds = recipes.map(r => r.id);
  await bulkEnrichRecipes(recipeIds, 500);

  console.log(`\n✅ ${recipeIds.length} jobs ajoutés à la queue`);
  console.log('\n⏳ Attendez 30 secondes pour traitement...');

  // 3. Attendre 30 secondes
  await new Promise(resolve => setTimeout(resolve, 30000));

  // 4. Vérifier les résultats
  const enriched = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: {
      id: true,
      title: true,
      metadata: true,
      popularityScore: true,
      lastEnriched: true
    }
  });

  console.log('\n📈 Résultats d'enrichissement:');
  enriched.forEach(r => {
    const hasMetadata = r.metadata !== null;
    console.log(`  ${hasMetadata ? '✅' : '❌'} ${r.title}`);
    if (hasMetadata && typeof r.metadata === 'object') {
      const meta = r.metadata;
      console.log(`     Nutrition: ${meta.nutritionScore || 'N/A'}/10`);
      console.log(`     Eco: ${meta.ecoScore || 'N/A'}/10`);
      console.log(`     Allergènes: ${meta.allergens?.length || 0}`);
    }
  });

  const successRate = enriched.filter(r => r.metadata !== null).length / enriched.length * 100;
  console.log(`\n🎯 Taux de succès: ${successRate.toFixed(1)}%`);

  await prisma.$disconnect();
}

testEnrichment().catch(console.error);
```

**Exécuter le test**:
```bash
# Terminal 1: Démarrer le worker
npm run workers:dev

# Terminal 2: Lancer le test
node src/scripts/testBackfill.js
```

---

## 📋 Checklist Phase 1A

- [x] Modifier schema Prisma (Recipe, UserProfile, RecipeInteraction, AuditLog)
- [ ] Démarrer Docker Desktop + services (PostgreSQL + Redis)
- [ ] Générer migration Prisma avec --create-only
- [ ] Vérifier SQL généré (GIN indexes pour JSONB)
- [ ] Appliquer migration sur base de données
- [ ] Créer script testBackfill.js
- [ ] Tester enrichissement sur 10 recettes
- [ ] Valider taux de succès > 80%

---

## 🚨 Troubleshooting

### Erreur: "Can't reach database server"
```bash
# Vérifier Docker Desktop actif
docker ps

# Redémarrer les services
docker-compose restart postgres
```

### Erreur: "Column already exists"
```bash
# Reset la base de données locale (ATTENTION: perte de données)
npx prisma migrate reset --force
```

### Worker ne démarre pas
```bash
# Vérifier Redis
redis-cli ping
# Doit retourner: PONG

# Logs worker
npm run workers:dev
```

---

## 📚 Fichiers Importants

### Infrastructure
- `docker-compose.yml` - Stack Docker (Postgres, Redis, Workers)
- `server/.env.example` - Variables d'environnement (Redis, Workers)

### Workers & Queues
- `server/src/config/redis.js` - Configuration Redis centralisée
- `server/src/queues/enrichmentQueue.js` - Queue Bull pour enrichissement
- `server/src/queues/popularityQueue.js` - Queue Bull pour calcul popularité
- `server/src/workers/index.js` - Launcher des workers
- `server/src/workers/enrichmentProcessor.js` - 12 fonctions heuristiques
- `server/src/workers/popularityProcessor.js` - Calcul PopularityScore

### Documentation
- `docs/POPULARITY_SCORE_SPEC.md` - Spec complète algorithme popularité
- `docs/REDIS_WORKERS_SETUP.md` - Guide setup Redis + Workers
- `docs/PHASE_1A_QUICKSTART.md` - Ce fichier

---

**Version**: Phase 1A v1.0
**Date**: 12 octobre 2025
**Statut**: Schema modifié ✅ | Infrastructure à démarrer ⏳
