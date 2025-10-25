# Server - API Backend Pluqla

> API REST Node.js sécurisée avec authentification JWT et intégration IA

## 🎯 Rôle

Backend API pour application financière avec :
- Authentification JWT sécurisée
- Base de données PostgreSQL/Prisma
- Intégration IA multi-provider
- Sécurité OWASP compliant

## ⚡ Démarrage Local

```bash
cd server
npm install
cp .env.example .env      # Configurer variables
npm run db:setup          # Setup base + migrations
npm run dev               # http://localhost:3004
```

## 📋 Commandes

```bash
npm run dev            # Développement + nodemon
npm start              # Production
npm test               # Tests Jest + Supertest
npm run db:migrate     # Migrations Prisma
npm run db:generate    # Génère client Prisma
npm run db:seed        # Seed données test
```

## 🏗️ Architecture

```
src/
├── controllers/       # Endpoints API
├── services/          # Logique métier
├── routes/            # Définition routes
├── middleware/        # Auth, validation, rate limiting
├── lib/               # Prisma singleton
└── utils/             # Helpers, logging sécurisé
```

## 🔐 Sécurité

| Feature | Status |
|---------|--------|
| **JWT Auth** | ✅ Multi-secrets + rotation |
| **Rate Limiting** | ✅ Par endpoint + IP |
| **Input Validation** | ✅ Sanitisation complète |
| **Logging Sécurisé** | ✅ Aucune fuite données |
| **Audit OWASP** | ✅ Top 10 compliant |

## 🗄️ Base de Données

```bash
# Configuration rapide
DATABASE_URL="postgresql://user:pass@host:5432/db"
npm run db:setup
```

**Features** :
- Prisma ORM avec singleton pattern
- Migrations automatiques
- Pool de connexions optimisé

## 🤖 Intégration IA

Support multi-provider avec fallback automatique :
- **OpenAI** : Suggestions principales
- **Claude** : Analyse financière
- **Gemini** : Backup provider

## 📊 Monitoring

- **Logs structurés** : Winston + formats JSON
- **Health checks** : `/health` endpoint
- **Métriques** : Performance et erreurs

## 🧪 Tests

```bash
npm test                   # Tests unitaires + intégration
npm run test:coverage      # Avec couverture
npm run test:security      # Tests sécurité
```

**Couverture** : 90%+ (Jest + Supertest + tests sécurité)

## 🚀 Production

```bash
NODE_ENV=production
JWT_SECRET="your-32-char-secret"
DATABASE_URL="postgresql://..."
npm start
```

Voir [Checklist Déploiement](../docs/guides/DEPLOYMENT_CHECKLIST.md)

## 📡 API

- **Base URL** : `http://localhost:3004/api`
- **Documentation** : [API Reference](../docs/api/API.md)
- **Auth** : Better Auth (session-based) + JWT legacy

### Endpoints Principaux

| Route | Description |
|-------|-------------|
| `POST /api/auth/sign-in/email` | Authentification Better Auth |
| `POST /api/auth/sign-up/email` | Inscription utilisateur |
| `GET /api/users/profile` | Profil utilisateur |
| `GET /api/transactions` | Transactions financières |
| `POST /api/ai/suggestions` | Suggestions IA |

Voir [API Reference complète](../docs/api/API.md)

## 📚 Documentation Associée

- [Architecture Backend](../docs/architecture/DIRECTORY_STRUCTURE_GUIDE.md)
- [Better Auth Integration](../docs/features/AUTH.md)
- [Security Guidelines](../docs/security/SECURITY.md)
- [Database Optimization](../docs/architecture/DATABASE_INDEXES.md)
- [Rate Limiting](../docs/architecture/RATE_LIMITING_ARCHITECTURE.md)
- [Tests Guide](../docs/development/TESTS.md)

---

**Port** : 3004 | **DB** : PostgreSQL | **Auth** : Better Auth + JWT | **Tests** : 90%+