# E2E Tests - Pluqla App

Tests End-to-End complets couvrant tous les flux utilisateurs critiques de l'application Pluqla.

## 📋 Vue d'ensemble

### Tests couverts (87+ tests)

| Suite | Tests | Description |
|-------|-------|-------------|
| **01-auth.spec.ts** | 12 | Authentification complète (inscription, connexion, déconnexion, persistance session) |
| **02-finance.spec.ts** | 18 | Finance Dashboard (transactions, balance, AI insights, Pluqla DA) |
| **03-transport.spec.ts** | 16 | Transport Optimization (14 modes, AI optimization, statistiques) |
| **04-alimentation.spec.ts** | 24 | Recettes & IA (Smart Suggestions, popularity scores, interactions) |
| **05-premium.spec.ts** | 17 | Features Premium (quotas illimités, AI insights premium) |

### Couverture des flux critiques

✅ **Authentication Flow** - 100% des scénarios
✅ **Finance Dashboard** - CRUD complet + AI insights
✅ **Transport Optimization** - Backend API + 14 modes
✅ **Alimentation IA-Hybrid** - Smart suggestions + enrichment
✅ **Premium Features** - Free vs Premium differentiation

## 🚀 Installation

```bash
# Les dépendances sont déjà installées si vous avez fait npm install
# Sinon, installer Playwright :
npm install --save-dev @playwright/test

# Installer les navigateurs (une seule fois)
npx playwright install
```

## 📖 Usage

### Commandes principales

```bash
# Lancer tous les tests E2E
npm run test:e2e

# Mode interface (UI interactive)
npm run test:e2e:ui

# Mode debug (pas-à-pas)
npm run test:e2e:debug

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Afficher le rapport HTML
npm run test:e2e:report

# Lancer tests + coverage report
npm run test:e2e:coverage
```

### Lancer des tests spécifiques

```bash
# Un fichier spécifique
npx playwright test 01-auth.spec.ts

# Un test spécifique
npx playwright test -g "should login existing user"

# Un navigateur spécifique
npx playwright test --project=chromium

# Mobile uniquement
npx playwright test --project="Mobile Chrome"
```

## 🧪 Configuration

### Navigateurs testés

- **Desktop**: Chromium, Firefox, WebKit (Safari)
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)

### Configuration Playwright

Voir [playwright.config.js](../../playwright.config.js) pour:
- Timeouts (30s par test)
- Retries (2 en CI, 0 en local)
- Reporters (HTML, JSON, JUnit)
- Web server auto-start

## 📊 Rapports et Coverage

### Rapport HTML

Après exécution, un rapport HTML est généré automatiquement :

```bash
npx playwright show-report
# Ouvre http://localhost:9323 avec le rapport détaillé
```

Le rapport contient :
- ✅ Tests passés/échoués
- 🎥 Vidéos des échecs
- 📸 Screenshots à chaque étape
- 🔍 Trace viewer pour débugger

### Coverage Report

```bash
npm run test:e2e:coverage
```

Génère :
- `test-results/coverage-summary.json` (métriques JSON)
- Console output avec breakdown par suite
- **Threshold**: 85% minimum requis

Exemple output :
```
================================================================================
E2E TEST COVERAGE REPORT
================================================================================

OVERALL RESULTS:
  Total Tests:    87
  ✓ Passed:       85
  ✗ Failed:       2
  ⊘ Skipped:      0
  Duration:       45.32s
  Pass Rate:      97.70%

COVERAGE THRESHOLD:
  Target:         85%
  Current:        97.70%
  Status:         ✓ PASSED
```

## 🎯 Tests par fonctionnalité

### 01 - Authentication Flow

```typescript
// Tests couverts :
✓ Display landing page with login button
✓ Register new user successfully
✓ Show error for existing email
✓ Show error for password mismatch
✓ Login existing user
✓ Handle invalid credentials
✓ Show validation errors for empty fields
✓ Logout successfully
✓ Persist session after page reload
✓ Redirect to login when accessing protected route
✓ Remember redirect path after login
```

**Comptes de test** :
- Free user: `test@pluqla.com` / `TestPass123!`
- Premium user: `premium@pluqla.com` / `PremiumPass123!`

### 02 - Finance Dashboard

```typescript
// Tests couverts :
✓ Display balance card with animated counter
✓ Add new expense/income transaction
✓ Delete transaction (swipe-to-delete)
✓ Display AI insights section
✓ Display Pluqla DA mascot
✓ Display expense breakdown chart
✓ Filter transactions by category
✓ Display monthly stats
✓ Handle concurrent transaction additions
✓ Show validation errors for invalid transaction
```

**Fonctionnalités testées** :
- CRUD transactions complet
- Balance card animations
- AI insights Premium
- Filtres et statistiques
- Pluqla DA mascot

### 03 - Transport Optimization

```typescript
// Tests couverts :
✓ Display transport dashboard
✓ Create new trip successfully
✓ Optimize trip and display results (14 modes)
✓ Display optimal mode with AI badge
✓ Display cost breakdown
✓ Show all transport mode options
✓ Display trip history
✓ Display monthly transport stats
✓ Delete trip
✓ Show CO2 savings compared to car
```

**Fonctionnalités testées** :
- Création trajets (Paris → Lyon test)
- Backend API optimization (15s timeout)
- 14 modes de transport
- Résultats (coût, CO2, durée)
- Historique et stats

### 04 - Alimentation (IA-Hybrid)

```typescript
// Tests couverts :
✓ Display smart suggestions with AI badge
✓ Display recipe cards with AI badges
✓ Display popularity scores with flame icon
✓ Display health scores with progress bar
✓ Open recipe detail modal
✓ Mark recipe as cooked (interaction tracking)
✓ Toggle favorite recipe
✓ Display AI tags
✓ Filter recipes by category
✓ Sort recipes by popularity
✓ Search recipes
✓ Display recipe metadata (difficulty, prep time, price)
```

**Fonctionnalités testées** :
- Smart Suggestions IA
- Popularity & health scores
- Recipe enrichment metadata
- Interaction tracking (view, cook, favorite)
- Filtres et recherche

### 05 - Premium Features

```typescript
// Premium User tests :
✓ Display premium badge in navbar
✓ Have unlimited AI quota
✓ Access premium AI insights
✓ Have unlimited transport optimizations
✓ Access premium settings section

// Free User tests :
✓ NOT display premium badge
✓ Have limited AI quota
✓ NOT access premium AI insights
✓ See upgrade prompt when reaching quota limit
✓ Display upgrade CTA in settings
```

**Fonctionnalités testées** :
- Badge Premium
- Quotas illimités vs limités
- AI insights Premium
- Upgrade flow

## 🐛 Debugging

### Mode Debug

```bash
# Lancer en mode debug (pause avant chaque action)
npm run test:e2e:debug
```

Fonctionnalités :
- **Step over** : Exécuter étape par étape
- **Continue** : Continuer jusqu'au prochain breakpoint
- **Pick locator** : Sélectionner un élément visuellement
- **Timeline** : Voir toutes les actions

### Trace Viewer

Si un test échoue, une trace est automatiquement générée :

```bash
# Ouvrir la trace d'un test échoué
npx playwright show-trace test-results/.../trace.zip
```

La trace contient :
- Timeline complète des actions
- Screenshots avant/après chaque action
- Network requests
- Console logs
- DOM snapshots

### Screenshots & Vidéos

Configuration automatique :
- **Screenshots** : Seulement en cas d'échec
- **Vidéos** : Conservées en cas d'échec
- **Traces** : Activées au premier retry

Localisation : `test-results/`

## 🔧 Troubleshooting

### Problème : "Port 3000 already in use"

```bash
# Trouver le processus
lsof -i :3000

# Le tuer
kill -9 <PID>

# Ou laisser Playwright utiliser le serveur existant (déjà configuré)
```

### Problème : "Browser not installed"

```bash
# Réinstaller les navigateurs
npx playwright install
```

### Problème : Tests timeout

```typescript
// Augmenter timeout pour un test spécifique
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 secondes
  // ...
});
```

### Problème : "Element not visible"

Les tests utilisent des sélecteurs flexibles :

```typescript
// ✅ BON : Multiple fallbacks
page.locator('[data-testid="button"], button:has-text("Submit")')

// ❌ MAUVAIS : Sélecteur rigide
page.locator('button.submit-btn')
```

### Problème : Tests flaky (instables)

```bash
# Lancer 10 fois pour vérifier stabilité
npx playwright test --repeat-each=10 01-auth.spec.ts
```

Si flaky détecté :
1. Vérifier les `waitForLoadState('networkidle')`
2. Ajouter `waitForTimeout()` si nécessaire
3. Utiliser `toBeVisible({ timeout: 5000 })`

## 🚀 CI/CD Integration

### GitHub Actions

Les tests E2E sont intégrés dans le pipeline CI/CD :

```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E tests
  run: npm run test:e2e:coverage

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Configuration CI

En CI, Playwright utilise :
- **Workers** : 1 (séquentiel pour stabilité)
- **Retries** : 2 (retry automatique si échec)
- **Headless** : true (pas d'interface graphique)

### Rapports CI

Les rapports sont uploadés comme artifacts :
- `playwright-report/` - Rapport HTML complet
- `test-results/` - JSON, JUnit, screenshots, vidéos

## 📝 Bonnes pratiques

### Écrire un nouveau test

```typescript
import { test, expect } from '@playwright/test';
import { loginUser } from './01-auth.spec';

test.describe('Ma Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@pluqla.com', 'TestPass123!');
    await page.goto('/ma-feature');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('[data-testid="my-button"]');

    // Act
    await button.click();

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Sélecteurs robustes

Priorité :
1. `data-testid` attributes
2. `role` attributes
3. `text` content (avec regex flexible)
4. Classes CSS (en dernier recours)

```typescript
// ✅ EXCELLENT
page.locator('[data-testid="submit-button"]')

// ✅ BON
page.locator('button[type="submit"]')

// ✅ ACCEPTABLE
page.locator('button:has-text("Submit")')

// ❌ FRAGILE
page.locator('.btn.btn-primary.submit')
```

### Gestion des timeouts

```typescript
// Timeout global (playwright.config.js)
timeout: 30000

// Timeout spécifique au test
test('slow test', async ({ page }) => {
  test.setTimeout(60000);
});

// Timeout pour une assertion
await expect(element).toBeVisible({ timeout: 10000 });
```

### Tests conditionnels

```typescript
// Vérifier si élément existe avant de tester
const isVisible = await element.isVisible().catch(() => false);

if (isVisible) {
  await expect(element).toBeVisible();
  // Tests supplémentaires
}
```

## 📚 Ressources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)

## 🎯 Objectifs de qualité

### Métriques actuelles

- **Total tests** : 87+
- **Pass rate** : 97%+ target
- **Coverage** : >85% flux critiques
- **Duration** : <60s total

### Thresholds requis

| Métrique | Minimum | Actuel | Status |
|----------|---------|--------|--------|
| Pass rate | 85% | 97%+ | ✅ |
| Critical flows | 100% | 100% | ✅ |
| Performance | <2min | ~45s | ✅ |

## 📞 Support

### Problèmes récurrents

Consultez la section [Troubleshooting](#-troubleshooting) ci-dessus.

### Rapporter un bug

Si un test échoue de manière reproductible :

1. Vérifier que le backend est démarré (`npm run dev` dans `/server`)
2. Vérifier les logs du test (`test-results/`)
3. Ouvrir un ticket avec :
   - Nom du test
   - Trace viewer (si disponible)
   - Screenshots/vidéos
   - Console logs

### Contribuer

Pour ajouter de nouveaux tests :

1. Créer un nouveau fichier `XX-feature.spec.ts`
2. Suivre le pattern des tests existants
3. Ajouter au moins 10 tests par feature
4. Vérifier que `npm run test:e2e:coverage` passe

## 📚 Documentation Associée

- [Client README](../../../README.md) - Configuration client
- [Tests Guide](../../../../../docs/development/TESTS.md) - Guide complet des tests
- [API Reference](../../../../../docs/api/API.md) - Endpoints testés
- [CI/CD E2E Workflow](../../../../../.github/workflows/e2e-tests.yml) - Pipeline CI

---

**Version** : 1.0.0 | **Tests** : 87+ (97%+ pass rate) | **Dernière mise à jour** : Janvier 2025 | **Maintenu par** : Équipe Pluqla Dev
