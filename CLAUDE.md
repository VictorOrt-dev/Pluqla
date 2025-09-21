# CLAUDE.md - Guide +Clair ✅ RESTRUCTURÉ EN MONOREPO

App d'économies intelligentes : React frontend + Node.js/Express backend avec IA multi-providers.
🌍 **Support multilingue (FR, EN, ES) avec IA adaptée à chaque langue**
🔧 **Navigation Context stabilisée - Erreur setCurrentScreen résolue**
🛡️ **LanguageSelector sécurisé - Erreurs i18n undefined corrigées**
🔥 **Système de streak quotidien fonctionnel - NOUVEAU !**
⚡ **Application auditée et optimisée - Erreurs critiques corrigées**
🏗️ **RESTRUCTURATION MONOREPO COMPLÈTE - Architecture moderne !**

## 🚀 Commandes essentielles

**Racine (Monorepo)**
```bash
npm start              # Frontend + Backend simultanément
npm run start:frontend # Frontend seul (port 3000)
npm run start:backend  # Backend seul (port 3004)
npm run install:all    # Installe toutes les dépendances
npm run build          # Build production frontend
npm test               # Tests frontend + backend
```

**Frontend (dans frontend/)**
```bash
cd frontend
npm start          # Développement (port 3000)
npm run build      # Production
npm test           # Tests React
```

**Backend (dans backend/)**
```bash
cd backend
npm run dev        # Développement (port 3004)
npm run db:migrate # Migrations DB
npm run db:generate # Générer client Prisma
npm test           # Tests API
```

## 🏗 Stack technique

### 📁 Architecture Monorepo
```
+Clair/
├── frontend/           # Application React (port 3000)
│   ├── src/           # Code source React
│   ├── public/        # Assets statiques
│   ├── build/         # Build de production
│   └── package.json   # Dépendances frontend
├── backend/           # API Node.js (port 3004)
│   ├── src/           # Code source API
│   ├── prisma/        # Base de données
│   ├── tests/         # Tests backend
│   └── package.json   # Dépendances backend
├── package.json       # Scripts racine + workspaces
├── CLAUDE.md          # Ce guide
└── README.md          # Documentation utilisateur
```

### 🛠 Technologies
- **Frontend**: React 18 + Tailwind + PWA
- **Backend**: Node.js + Express + Prisma
- **DB**: SQLite (dev) / PostgreSQL (prod)
- **IA**: Claude, OpenAI, Gemini (multi-provider)
- **Auth**: JWT + refresh tokens
- **Navigation**: Context API + useCallback pour stabilité
- **Tests**: Jest + React Testing Library (80%+ coverage)
- **Monorepo**: npm workspaces + concurrently

## 🔥 SYSTÈME DE STREAK QUOTIDIEN

**Fonctionnalité de flamme quotidienne comme Duolingo** - Encourage l'épargne quotidienne :

```javascript
// ✅ API Streak
GET /api/strikes/current     // Récupérer le streak actuel
GET /api/strikes/stats       // Statistiques de streak

// ✅ Composant StreakDisplay
<StreakDisplay className="mt-2" />

// ✅ Event système pour updates temps réel
window.dispatchEvent(new CustomEvent('transactionAdded', {
  detail: { transaction, pointsEarned, newStreak }
}));
```

**Architecture streak** :
- **Controller** : `backend/src/controllers/strikeController.js`
- **Service** : `backend/src/services/strikeService.js`
- **Routes** : `backend/src/routes/strikes.js`
- **Component** : `frontend/src/components/common/StreakDisplay.jsx`
- **Hook intégration** : `frontend/src/hooks/useTransactions.js`

## ⚠️ PATTERN IA CRITIQUE

**useAISuggestions est ASYNC** - Ne jamais appeler directement :

```javascript
// ❌ JAMAIS ça
const suggestions = getAISuggestions(category);

// ✅ TOUJOURS ça
const { getAISuggestions, isLoading } = useAISuggestions();

useEffect(() => {
  const load = async () => {
    const suggestions = await getAISuggestions(category);
    setSuggestions(Array.isArray(suggestions) ? suggestions : []);
  };
  load();
}, [category]);
```

## 🌍 Support multilingue

**Frontend** - Utilisation automatique des traductions :

```javascript
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t } = useTranslation();
  return <h1>{t('onboarding.welcome.title')}</h1>;
};
```

**Backend** - API avec paramètre `lang` :

```javascript
// ✅ Correct - l'API détecte automatiquement la langue
const response = await fetch('/api/ai/suggestions?category=alimentation&lang=en');

// ✅ Fallback vers français si lang non spécifié
const response = await fetch('/api/ai/suggestions?category=alimentation');
```

**Langues supportées** : `fr` (défaut), `en`, `es`

## 🔒 Sécurité IA obligatoire

**TOUJOURS** vérifier les tableaux :

```javascript
// Dans services IA
const suggestions = data?.data?.suggestions;
return Array.isArray(suggestions) ? suggestions : [];

// Dans composants
const safe = Array.isArray(aiSuggestions) ? aiSuggestions : [];
```

## 📊 Base de données

**User model** - Utiliser `name` (PAS firstName/lastName) :

```javascript
await prisma.user.create({
  data: {
    email,
    password: hashedPassword,
    name, // ✅ Un seul champ
  }
});
```

## 📡 API Response format

```javascript
{
  "success": true,
  "message": "Message en français",
  "data": {
    "suggestions": [], // Toujours array
  }
}
```

## 🎯 Controllers pattern

```javascript
const { sendSuccess, sendError } = require('../utils/responseHelper');

exports.action = async (req, res) => {
  try {
    const result = await service();
    return sendSuccess(res, result, 'Succès');
  } catch (error) {
    logger.error('Erreur:', error);
    return sendError(res, 'Erreur', 500);
  }
};
```

## 🧭 Navigation Pattern CRITIQUE

**TOUJOURS utiliser NavigationContext** - Ne jamais passer setCurrentScreen en prop :

```javascript
// ❌ JAMAIS ça (ancien pattern)
<Component setCurrentScreen={setCurrentScreen} />

// ✅ TOUJOURS ça (nouveau pattern)
const { setCurrentScreen } = useNavigation();

// ✅ Composant stable
const { currentScreen, setCurrentScreen } = useNavigation();
setCurrentScreen('home'); // Fonction stable avec useCallback
```

## 🎛️ LanguageSelector - PATTERN SÉCURISÉ

**⚠️ TOUJOURS protéger contre les erreurs i18n** :

```javascript
// ✅ Protection obligatoire (dans le composant)
let currentLang, supportedLanguages;
try {
  currentLang = getCurrentLanguage() || 'fr';
  supportedLanguages = getSupportedLanguages() || ['fr'];
} catch (error) {
  console.warn('i18n not ready, using fallbacks:', error);
  currentLang = 'fr';
  supportedLanguages = ['fr'];
}
```

**3 variants disponibles** :

```javascript
// Dropdown complet (navbar)
<LanguageSelector variant="dropdown" showLabels={true} />

// Pills pour onboarding
<LanguageSelector variant="pills" />

// Minimal (juste drapeaux)
<LanguageSelector variant="minimal" />
```

## 🔍 VÉRIFICATIONS OBLIGATOIRES

**Avant modification de LanguageSelector :**
1. Lire le fichier actuel pour comprendre la structure
2. Identifier les calls à `getCurrentLanguage()` et `getSupportedLanguages()`
3. Vérifier que la protection try/catch est présente
4. Tester l'app après modification (npm start)

**Avant modification de composants avec i18n :**
1. Vérifier l'import de `useTranslation`
2. Confirmer que `t()` est utilisé pour les traductions
3. Vérifier les clés de traduction dans `frontend/src/i18n/locales/`

## ✅ À FAIRE SYSTÉMATIQUEMENT
1. Vérifier `Array.isArray()` pour IA
2. Utiliser `responseHelper` dans controllers
3. Logger erreurs avec contexte
4. Tests avant commit (`npm start`)
5. Protection try/catch pour i18n dans LanguageSelector

## ❌ ERREURS À ÉVITER
1. Appel IA synchrone
2. Utiliser `firstName`/`lastName` (utiliser `name`)
3. Oublier gestion erreur
4. Exposer clés API côté client
5. Traduire manuellement (utiliser `t()` de react-i18next)
6. Passer setCurrentScreen en prop directe (utiliser NavigationContext)
7. Créer composants sans tests dans src/components/
8. **❌ Modifier LanguageSelector sans protection i18n (cause page blanche)**
9. **❌ Transaction Prisma timeout (utiliser timeout: 10000)**

## 🚀 OPTIMISATIONS RÉCENTES

**✅ Corrections effectuées lors de l'audit complet** :

### 🏗️ Restructuration Monorepo (v2.0.0)
- **Architecture** : Séparation frontend/ et backend/ en dossiers distincts
- **Scripts unifiés** : npm start racine lance frontend + backend simultanément
- **Workspaces npm** : Gestion des dépendances centralisée
- **Documentation** : README.md moderne + CLAUDE.md mis à jour
- **Nettoyage** : Suppression fichiers obsolètes et dupliqués
- **Package.json** : Configuration monorepo avec concurrently

### Backend
- **Prisma Schema** : Suppression références inexistantes (firstName, lastName, preferences)
- **Transaction timeout** : Augmentation à 10s et séparation logique streak
- **Tests améliorés** : 54 tests réussis (vs 40 précédemment) - +35% d'amélioration
- **Code dupliqué** : Suppression userController.full.js (390 lignes)
- **Port configuration** : Standardisation sur port 3004

### Frontend
- **Build optimisé** : Compilation réussie avec warnings ESLint mineurs
- **Streak Display** : Component optimisé avec gestion d'erreur
- **Event system** : Mise à jour temps réel du streak fonctionnelle

### Base de données
- **Migration streak** : Champs lastSavingDate et streak ajoutés
- **Foreign keys** : Contraintes corrigées pour les tests
- **Timeout optimization** : Requêtes complexes optimisées

## 🎯 STATUT ACTUEL

**✅ FONCTIONNEL** :
- 🏗️ **Architecture Monorepo** : Restructuration complète frontend/ + backend/
- 🚀 **Scripts unifiés** : `npm start` lance les 2 apps simultanément
- Frontend sur http://localhost:3000 (dans frontend/)
- Backend sur http://localhost:3004 (dans backend/)
- Système streak avec progression 0→1 jour testé
- API streak (GET /api/strikes/current) opérationnelle
- Intégration frontend-backend validée
- Documentation complète (README.md + CLAUDE.md)

**⚠️ Points d'attention** :
- Warnings ESLint sur useEffect dependencies (non-bloquants)
- Services OAuth non configurés (optionnels)
- Email service non configuré (optionnel)
- Migration: Utiliser nouveaux chemins `frontend/` et `backend/`