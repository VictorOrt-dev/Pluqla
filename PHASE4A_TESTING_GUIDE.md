# 🧪 Phase 4A - Testing Guide

Guide rapide pour tester les 4 features de Phase 4A

---

## 🚀 Quick Start

### Installer Dépendances (si pas déjà fait)

```bash
# Client
cd client
npm install

# Installer Playwright pour E2E (si pas déjà fait)
npx playwright install
```

---

## ✅ Tests Automatisés

### 1. Tests Unitaires

```bash
# Tous les tests
cd client
npm test

# Tests Phase 4A uniquement
npm test -- --testNamePattern="(Social Share|Shopping List|Meal Planner|Offline)"

# Avec coverage
npm test -- --coverage

# Watch mode (re-run on file change)
npm test -- --watch
```

### 2. Tests E2E (Playwright)

```bash
# Tous les tests Phase 4A
cd client
npx playwright test src/tests/e2e/phase4a-features.spec.js

# Mode UI (interface graphique)
npx playwright test src/tests/e2e/phase4a-features.spec.js --ui

# Mode debug (step by step)
npx playwright test src/tests/e2e/phase4a-features.spec.js --debug

# Headless (plus rapide)
npx playwright test src/tests/e2e/phase4a-features.spec.js --headed=false

# Test specific feature
npx playwright test -g "Social Share"
npx playwright test -g "Shopping List"
npx playwright test -g "Meal Planner"
npx playwright test -g "Offline Mode"
```

### 3. Voir Rapport Tests

```bash
# Ouvrir rapport Playwright
npx playwright show-report

# Coverage report (Jest)
open coverage/lcov-report/index.html
```

---

## 🖱️ Tests Manuels

### Feature 1: Social Share

#### Test 1: Mobile Native Share
**Environnement**: Safari iOS / Chrome Android

1. Démarrer app: `npm start`
2. Naviguer: Alimentation → Cliquer sur recette
3. Cliquer bouton Share (icône partage, coin haut droit)
4. ✅ Vérifier: Share sheet natif s'ouvre
5. Choisir app (WhatsApp, Messages, etc.)
6. ✅ Vérifier: Lien partagé contient UTM params

#### Test 2: Desktop Fallback Menu
**Environnement**: Chrome Desktop / Firefox Desktop

1. Démarrer app: `npm start`
2. Ouvrir DevTools → Console
3. Désactiver Web Share API:
   ```javascript
   delete navigator.share
   ```
4. Naviguer: Alimentation → Cliquer sur recette
5. Cliquer bouton Share
6. ✅ Vérifier: Menu apparaît avec Facebook, Twitter, Copy Link
7. Cliquer "Copier le lien"
8. ✅ Vérifier: "Lien copié !" toast
9. Coller lien dans navigateur
10. ✅ Vérifier: URL contient `utm_source`, `utm_medium`, `utm_campaign`

---

### Feature 2: Shopping List Generator

#### Test 1: Génération Liste
**Environnement**: Tous browsers

1. Démarrer app: `npm start`
2. Ajouter 3+ recettes en favoris:
   - Alimentation → Chercher "poulet"
   - Ouvrir recette → Cliquer coeur (favoris)
   - Répéter 3 fois
3. Naviguer: Mes Favoris
4. Cliquer bouton "Liste de Courses" (vert)
5. ✅ Vérifier: Modal s'ouvre
6. ✅ Vérifier: Ingrédients groupés par catégorie (7 catégories)
7. ✅ Vérifier: Statistiques affichées (X items)

#### Test 2: Agrégation Ingrédients
**Prérequis**: 2+ recettes avec ingrédient commun (ex: tomates)

1. Ouvrir Shopping List
2. Trouver ingrédient commun (ex: tomates)
3. ✅ Vérifier: Quantité agrégée (ex: 350g au lieu de 200g + 150g)
4. ✅ Vérifier: "Utilisé dans 2 recettes" affiché

#### Test 3: Check/Uncheck Items
1. Ouvrir Shopping List
2. Cocher 3 items
3. ✅ Vérifier: Ligne barrée + grisée
4. ✅ Vérifier: Stats mise à jour (3/X items)
5. Décocher 1 item
6. ✅ Vérifier: Stats mise à jour (2/X items)

#### Test 4: Export Texte
1. Ouvrir Shopping List
2. Cliquer bouton "Exporter"
3. ✅ Vérifier: Fichier `liste-courses-YYYY-MM-DD.txt` téléchargé
4. Ouvrir fichier
5. ✅ Vérifier: Format lisible, catégories, checkboxes

#### Test 5: Print
1. Ouvrir Shopping List
2. Cliquer bouton "Imprimer"
3. ✅ Vérifier: Dialog d'impression s'ouvre
4. Preview: Format optimisé pour impression

---

### Feature 3: Meal Planner Calendar

#### Test 1: Ouverture Planner
**Prérequis**: 5+ recettes en favoris

1. Démarrer app: `npm start`
2. Naviguer: Mes Favoris
3. Cliquer bouton "Planifier mes Repas" (violet)
4. ✅ Vérifier: Modal fullscreen s'ouvre
5. ✅ Vérifier: 7 jours affichés (Lun-Dim)
6. ✅ Vérifier: 3 meal types (Breakfast, Lunch, Dinner)
7. ✅ Vérifier: Drawer recettes disponibles (bas de page)

#### Test 2: Drag-and-Drop
1. Ouvrir Meal Planner
2. Cliquer sur recette dans drawer (maintenir clic)
3. Drag vers slot (ex: Lundi - Breakfast)
4. Drop
5. ✅ Vérifier: Recette apparaît dans slot
6. ✅ Vérifier: Image + titre + temps affiché
7. ✅ Vérifier: Stats mise à jour (1/21 repas)

#### Test 3: Remplir Plusieurs Slots
1. Drag-and-drop 5 recettes différentes
2. ✅ Vérifier: Stats mise à jour (5/21)
3. ✅ Vérifier: Slots affichent recettes correctes

#### Test 4: Navigation Semaines
1. Noter numéro semaine actuel (ex: "Semaine 42")
2. Cliquer bouton "←" (Previous week)
3. ✅ Vérifier: Numéro semaine change (Semaine 41)
4. ✅ Vérifier: Slots vides (nouvelle semaine)
5. Cliquer bouton "→" (Next week)
6. ✅ Vérifier: Retour semaine 42
7. ✅ Vérifier: Recettes précédentes toujours là (localStorage)

#### Test 5: localStorage Persistence
1. Ajouter 3 recettes au planner
2. Fermer modal
3. Rafraîchir page (F5)
4. Réouvrir Meal Planner
5. ✅ Vérifier: 3 recettes toujours là

#### Test 6: Export Texte
1. Remplir 5+ slots
2. Cliquer "Exporter"
3. ✅ Vérifier: Fichier `meal-plan-week-XX-YYYY.txt` téléchargé
4. Ouvrir fichier
5. ✅ Vérifier: Format lisible, jours, meal types, recettes

#### Test 7: Clear Week
1. Remplir 5+ slots
2. Cliquer "Effacer la semaine"
3. ✅ Vérifier: Confirmation dialog
4. Confirmer
5. ✅ Vérifier: Tous les slots vidés
6. ✅ Vérifier: Stats = 0/21

---

### Feature 4: Offline Mode (PWA)

#### Test 1: Service Worker Registration
**Environnement**: Chrome Desktop

1. Démarrer app: `npm start`
2. Ouvrir DevTools (F12)
3. Aller: Application → Service Workers
4. ✅ Vérifier: Service worker "Activated and running"
5. ✅ Vérifier: Version = "pluqla-v1.0.0"

#### Test 2: Offline Banner
1. Démarrer app
2. Ouvrir DevTools → Network
3. Cocher "Offline"
4. ✅ Vérifier: Banner rouge apparaît en haut
5. ✅ Vérifier: Texte "Vous êtes hors ligne"
6. ✅ Vérifier: Icône WifiOff avec animation pulse

#### Test 3: Back Online Toast
1. Offline (banner rouge visible)
2. Décocher "Offline"
3. ✅ Vérifier: Toast vert apparaît (top-right)
4. ✅ Vérifier: Texte "Connexion rétablie !"
5. Attendre 3 secondes
6. ✅ Vérifier: Toast disparaît automatiquement
7. ✅ Vérifier: Banner rouge disparue

#### Test 4: Connection Status Dot
1. Regarder coin bas-droit
2. ✅ Vérifier: Petit point vert visible
3. Passer offline
4. ✅ Vérifier: Point devient rouge + pulse
5. Repasser online
6. ✅ Vérifier: Point redevient vert

#### Test 5: Offline Page Load
1. Naviguer sur plusieurs pages (online)
2. Attendre 10 secondes (cache build)
3. Passer offline
4. Rafraîchir page (F5)
5. ✅ Vérifier: Page charge depuis cache
6. Naviguer: Home → Alimentation → Favoris
7. ✅ Vérifier: Navigation fonctionne (pages en cache)

#### Test 6: Offline Fallback
1. Online: Naviguer sur Home
2. Passer offline
3. Naviguer vers page non-cachée:
   ```
   http://localhost:3000/uncached-page-12345
   ```
4. ✅ Vérifier: Page offline.html s'affiche
5. ✅ Vérifier: Design "Vous êtes hors ligne"
6. ✅ Vérifier: Bouton "Réessayer"
7. ✅ Vérifier: Auto-detect reconnexion

#### Test 7: Update Available
**Environnement**: Après nouveau deploy (simulate)

1. Simuler mise à jour:
   - Ouvrir DevTools → Application → Service Workers
   - Cliquer "Update"
   - Modifier service-worker.js version → sauvegarder
   - Rafraîchir page
2. ✅ Vérifier: Banner bleu apparaît (bas de page)
3. ✅ Vérifier: Texte "Mise à jour disponible"
4. ✅ Vérifier: Bouton "Mettre à jour"
5. Cliquer "Mettre à jour"
6. ✅ Vérifier: Page se rafraîchit
7. ✅ Vérifier: Nouveau service worker actif

#### Test 8: Cache Strategies

**Test 8.1: API - Network First**
1. Online: Ouvrir Alimentation (API call)
2. Ouvrir DevTools → Network → Filter "Fetch/XHR"
3. ✅ Vérifier: Request vers API
4. Passer offline
5. Rafraîchir Alimentation
6. ✅ Vérifier: Données affichées depuis cache
7. ✅ Vérifier: Banner "Hors ligne" affiché

**Test 8.2: Images - Cache First**
1. Online: Ouvrir recette avec image
2. DevTools → Network → Disable cache
3. Rafraîchir
4. ✅ Vérifier: Image chargée depuis réseau
5. Passer offline
6. Rafraîchir
7. ✅ Vérifier: Image chargée depuis cache (pas d'erreur)

**Test 8.3: Static Assets - Cache First**
1. Online: Load app
2. DevTools → Network → Check "Offline"
3. Rafraîchir (F5)
4. ✅ Vérifier: App charge (CSS, JS depuis cache)
5. ✅ Vérifier: Pas d'erreurs 404

---

## 🎯 Test Integration Complet

**Scénario utilisateur complet** (15 minutes)

### Setup
1. Vider cache navigateur
2. Démarrer app: `npm start`
3. Login: test@pluqla.com / Test123!

### Étape 1: Ajouter Favoris
1. Alimentation → Chercher "poulet"
2. Ajouter 3 recettes en favoris
3. Chercher "salade"
4. Ajouter 2 recettes en favoris
5. ✅ Vérifier: 5 favoris total

### Étape 2: Planifier Repas
1. Mes Favoris → "Planifier mes Repas"
2. Drag 7 recettes → 7 slots différents
3. ✅ Vérifier: Stats = 7/21
4. Export meal plan
5. ✅ Vérifier: Fichier téléchargé
6. Fermer modal

### Étape 3: Générer Liste Courses
1. "Liste de Courses"
2. ✅ Vérifier: Ingrédients des 5 recettes
3. Cocher 10 items
4. Export liste
5. ✅ Vérifier: Fichier téléchargé
6. Fermer modal

### Étape 4: Partager Recette
1. Cliquer sur recette
2. Bouton Share
3. Copier lien (ou partager mobile)
4. ✅ Vérifier: Lien avec UTM
5. Fermer modal

### Étape 5: Tester Offline
1. DevTools → Network → Offline
2. ✅ Vérifier: Banner rouge
3. Naviguer: Home → Favoris → Alimentation
4. ✅ Vérifier: Navigation fonctionne
5. Ouvrir meal planner
6. ✅ Vérifier: 7 recettes toujours là (localStorage)
7. Network → Online
8. ✅ Vérifier: Toast vert "Connexion rétablie"

### ✅ Succès si:
- Toutes les navigations fluides
- Aucune erreur console
- Données persistées
- Offline mode fonctionnel

---

## 🐛 Debug & Troubleshooting

### Service Worker Not Registering
```bash
# Vérifier NODE_ENV
echo $NODE_ENV  # Doit être "production"

# Build production
npm run build

# Serve build
npx serve -s build
```

### Tests E2E Failing
```bash
# Clear Playwright cache
npx playwright install --force

# Run with debug
npx playwright test --debug

# Check screenshots
open test-results/
```

### Cache Issues
```bash
# Clear browser cache
# Chrome: DevTools → Application → Clear storage

# Unregister service worker
# DevTools → Application → Service Workers → Unregister

# Clear localStorage
localStorage.clear()
```

---

## 📊 Coverage Report

Voir coverage après tests:

```bash
# Run tests with coverage
npm test -- --coverage

# Open report
open coverage/lcov-report/index.html
```

Target: **95%+** coverage ✅

---

## 🎓 Tips

1. **Toujours tester mobile** - Features optimisées pour mobile
2. **Vider cache régulièrement** - Éviter faux positifs
3. **Console logs** - Surveiller erreurs
4. **Network throttling** - Simuler 3G/4G
5. **Service Worker** - Unregister/register entre tests

---

**Bon testing! 🚀**

Questions? Voir [PHASE4A_SUMMARY.md](PHASE4A_SUMMARY.md)
