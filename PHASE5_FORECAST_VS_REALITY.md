# 🎯 Phase 5 - Prévision vs Réalité : Implémentation Complète

**Date** : 23 Octobre 2025
**Feature** : Matching automatique Prévision ↔ Transactions bancaires réelles
**Objectif** : Lier dépenses alimentaires prévues avec transactions réelles, éviter doublons, afficher comparaison budget

---

## 📊 Résumé Exécutif

### ✅ Ce qui a été implémenté

**Backend :**
1. **Migration Prisma** : Ajout champs Phase 5 (status, actualPriceEur, linkedTransactionId, dateMatched)
2. **Service Matcher** : Logique complète de matching automatique
3. **3 nouveaux endpoints** : `/match`, `/forecast-vs-reality`, `/check-duplicate`
4. **Cron job quotidien** : Matching automatique à 2h du matin
5. **Service foodSpendingService** : Adaptation pour initialiser forecasts

**Frontend :**
6. **API Service** : 3 nouvelles méthodes dans `foodSpendingAPI`
7. **Hooks React Query** : `useForecastVsRealityStats`, `useMatchForecasts`, `useCheckDuplicate`
8. **Query Keys** : Configuration cache Phase 5

**À faire :**
- [ ] Composant UI `ForecastVsRealityPanel`
- [ ] Intégration dans `FoodBudgetWidget`
- [ ] Anti-doublon dans `BudgetQuickLogModal`
- [ ] Tests unitaires

### 🎯 Gains attendus

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Doublons budget** | Possibles | 0 (détectés automatiquement) | **100% prévention** |
| **Précision budget** | Estimation seulement | Réalité vs prévision | **Transparence totale** |
| **Matching automatique** | Manuel | Automatique (quotidien) | **Zéro effort utilisateur** |
| **Feedback utilisateur** | Aucun | "Prévu vs Réel + écart %" | **Insight actionnable** |

---

## 🏗️ Architecture Technique

### 📐 Schéma Base de Données (FoodSpendingLog)

```prisma
model FoodSpendingLog {
  id                    String    @id @default(cuid())
  userId                String
  externalId            String    // Recipe ID
  provider              String    // API provider
  recipeName            String

  // Phase 4B - Prévision
  costEur               Float     // Cost per serving
  servings              Int
  totalCostEur          Float     // Total estimated

  // Phase 5 - Réalité
  estimatedPriceEur     Float?    // Estimated (same as totalCostEur)
  actualPriceEur        Float?    // Actual from bank transaction

  // Phase 5 - Matching
  status                String    @default("forecast") // "forecast", "matched", "archived"
  linkedTransactionId   String?   // Link to AccountTransaction
  dateMatched           DateTime? // When matched

  // Dates
  date                  DateTime  @default(now())
  createdAt             DateTime  @default(now())

  // Metadata
  category              String    @default("food")
  metadata              Json?
}
```

**Migration SQL** : [`server/prisma/migrations/20251023000000_phase5_forecast_vs_reality/migration.sql`](server/prisma/migrations/20251023000000_phase5_forecast_vs_reality/migration.sql)

---

## 🤖 Service Matcher : Logique de Matching

### Fichier : [`server/src/services/foodSpendingMatcher.js`](server/src/services/foodSpendingMatcher.js)

### Critères de matching

```javascript
const MATCH_CONFIG = {
  amountTolerancePercent: 10,  // ±10%
  dateDaysRange: 3,            // ±3 jours
  foodCategories: [
    'alimentation',
    'supermarché',
    'restaurant',
    'food',
    'grocery',
    'épicerie'
  ],
  archiveAfterDays: 7,         // Archive si pas de match après 7 jours
};
```

### Algorithme de matching

1. **Pour chaque forecast en attente** (`status=forecast`)
2. **Rechercher transactions candidates** :
   - Catégorie = alimentation
   - Date dans ±3 jours
   - Montant dans ±10%
3. **Calculer score de match** (0-100) :
   - 60% poids sur montant
   - 40% poids sur date
4. **Sélectionner meilleur match** (score le plus élevé)
5. **Mettre à jour forecast** :
   - `status` → `"matched"`
   - `actualPriceEur` → montant transaction
   - `linkedTransactionId` → ID transaction
   - `dateMatched` → maintenant
6. **Archiver si trop vieux** (>7 jours sans match)

### Méthodes exposées

```javascript
// Match un seul forecast
matchSingleForecast(forecastId, transactions)

// Match tous les forecasts d'un utilisateur
matchUserForecasts(userId, { startDate, endDate })

// Match tous les utilisateurs (cron job)
matchAllForecasts({ startDate, endDate })

// Statistiques prévision vs réalité
getForecastVsRealityStats(userId, { startDate, endDate })

// Helpers exportés pour tests
isAmountWithinTolerance(estimated, actual, tolerance)
isDateWithinRange(plannedDate, actualDate, daysRange)
isFoodCategory(category)
findPotentialMatches(forecast, transactions)
```

---

## 📡 Endpoints API

### 1. POST `/api/food-spending/match`

**Trigger manuel du matching pour un utilisateur**

**Query params :**
- `startDate` (optional) : Date de début (ISO format)
- `endDate` (optional) : Date de fin (ISO format)

**Response :**
```json
{
  "success": true,
  "data": {
    "matched": 3,
    "archived": 1,
    "pending": 2,
    "forecasts": [
      { "id": "...", "status": "matched" },
      ...
    ]
  },
  "message": "Matching terminé : 3 correspondances trouvées, 1 archivée, 2 en attente"
}
```

### 2. GET `/api/food-spending/forecast-vs-reality`

**Statistiques prévision vs réalité**

**Query params :**
- `startDate` (optional) : Date de début (ISO format)
- `endDate` (optional) : Date de fin (ISO format)

**Response :**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-01T00:00:00.000Z",
      "endDate": "2025-10-23T23:59:59.999Z"
    },
    "forecast": {
      "total": 126.50,
      "count": 5,
      "logs": ["log1", "log2", ...]
    },
    "matched": {
      "total": 119.90,
      "count": 3,
      "logs": ["log1", "log2", ...]
    },
    "archived": {
      "count": 1,
      "logs": ["log3"]
    },
    "variance": {
      "amount": -6.60,
      "percent": -5.22
    },
    "accuracy": 94.78
  }
}
```

### 3. POST `/api/food-spending/check-duplicate`

**Vérifier si une dépense existe déjà (anti-doublon)**

**Body :**
```json
{
  "amount": 12.50,
  "date": "2025-10-23T00:00:00.000Z"
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "hasDuplicate": true,
    "potentialDuplicates": [
      {
        "id": "tx123",
        "amount": 12.90,
        "date": "2025-10-22T14:30:00.000Z",
        "description": "CARREFOUR PARIS",
        "category": "Alimentation",
        "accountName": "Compte Courant"
      }
    ]
  }
}
```

**Controller** : [`server/src/controllers/foodSpendingController.js`](server/src/controllers/foodSpendingController.js)
**Routes** : [`server/src/routes/foodSpending.js`](server/src/routes/foodSpending.js)

---

## ⏰ Cron Job Automatique

### Fichier : [`server/src/jobs/matchFoodSpending.js`](server/src/jobs/matchFoodSpending.js)

**Schedule** : Quotidien à 2:00 AM (configurable)

**Fonctionnement :**
```javascript
// Dans server/src/app.js ou scheduler.js
const cron = require('node-cron');
const { setupCronSchedule } = require('./jobs/matchFoodSpending');

// Setup daily matching at 2 AM
setupCronSchedule(cron, '0 2 * * *');
```

**Trigger manuel** (pour tests ou admin panel) :
```javascript
const { triggerManually } = require('./jobs/matchFoodSpending');
await triggerManually();
```

**Logs :**
```
[INFO] Starting food spending matching job...
[INFO] Food spending matching job completed {
  duration: "1243ms",
  usersProcessed: 42,
  totalMatched: 87,
  totalArchived: 12,
  totalPending: 34,
  errors: 0
}
```

---

## 🎨 Frontend : Hooks & Services

### Services API : [`client/src/services/recipesAPI.js`](client/src/services/recipesAPI.js)

```javascript
export const foodSpendingAPI = {
  // ... existing methods

  // Phase 5
  matchForecasts: async (startDate, endDate) => { ... },
  getForecastVsRealityStats: async (startDate, endDate) => { ... },
  checkDuplicate: async (amount, date) => { ... },
};
```

### Hooks React Query : [`client/src/hooks/useRecipesQuery.js`](client/src/hooks/useRecipesQuery.js)

```javascript
// Statistiques prévision vs réalité
export const useForecastVsRealityStats = (startDate, endDate, options = {}) => {
  return useQuery({
    queryKey: queryKeys.foodSpending.forecastVsReality(startDate, endDate),
    queryFn: () => foodSpendingAPI.getForecastVsRealityStats(startDate, endDate),
    ...options,
  });
};

// Trigger matching manuel
export const useMatchForecasts = () => {
  return useMutation({
    mutationFn: ({ startDate, endDate }) =>
      foodSpendingAPI.matchForecasts(startDate, endDate),
    onSuccess: (data) => {
      invalidateQueries.foodSpending();
      showToast(`Matching terminé ! ${data.matched} correspondances trouvées 🎯`, 'success');
    },
  });
};

// Vérification doublon
export const useCheckDuplicate = () => {
  return useMutation({
    mutationFn: ({ amount, date }) => foodSpendingAPI.checkDuplicate(amount, date),
  });
};
```

### Query Keys : [`client/src/config/queryClient.js`](client/src/config/queryClient.js)

```javascript
export const queryKeys = {
  foodSpending: {
    all: ['foodSpending'],
    forecastVsReality: (startDate, endDate) => [
      'foodSpending',
      'forecastVsReality',
      startDate,
      endDate,
    ],
  },
};
```

---

## 🖥️ UI : Composant Prévision vs Réalité

### À créer : `ForecastVsRealityPanel.jsx`

**Localisation** : `client/src/components/finance/ForecastVsRealityPanel.jsx`

**Design mockup :**
```
┌──────────────────────────────────────────────────┐
│ 📊 Prévision vs Réalité                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  Prévu : 126,50 €  ████████████████░░░░  100%  │
│  Réel  : 119,90 €  ██████████████░░░░░░   95%  │
│                                                  │
│  Écart : -6,60 € (-5,2%)                        │
│  🎉 Bravo ! Tu es 5,2% sous ton budget prévu    │
│                                                  │
│  Précision : 94,8% ⭐                            │
│                                                  │
│  [🔄 Synchroniser maintenant]                   │
│                                                  │
│  3 dépenses matchées • 2 en attente             │
│                                                  │
├──────────────────────────────────────────────────┤
│ Détail par dépense :                             │
│                                                  │
│ ✅ Pâtes Carbonara                              │
│    Prévu : 12,50 € → Réel : 12,90 €  (+0,40€)  │
│    Match : Carrefour Paris, 22/10               │
│                                                  │
│ ✅ Poulet rôti                                  │
│    Prévu : 18,00 € → Réel : 17,50 €  (-0,50€)  │
│    Match : Monoprix, 20/10                      │
│                                                  │
│ ⏳ Salade César (en attente de transaction)     │
│    Prévu : 8,50 €                               │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Intégration dans `FoodBudgetWidget.jsx`** :
```jsx
import ForecastVsRealityPanel from './ForecastVsRealityPanel';

const FoodBudgetWidget = () => {
  const [activeTab, setActiveTab] = useState('budget'); // 'budget' | 'forecast-vs-reality'

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('budget')}>Budget</button>
        <button onClick={() => setActiveTab('forecast-vs-reality')}>Prévu vs Réel</button>
      </div>

      {/* Content */}
      {activeTab === 'budget' && <BudgetView />}
      {activeTab === 'forecast-vs-reality' && <ForecastVsRealityPanel />}
    </div>
  );
};
```

---

## 🔒 Anti-Doublon : BudgetQuickLogModal

### Intégration dans [`client/src/components/common/BudgetQuickLogModal.jsx`](client/src/components/common/BudgetQuickLogModal.jsx)

**Flow avec vérification doublon :**
```
1. User ouvre modal Quick-Log
2. Données pré-remplies (montant, date)
3. → Appel automatique API check-duplicate
4. Si hasDuplicate = true :
   → Afficher warning banner
   "⚠️ Une dépense similaire existe déjà dans ta banque :
   Carrefour Paris - 12,90 € le 22/10"
   → Bouton "Utiliser celle-ci" (ferme modal, pas d'ajout)
   → Ou "Ajouter quand même" (force ajout)
5. Si hasDuplicate = false :
   → Confirmer normalement
```

**Implémentation :**
```jsx
import { useCheckDuplicate } from '../../hooks/useRecipesQuery';

const BudgetQuickLogModal = ({ isOpen, onClose, recipe }) => {
  const { mutate: checkDuplicate, data: duplicateCheck } = useCheckDuplicate();

  useEffect(() => {
    if (isOpen && recipe) {
      // Check for duplicates on modal open
      checkDuplicate({
        amount: recipe.price,
        date: new Date().toISOString(),
      });
    }
  }, [isOpen, recipe]);

  const hasDuplicate = duplicateCheck?.hasDuplicate;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* ... existing content */}

      {hasDuplicate && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <p className="text-orange-800 font-semibold mb-2">
            ⚠️ Dépense similaire détectée
          </p>
          <div className="text-sm text-orange-700">
            {duplicateCheck.potentialDuplicates[0].description} -{' '}
            {duplicateCheck.potentialDuplicates[0].amount} € le{' '}
            {new Date(duplicateCheck.potentialDuplicates[0].date).toLocaleDateString('fr-FR')}
          </div>
          <button className="mt-2 text-orange-800 underline text-sm">
            Utiliser cette transaction existante
          </button>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={isPending}
      >
        {hasDuplicate ? 'Ajouter quand même' : 'Confirmer'}
      </button>
    </Modal>
  );
};
```

---

## 🧪 Tests

### Tests Unitaires : `server/src/services/__tests__/foodSpendingMatcher.test.js`

```javascript
describe('foodSpendingMatcher', () => {
  describe('isAmountWithinTolerance', () => {
    it('should return true if within 10% tolerance', () => {
      expect(isAmountWithinTolerance(100, 95)).toBe(true);
      expect(isAmountWithinTolerance(100, 105)).toBe(true);
      expect(isAmountWithinTolerance(100, 90)).toBe(true);
      expect(isAmountWithinTolerance(100, 111)).toBe(false);
    });
  });

  describe('isDateWithinRange', () => {
    it('should return true if within 3 days', () => {
      const date1 = new Date('2025-10-20');
      const date2 = new Date('2025-10-22');
      expect(isDateWithinRange(date1, date2, 3)).toBe(true);
    });
  });

  describe('isFoodCategory', () => {
    it('should detect food categories', () => {
      expect(isFoodCategory('Alimentation')).toBe(true);
      expect(isFoodCategory('Supermarché')).toBe(true);
      expect(isFoodCategory('Transport')).toBe(false);
    });
  });

  describe('findPotentialMatches', () => {
    it('should find matching transactions', () => {
      const forecast = {
        date: new Date('2025-10-20'),
        estimatedPriceEur: 12.50,
      };

      const transactions = [
        { id: 'tx1', date: new Date('2025-10-21'), amount: -12.90, category: 'Alimentation' },
        { id: 'tx2', date: new Date('2025-10-25'), amount: -50.00, category: 'Alimentation' },
      ];

      const matches = findPotentialMatches(forecast, transactions);
      expect(matches).toHaveLength(1);
      expect(matches[0].transaction.id).toBe('tx1');
    });
  });

  describe('matchUserForecasts', () => {
    // Integration test with mocked Prisma
  });
});
```

### Tests E2E : `client/src/tests/e2e/forecast-vs-reality.spec.js`

```javascript
test('should match forecast with real transaction', async ({ page }) => {
  // 1. User adds recipe to budget (forecast created)
  await page.goto('/alimentation');
  await page.click('[aria-label="Ajouter au budget alimentaire"]');
  await page.click('button:has-text("Confirmer")');

  // 2. Simulate bank transaction import (mock API)
  await mockBankTransaction({
    amount: -12.90,
    category: 'Alimentation',
    date: new Date(),
  });

  // 3. Trigger matching
  await page.goto('/finance');
  await page.click('button:has-text("Synchroniser maintenant")');

  // 4. Verify match in UI
  await expect(page.locator('text=Prévu : 12,50 € → Réel : 12,90 €')).toBeVisible();
  await expect(page.locator('text=Match : Carrefour Paris')).toBeVisible();
});
```

---

## 📈 Métriques & Monitoring

### Events Analytics à tracker

```javascript
// Matching automatique (cron)
{
  event: 'forecast_auto_matched',
  userId: string,
  forecastId: string,
  transactionId: string,
  matchScore: number,
  variance: number
}

// Matching manuel (trigger user)
{
  event: 'forecast_manual_match_triggered',
  userId: string,
  matched: number,
  archived: number
}

// Doublon détecté
{
  event: 'duplicate_detected',
  userId: string,
  amount: number,
  action: 'cancelled' | 'forced'
}

// Stats consultées
{
  event: 'forecast_vs_reality_viewed',
  userId: string,
  accuracy: number,
  variance: number
}
```

### KPIs à mesurer

| KPI | Calcul | Cible |
|-----|--------|-------|
| **Match rate** | (Matched / Total forecasts) * 100 | >80% |
| **Accuracy moyenne** | AVG(100 - ABS(variance %)) | >90% |
| **Doublons évités** | Duplicate checks with action=cancelled | Tous |
| **Utilisation feature** | Users viewing forecast-vs-reality tab | >50% des users actifs |

---

## 🚀 Roadmap & Améliorations Futures

### Phase 5.1 : Machine Learning Matching

- Utiliser historique de matches pour améliorer scoring
- Détecter patterns utilisateur (supermarché habituel, montants moyens)
- Matching prédictif basé sur habitudes

### Phase 5.2 : Notifications Proactives

- "Ton budget alimentaire a été matché ! Tu as économisé 5,20 € ce mois-ci 🎉"
- Alertes si variance >20% ("Attention, tu dépenses plus que prévu")

### Phase 5.3 : Suggestions Intelligentes

- "Tu as prévu 120€ mais dépensé 95€. Voici 3 recettes qui rentrent dans ton budget restant"

### Phase 5.4 : Export & Rapports

- Export PDF "Mon budget alimentaire du mois"
- Graphique historique prévision vs réalité
- Partage avec conjoint/famille

---

## ✅ Checklist Déploiement

- [x] Migration Prisma créée
- [x] Service matcher complet
- [x] 3 endpoints API
- [x] Cron job configuré
- [x] Service adapté pour Phase 5
- [x] Hooks React Query créés
- [x] Query keys configurés
- [ ] Composant UI `ForecastVsRealityPanel`
- [ ] Intégration `FoodBudgetWidget`
- [ ] Anti-doublon `BudgetQuickLogModal`
- [ ] Tests unitaires matcher
- [ ] Tests E2E
- [ ] Documentation utilisateur
- [ ] Migration DB en production
- [ ] Feature flag `FF_FORECAST_VS_REALITY`
- [ ] Monitoring Sentry configuré
- [ ] Analytics events trackés
- [ ] Validation QA
- [ ] A/B test (5% → 25% → 100%)

---

## 📚 Fichiers Créés/Modifiés

### ✅ Backend (complet)

```
✅ Créés :
- server/prisma/migrations/20251023000000_phase5_forecast_vs_reality/migration.sql
- server/src/services/foodSpendingMatcher.js
- server/src/jobs/matchFoodSpending.js

✅ Modifiés :
- server/prisma/schema.prisma (FoodSpendingLog model enhanced)
- server/src/services/foodSpendingService.js (logFoodSpending with Phase 5 fields)
- server/src/controllers/foodSpendingController.js (+3 endpoints)
- server/src/routes/foodSpending.js (+3 routes)
```

### ✅ Frontend (services + hooks complets)

```
✅ Modifiés :
- client/src/services/recipesAPI.js (foodSpendingAPI +3 methods)
- client/src/hooks/useRecipesQuery.js (+3 hooks Phase 5)
- client/src/config/queryClient.js (queryKeys Phase 5)

⏳ À créer :
- client/src/components/finance/ForecastVsRealityPanel.jsx
- client/src/components/finance/__tests__/ForecastVsRealityPanel.test.jsx
```

---

## 🎓 Guide Utilisateur

### Comment ça marche ?

**1. Ajouter une recette au budget (Phase 4B)**
```
User → Clique "💰 Ajouter au budget" sur recette
     → Modal Quick-Log s'ouvre
     → Confirme (12,50 €)
     → FoodSpendingLog créé avec status="forecast"
```

**2. Matching automatique (Phase 5)**
```
Chaque nuit à 2h → Cron job s'exécute
                  → Recherche transactions bancaires récentes
                  → Si montant ±10% ET date ±3 jours ET catégorie=food
                  → Match trouvé !
                  → FoodSpendingLog mis à jour :
                     status="matched"
                     actualPriceEur=12,90 €
                     linkedTransactionId="tx123"
```

**3. Consultation stats (Phase 5)**
```
User → Ouvre Finance Dashboard
     → Onglet "Prévu vs Réel"
     → Voit :
        Prévu : 126,50 €
        Réel  : 119,90 €
        Écart : -6,60 € (-5,2%)
        Précision : 94,8% ⭐
```

**4. Éviter doublons (Phase 5)**
```
User → Veut ajouter recette 12,50 € aujourd'hui
     → Modal s'ouvre
     → API vérifie si transaction similaire existe
     → Si OUI : Warning "Dépense détectée : Carrefour 12,90 €"
     → User peut annuler ou forcer
```

---

**Status** : ✅ Backend complet, Frontend services OK, UI en cours
**Prochaine étape** : Créer composants UI + tests + déploiement

---

**Équipe** : Pluqla Dev Team
**Version** : Phase 5.0
**Date** : 23 Octobre 2025
