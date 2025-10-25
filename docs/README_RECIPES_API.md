# 🍽️ Feature Alimentation - API Integration

## 📋 Vue d'ensemble

La feature Alimentation de Pluqla a été complètement refactorée pour utiliser des APIs externes de recettes au lieu d'une base de données locale. Cette approche offre :

- ✅ **Contenu riche et à jour** : Accès à des milliers de recettes via Spoonacular, Edamam, et TheMealDB
- ✅ **Résilience** : Système multi-provider avec fallback automatique
- ✅ **Optimisation** : Cache Redis 24h pour minimiser les appels API
- ✅ **Intégration finance** : Suivi des dépenses alimentaires et budget mensuel
- ✅ **Éco-score Pluqla** : Calcul de l'impact environnemental de chaque recette

---

## 🏗️ Architecture

### Providers (par ordre de priorité)

| Provider | Priorité | Quota | Avantages |
|----------|----------|-------|-----------|
| **Spoonacular** | 1️⃣ | 150 req/jour (free) | Données très complètes, nutrition, prix |
| **Edamam** | 2️⃣ | 10,000 req/mois (free) | Excellente nutrition, labels santé |
| **TheMealDB** | 3️⃣ | Illimité (free) | Fallback fiable, toujours disponible |

### Flux de données

```
User Request
    ↓
recipesAPIController
    ↓
recipesAPIService (multi-provider)
    ↓
┌─────────────┬──────────────┬───────────────┐
│ Spoonacular │    Edamam    │   TheMealDB   │
│   (Try 1)   │   (Try 2)    │   (Try 3)     │
└─────────────┴──────────────┴───────────────┘
    ↓
Cache Redis (24h search, 7 days details)
    ↓
Enrichment (Prix EUR + EcoScore)
    ↓
Response to User
```

---

## 📁 Structure des fichiers

```
server/src/
├── services/
│   ├── recipesAPI/
│   │   ├── index.js                    # Service principal multi-provider
│   │   ├── cacheService.js             # Redis + node-cache fallback
│   │   ├── providers/
│   │   │   ├── spoonacular.js          # Provider Spoonacular
│   │   │   ├── edamam.js               # Provider Edamam
│   │   │   └── themealdb.js            # Provider TheMealDB
│   │   └── utils/
│   │       ├── priceConverter.js       # Conversion USD → EUR
│   │       └── ecoScoreCalculator.js   # Calcul Pluqla EcoScore
│   ├── favoriteRecipeService.js        # Gestion favoris
│   └── foodSpendingService.js          # Tracking dépenses alimentaires
│
├── controllers/
│   ├── recipesAPIController.js         # Endpoints recherche recettes
│   ├── favoriteRecipeController.js     # Endpoints favoris
│   └── foodSpendingController.js       # Endpoints budget alimentaire
│
└── routes/
    ├── recipesAPI.js                   # Routes /api/recipes/*
    └── foodSpending.js                 # Routes /api/food-spending/*
```

---

## 🔑 Configuration API

### 1. Obtenir les clés API

#### Spoonacular (Primary)
1. S'inscrire sur [Spoonacular](https://spoonacular.com/food-api)
2. Obtenir une clé API (150 req/jour gratuit)
3. Ajouter à `.env` : `SPOONACULAR_API_KEY=votre_clé`

#### Edamam (Fallback 1)
1. S'inscrire sur [Edamam](https://developer.edamam.com/)
2. Créer une application "Recipe Search API"
3. Ajouter à `.env` :
   ```
   EDAMAM_APP_ID=votre_app_id
   EDAMAM_APP_KEY=votre_app_key
   ```

#### TheMealDB (Fallback 2)
- **Gratuit illimité**, aucune clé requise ! 🎉

### 2. Configuration Redis

```bash
# .env
REDIS_URL=redis://localhost:6379
```

Si Redis n'est pas disponible, le système utilise automatiquement `node-cache` comme fallback.

---

## 🚀 API Endpoints

### Recherche de recettes

**`GET /api/recipes/search`**

Recherche des recettes avec filtres.

**Query Parameters:**
- `query` (string, **required**) : Terme de recherche
- `budgetMax` (number, optional) : Budget max par portion en EUR
- `diet` (string, optional) : Type de régime (`vegetarian`, `vegan`, `gluten-free`, etc.)
- `timeMax` (number, optional) : Temps de préparation max en minutes
- `limit` (number, optional, default: 20) : Nombre de résultats
- `offset` (number, optional, default: 0) : Pagination offset

**Exemple:**
```bash
GET /api/recipes/search?query=pasta&budgetMax=5&diet=vegetarian&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "654959",
        "title": "Pasta Primavera",
        "image": "https://...",
        "servings": 4,
        "readyInMinutes": 30,
        "pricePerServingEur": 2.85,
        "totalPriceEur": 11.40,
        "ecoScore": 75,
        "ecoScoreGrade": "B",
        "provider": "spoonacular",
        "vegetarian": true,
        "vegan": false,
        ...
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "providers": [
      {
        "name": "spoonacular",
        "available": true,
        "quotaRemaining": 142
      }
    ]
  }
}
```

---

### Détails d'une recette

**`GET /api/recipes/:provider/:id`**

Récupère les détails complets d'une recette.

**Parameters:**
- `provider` (string) : `spoonacular`, `edamam`, ou `themealdb`
- `id` (string) : ID de la recette chez le provider

**Exemple:**
```bash
GET /api/recipes/spoonacular/654959
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "654959",
      "title": "Pasta Primavera",
      "image": "https://...",
      "servings": 4,
      "readyInMinutes": 30,
      "pricePerServingEur": 2.85,
      "totalPriceEur": 11.40,
      "ecoScore": 75,
      "ecoScoreGrade": "B",
      "ecoScoreDetails": {
        "ingredientsAnalyzed": 12,
        "breakdown": [...],
        "recommendations": [...]
      },
      "ingredients": [
        {
          "name": "pasta",
          "amount": 300,
          "unit": "g",
          "original": "300g pasta"
        }
      ],
      "instructions": [
        {
          "number": 1,
          "step": "Boil water and cook pasta..."
        }
      ],
      "nutrition": {
        "calories": 420,
        "protein": 15,
        "carbs": 65,
        "fat": 12
      },
      ...
    }
  }
}
```

---

### Recette aléatoire

**`GET /api/recipes/random`**

Obtenir une recette surprise aléatoire.

**Response:** Même structure que `GET /api/recipes/:provider/:id`

---

### Status des providers

**`GET /api/recipes/providers/status`**

Vérifier la disponibilité des providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "spoonacular",
        "available": true,
        "quotaRemaining": 142,
        "lastError": null
      },
      {
        "name": "edamam",
        "available": true,
        "quotaRemaining": null,
        "lastError": null
      },
      {
        "name": "themealdb",
        "available": true,
        "quotaRemaining": null,
        "lastError": null
      }
    ],
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Favoris - Liste

**`GET /api/recipes/favorites`** 🔒

Récupérer les recettes favorites de l'utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": "clx123abc",
        "userId": "clx456def",
        "externalId": "654959",
        "provider": "spoonacular",
        "recipe": {
          "title": "Pasta Primavera",
          "image": "https://...",
          ...
        },
        "pricePerServing": 2.85,
        "ecoScore": 75,
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Favoris - Ajouter

**`POST /api/recipes/favorites`** 🔒

Ajouter une recette aux favoris.

**Body:**
```json
{
  "externalId": "654959",
  "provider": "spoonacular"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recipe added to favorites",
  "data": {
    "favorite": {
      "id": "clx123abc",
      "userId": "clx456def",
      "externalId": "654959",
      "provider": "spoonacular",
      "recipe": {...},
      "pricePerServing": 2.85,
      "ecoScore": 75,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  }
}
```

---

### Favoris - Supprimer

**`DELETE /api/recipes/favorites/:id`** 🔒

Retirer une recette des favoris.

**Parameters:**
- `id` (string) : ID du favori (pas l'externalId !)

---

### Favoris - Vérifier

**`GET /api/recipes/favorites/check/:provider/:externalId`** 🔒

Vérifier si une recette est dans les favoris.

**Response:**
```json
{
  "success": true,
  "data": {
    "isFavorited": true,
    "externalId": "654959",
    "provider": "spoonacular"
  }
}
```

---

## 💰 Budget Alimentaire

### Logger une dépense

**`POST /api/food-spending`** 🔒

Enregistrer une dépense alimentaire.

**Body:**
```json
{
  "externalId": "654959",
  "provider": "spoonacular",
  "recipeName": "Pasta Primavera",
  "costEur": 2.85,
  "servings": 4,
  "metadata": {
    "ecoScore": 75,
    "category": "dinner"
  }
}
```

---

### Statistiques mensuelles

**`GET /api/food-spending/stats/monthly?year=2025&month=1`** 🔒

Obtenir les statistiques du mois.

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "year": 2025,
      "month": 1,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.999Z"
    },
    "spending": {
      "total": 285.50,
      "totalMeals": 42,
      "avgCostPerMeal": 6.80,
      "byProvider": {
        "spoonacular": 180.30,
        "edamam": 75.20,
        "themealdb": 30.00
      }
    },
    "budget": {
      "monthlyBudget": 300.00,
      "remaining": 14.50,
      "usedPercent": 95.17,
      "isOverBudget": false
    },
    "logs": [...]
  }
}
```

---

### Tendance

**`GET /api/food-spending/stats/trend?months=6`** 🔒

Obtenir l'évolution des dépenses sur N mois.

---

### Définir le budget

**`PUT /api/food-spending/budget`** 🔒

Définir le budget mensuel alimentaire.

**Body:**
```json
{
  "budgetEur": 300.00
}
```

---

## 📊 Pluqla EcoScore

Le **Pluqla EcoScore** est un score sur 100 calculé automatiquement pour chaque recette basé sur :

### Méthodologie

- **Départ** : 50 (neutre)
- **Viande rouge** : -15 par ingrédient
- **Volaille** : -10 par ingrédient
- **Poisson** : -8 par ingrédient
- **Produits laitiers** : -5 par ingrédient
- **Légumes/Fruits** : +5 par ingrédient
- **Légumineuses** : +6 par ingrédient

### Grades

| Score | Grade | Couleur | Emoji |
|-------|-------|---------|-------|
| 80-100 | A | Vert | 🌱 |
| 65-79 | B | Vert clair | 🍃 |
| 50-64 | C | Orange | ⚠️ |
| 35-49 | D | Orange foncé | 🔶 |
| 0-34 | E | Rouge | 🔴 |

### Recommandations

Le système fournit automatiquement des recommandations pour améliorer l'éco-score :
- Réduire la viande
- Limiter les produits laitiers
- Ajouter plus de légumes

---

## 💡 Conversion Prix

### USD → EUR

- **Taux de change** : 1 USD = 0.93 EUR
- **Ajustement France** : +8% (marché français plus cher)
- **Formule** : `Prix EUR = Prix USD × 0.93 × 1.08`

### Catégories de prix

- **Budget** : < 3 EUR/portion 💚
- **Modéré** : 3-6 EUR/portion 💛
- **Premium** : > 6 EUR/portion 💙

---

## 🔧 Développement

### Installation

```bash
cd server
npm install
```

### Variables d'environnement

Copier `.env.example` vers `.env` et configurer :

```bash
# Spoonacular
SPOONACULAR_API_KEY=your_key_here

# Edamam
EDAMAM_APP_ID=your_app_id
EDAMAM_APP_KEY=your_app_key

# Redis
REDIS_URL=redis://localhost:6379
```

### Lancer le serveur

```bash
npm run dev
```

---

## 🧪 Tests

### Tests unitaires

```bash
npm test -- src/services/recipesAPI
```

### Tests E2E

```bash
npx playwright test tests/e2e/recipes-api.spec.js
```

---

## 📈 Monitoring

### Cache Stats

```javascript
const { getCacheService } = require('./services/recipesAPI/cacheService');
const cache = getCacheService();
const stats = cache.getStats();

console.log(stats);
// {
//   hits: 1250,
//   misses: 180,
//   totalRequests: 1430,
//   hitRate: "87.41%",
//   redisAvailable: true,
//   fallbackKeys: 42
// }
```

### Health Check

```bash
GET /api/recipes/providers/status
```

---

## 🚨 Troubleshooting

### "all providers unavailable"

**Cause** : Tous les providers sont down ou quotas dépassés.

**Solution** :
1. Vérifier les quotas API avec `GET /api/recipes/providers/status`
2. Attendre le reset du quota (Spoonacular = 00:00 UTC)
3. Vérifier les clés API dans `.env`

### Cache non fonctionnel

**Cause** : Redis down + node-cache full.

**Solution** :
1. Redémarrer Redis : `docker restart pluqla-redis`
2. Vérifier `REDIS_URL` dans `.env`
3. Monitorer : `cache.healthCheck()`

### Prix incorrects

**Cause** : Taux de change obsolète.

**Solution** : Mettre à jour `USD_TO_EUR_RATE` dans `/utils/priceConverter.js`

---

## 🔄 Migration depuis l'ancienne DB

### Étapes

1. **Backup** : Exporter les favoris existants
2. **Migration Prisma** : `npx prisma migrate dev --name refactor_recipes_api_based`
3. **Supprimer seeders** : Retirer `/prisma/seed-recipes*.js`
4. **Tester** : Vérifier endpoints avec Postman

### Script de migration

Un script sera fourni pour migrer les favoris existants vers la nouvelle structure.

---

## 📚 Ressources

- [Spoonacular API Docs](https://spoonacular.com/food-api/docs)
- [Edamam Recipe API Docs](https://developer.edamam.com/edamam-docs-recipe-api)
- [TheMealDB API Docs](https://www.themealdb.com/api.php)
- [Open Food Facts](https://world.openfoodfacts.org/) (pour éco-score)

---

## 🎯 Roadmap

### Phase 2 (À venir)

- [ ] **Enrichissement Open Food Facts** : Nutri-score et éco-score réels
- [ ] **IA Suggestions** : Recommandations personnalisées basées sur historique
- [ ] **Génération liste de courses** : Fusion multi-recettes
- [ ] **Planification hebdomadaire** : Intégration `WeeklyMealPlan`
- [ ] **Mode offline** : Cache étendu pour recettes consultées

---

**Version** : 1.0.0
**Dernière MAJ** : Janvier 2025
**Contact** : Équipe Dev Pluqla
