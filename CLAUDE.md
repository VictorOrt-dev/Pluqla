# CLAUDE.md - Guide Développeur Pluqla

**Guide interne pour l'équipe de développement Pluqla**

---

## 🚀 Démarrage Rapide

### Setup Initial
```bash
git clone https://github.com/pluqla/app.git
cd pluqla
npm run install:all
cp .env.example .env
npm start
```

### URLs Locales
- **Client** : http://localhost:3000
- **API** : http://localhost:3004
- **Docs** : `/docs` folder

---

## 🏗️ Architecture Projet

### Structure Monorepo
```
pluqla/
├── client/        # React frontend (port 3000)
├── server/        # Node.js API (port 3004)
├── docs/          # Documentation technique
├── infra/         # Docker, CI/CD, monitoring
└── shared/        # Utils cross-platform
```

### Technologies Clés
- **Frontend** : React 18, Tailwind CSS, PWA
- **Backend** : Node.js, Express, Prisma, PostgreSQL
- **IA** : Multi-provider (OpenAI, Claude, Gemini)
- **Infra** : Docker, GitHub Actions

---

## 📋 Workflow Git

### Branches
```bash
main              # Production stable
develop           # Développement principal
feature/*         # Nouvelles fonctionnalités
hotfix/*          # Correctifs urgents
```

### Processus Standard
```bash
# Nouvelle feature
git checkout develop
git pull origin develop
git checkout -b feature/nom-fonctionnalite

# Développement + commits
git add .
git commit -m "feat: description claire"

# Pull Request
git push origin feature/nom-fonctionnalite
# Créer PR sur GitHub : feature/nom → develop
```

### Conventions Commits
```bash
feat: nouvelle fonctionnalité
fix: correction bug
docs: mise à jour documentation
style: formatage code
refactor: refactoring sans changement fonctionnel
test: ajout/modification tests
chore: maintenance (deps, config)
```

---

## ✅ Qualité & Standards

### Avant Chaque Commit
```bash
npm run lint              # ESLint + Prettier
npm test                  # Tests unitaires
npm run test:e2e          # Tests E2E (si modif API)
```

### Critères Qualité Obligatoires
- ✅ **Tests** : 85%+ couverture
- ✅ **Sécurité** : Aucune vulnérabilité critique
- ✅ **Performance** : Lighthouse 90+
- ✅ **Linting** : Zéro erreur ESLint
- ✅ **Types** : Pas d'erreurs TypeScript

### Code Review Checklist
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de console.log oubliés
- [ ] Variables d'env sécurisées
- [ ] Performance non dégradée

---

## 🔒 Sécurité

### Variables Sensibles
```bash
# ❌ JAMAIS dans le code
const API_KEY = "sk-1234567890"

# ✅ TOUJOURS via .env
const API_KEY = process.env.OPENAI_API_KEY
```

### JWT & Auth
```javascript
// ✅ Bonnes pratiques
- Secrets ≥32 caractères
- Rotation automatique refresh tokens
- Validation issuer/audience
- Rate limiting sur auth endpoints
```

### Logs Sécurisés
```javascript
// ❌ JAMAIS logger des données sensibles
logger.info('User login', { user: fullUserObject })

// ✅ TOUJOURS sanitiser
logger.info('User login', { userId: user.id, email: sanitize(user.email) })
```

---

## ⚡ Performance

### Frontend
```bash
# Optimisations obligatoires
- Lazy loading des composants
- Memoization (React.memo, useMemo)
- Code splitting par route
- Images optimisées (WebP)
- Bundle analysis régulière
```

### Backend
```bash
# Patterns critiques
- Prisma singleton pattern (obligatoire)
- Pagination sur listes
- Cache Redis pour données fréquentes
- Connection pooling optimisé
- Indexes DB appropriés
```

### Base de Données
```sql
-- TOUJOURS indexer les champs de recherche
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at);
```

---

## 🧪 Tests

### Tests Unitaires
```bash
# Client
cd client && npm test

# Server
cd server && npm test
```

### Tests E2E
```bash
npx playwright test           # Tous les tests
npx playwright test --ui      # Mode interface
```

### Structure Tests
```javascript
// tests/unit/feature.test.js
describe('Feature', () => {
  beforeEach(() => {
    // Setup
  })

  it('should handle normal case', () => {
    // Test
  })

  it('should handle edge case', () => {
    // Test
  })
})
```

---

## 🤖 Intégration IA

### Pattern Async Obligatoire
```javascript
// ❌ JAMAIS synchrone
const suggestions = getAISuggestions(category)

// ✅ TOUJOURS asynchrone
const { suggestions, isLoading, error } = useAISuggestions()
```

### Gestion d'Erreurs
```javascript
// ✅ Toujours fallback et validation
try {
  const result = await aiService.getSuggestions(params)
  return Array.isArray(result?.data) ? result.data : []
} catch (error) {
  logger.error('AI service error', { error: error.message })
  return [] // Fallback graceful
}
```

---

## 🚀 Déploiement

### Environnements
- **Local** : `npm start`
- **Staging** : Auto-deploy sur `develop`
- **Production** : Auto-deploy sur `main`

### Checklist Pre-Production
- [ ] Tests E2E passants
- [ ] Audit sécurité clean
- [ ] Variables d'env production configurées
- [ ] Monitoring actif
- [ ] Backup DB récent

### Variables Production
```bash
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="production-32-char-secret"
REDIS_URL="redis://..."
```

---

## 📚 Documentation

### Mise à Jour Obligatoire
- **README.md** : Si architecture change
- **API docs** : Si endpoints modifiés
- **CLAUDE.md** : Si workflow change

### Format Documentation
```markdown
## Section
Brief description.

### Subsection
- Bullet point
- Another point

```bash
code example
```
```

---

## 🛠️ Outils Développement

### Extensions VSCode Recommandées
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma"
  ]
}
```

### Scripts Utiles
```bash
npm run dev:reset         # Reset DB + restart
npm run test:watch        # Tests en mode watch
npm run lint:fix          # Fix linting automatique
npm run analyze:bundle    # Analyse taille bundle
```

---

## 🚨 Troubleshooting

### Problèmes Fréquents

#### "Port already in use"
```bash
lsof -i :3004              # Trouver le processus
kill -9 PID                # L'arrêter
```

#### "Database connection failed"
```bash
# Vérifier PostgreSQL actif
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

#### "Tests failing randomly"
```bash
# Nettoyer et réinstaller
npm run clean
npm run install:all
```

### Support Équipe
- **Slack** : #pluqla-dev
- **GitHub Issues** : Bugs et features
- **Documentation** : `/docs` folder

---

## 📊 Métriques Qualité

### Targets Production
- **Performance** : Lighthouse 90+
- **Sécurité** : 0 vulnérabilités critiques
- **Tests** : 85%+ couverture
- **Uptime** : 99.9%
- **Response Time** : <200ms API

### Monitoring
- **Logs** : Winston structured logging
- **Metrics** : Prometheus + Grafana
- **Alerts** : Slack notifications
- **Health** : `/health` endpoints

---

**Version** : 2.0.0 | **Dernière MAJ** : Décembre 2024 | **Équipe** : Pluqla Dev Team