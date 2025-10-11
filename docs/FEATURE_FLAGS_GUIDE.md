# Feature Flags - Guide de Réactivation

## 🎯 Vue d'Ensemble

Ce document explique comment gérer les **feature flags** dans Pluqla pour activer/désactiver des fonctionnalités sans supprimer de code.

---

## 📋 État Actuel (V1)

### Features Actives ✅
- **Finance** - Gestion budget, économies, transactions
- **Alimentation** - Planification repas, courses, suggestions IA
- **Déplacements** - Optimisation trajets, coûts, mobilité

### Features Masquées ⏸️ (Code Conservé)
- **Habits** (Mode) - Garde-robe intelligente, suggestions tenues
- **Activité** (Sport/Lifestyle) - Tracking sport, bien-être, santé

**Layout V1 :**
```
┌─────────────────┐
│    Finance      │ (Full width, premium)
└─────────────────┘
┌────────┬────────┐
│ Alim.  │ Transp.│ (Grid 1x2)
└────────┴────────┘
```

---

## 🔧 Comment Réactiver une Feature

### Méthode 1 : Toggle Simple (Recommandé)

**Fichier :** `client/src/config/featureFlags.js`

```javascript
export const FEATURE_FLAGS = {
  finance: true,
  alimentation: true,
  deplacement: true,

  // Pour réactiver Habits :
  habits: true,        // ← Passer de false à true

  // Pour réactiver Activité :
  activite: true       // ← Passer de false à true
};
```

**Étapes :**
1. Ouvrir `client/src/config/featureFlags.js`
2. Changer `habits: false` → `habits: true`
3. Changer `activite: false` → `activite: true`
4. Sauvegarder le fichier
5. Reload l'app (Hot Reload automatique en dev)

**Résultat :** Les 5 features réapparaissent immédiatement.

---

### Méthode 2 : Variables d'Environnement (Avancé)

**Pour activer par environnement (dev vs staging vs prod) :**

**1. Modifier `featureFlags.js` :**
```javascript
export const FEATURE_FLAGS = {
  finance: true,
  alimentation: true,
  deplacement: true,

  // Utiliser les variables d'env
  habits: import.meta.env.VITE_ENABLE_HABITS === 'true',
  activite: import.meta.env.VITE_ENABLE_ACTIVITE === 'true'
};
```

**2. Créer `.env.local` (dev uniquement) :**
```bash
VITE_ENABLE_HABITS=true
VITE_ENABLE_ACTIVITE=true
```

**3. Créer `.env.production` (prod) :**
```bash
VITE_ENABLE_HABITS=false
VITE_ENABLE_ACTIVITE=false
```

**Avantage :** Activer en dev sans impacter prod.

---

### Méthode 3 : Feature Flags Dynamiques (Futur)

**Pour A/B testing ou activation progressive :**

```javascript
// Intégration future avec LaunchDarkly, PostHog, etc.
import { FeatureFlagService } from './services/featureFlagService';

const flags = await FeatureFlagService.getFlags(userId);

export const FEATURE_FLAGS = {
  finance: true,
  alimentation: true,
  deplacement: true,
  habits: flags.habits,        // Activé pour 10% des users
  activite: flags.activite     // Activé pour beta testers
};
```

---

## 🧪 Tester la Réactivation en Local

### Test Rapide (5 minutes)

**1. Activer les features :**
```javascript
// client/src/config/featureFlags.js
export const FEATURE_FLAGS = {
  finance: true,
  alimentation: true,
  deplacement: true,
  habits: true,      // ✅
  activite: true     // ✅
};
```

**2. Lancer l'app :**
```bash
npm start
```

**3. Vérifier le Home Screen :**
- Finance (premium, rouge, full width)
- Alimentation (grid 2x2, top-left)
- Transport (grid 2x2, top-right)
- Habits (grid 2x2, bottom-left)
- Activité (grid 2x2, bottom-right)

**Layout attendu :**
```
┌─────────────────┐
│    Finance      │ (Full width, premium)
└─────────────────┘
┌────────┬────────┐
│ Alim.  │ Transp.│ (Grid 2x2)
├────────┼────────┤
│ Habits │ Activ. │
└────────┴────────┘
```

**4. Tester la navigation :**
- Cliquer sur chaque carte
- Vérifier que les écrans correspondants s'affichent
- Vérifier que les notifications fonctionnent (Alimentation: 5, Activité: 3)

**5. Désactiver à nouveau :**
```javascript
habits: false,
activite: false
```

---

## 📁 Fichiers Concernés

### 1. Configuration Feature Flags
**Fichier :** `client/src/config/featureFlags.js`

**Rôle :**
- Centralise tous les feature flags
- Expose les helpers `isFeatureEnabled()`, `getEnabledCategories()`
- Documentation inline complète

**À modifier :** Pour activer/désactiver une feature

---

### 2. CategoryGrid Component
**Fichier :** `client/src/components/home/CategoryGrid.jsx`

**Rôle :**
- Définit TOUTES les catégories (5 features)
- Filtre dynamiquement selon les flags
- Adapte le layout automatiquement

**À NE PAS modifier :** Le code est déjà adaptatif

**Code clé :**
```javascript
// TOUTES les catégories définies (L11-53)
const allCategories = [
  { id: 'finance', ... },
  { id: 'alimentation', ... },
  { id: 'deplacement', ... },
  { id: 'habits', ... },        // ⏸️ Masqué mais conservé
  { id: 'activite', ... }       // ⏸️ Masqué mais conservé
];

// Filtrage automatique (L58)
const categories = getEnabledCategories(allCategories);

// Layout adaptatif (L64)
const gridCols = otherCategories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2';
```

---

## ⚠️ Points d'Attention

### 1. Aucune Suppression de Code
- ✅ Tout le code de Habits et Activité est **conservé intégralement**
- ✅ Les assets (logos, images) restent en place
- ✅ Les routes et écrans existent toujours
- ✅ Juste un filtrage visuel via feature flags

### 2. Layout Automatique
- 3 features → Grid 1x2 (Finance + Alim/Transport côte à côte)
- 5 features → Grid 2x2 (Finance + Alim/Transport/Habits/Activité)
- Aucun ajustement manuel nécessaire

### 3. Optimisation No-Scroll Maintenue
- Le layout optimisé pour iPhone SE (375x667px) reste valide
- Avec 3 features : 433px de contenu (104px de marge) ✅
- Avec 5 features : ~500px de contenu (toujours pas de scroll sur iPhone SE) ✅

---

## 🚀 Roadmap Suggérée

### V1 (Actuel)
- ✅ Finance, Alimentation, Déplacements actifs
- ✅ Habits et Activité masqués

### V1.1 (Beta Testing)
- 🔜 Réactiver Habits pour 10% des users (A/B test)
- 🔜 Collecter feedback utilisateurs

### V1.2 (Beta Testing)
- 🔜 Réactiver Activité pour beta testers
- 🔜 Itérer selon feedback

### V2 (Public)
- 🔜 Activer Habits et Activité pour tous
- 🔜 5 features complètes

---

## 🛠️ Helpers Disponibles

### `isFeatureEnabled(featureId)`
Vérifie si une feature est active.

```javascript
import { isFeatureEnabled } from '../config/featureFlags';

if (isFeatureEnabled('habits')) {
  // Code exécuté uniquement si habits est actif
  console.log('Habits feature enabled');
}
```

### `getEnabledCategories(categories)`
Filtre les catégories selon les flags.

```javascript
import { getEnabledCategories } from '../config/featureFlags';

const allCategories = [finance, alimentation, deplacement, habits, activite];
const enabledCategories = getEnabledCategories(allCategories);
// → [finance, alimentation, deplacement] si habits et activite sont désactivés
```

### `getEnabledFeaturesCount()`
Retourne le nombre de features actives.

```javascript
import { getEnabledFeaturesCount } from '../config/featureFlags';

const count = getEnabledFeaturesCount();
// → 3 en V1, 5 si tout est activé
```

---

## 📞 Support

Pour toute question sur la réactivation des features :
1. Lire ce guide en entier
2. Tester en local avec `habits: true` et `activite: true`
3. Vérifier les logs console pour erreurs éventuelles
4. Consulter `client/src/config/featureFlags.js` pour la config actuelle

---

**Version :** 1.0.0
**Dernière MAJ :** Décembre 2024
**Auteur :** Victor (Pluqla Dev Team)
