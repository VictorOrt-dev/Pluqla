# 🚀 Configuration & Installation - Pluqla

Guide complet pour installer et lancer l'application Pluqla en local.

---

## 📋 Prérequis

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **Git** (dernière version)

### Vérifier les versions
```bash
node --version    # Doit afficher v18+
npm --version     # Doit afficher v9+
git --version     # Dernière version stable
```

---

## 🏗️ Installation Rapide

### 1️⃣ Cloner le projet
```bash
git clone https://github.com/votre-username/pluqla.git
cd pluqla
```

### 2️⃣ Installer les dépendances
```bash
npm run install:all
```
Cette commande installe automatiquement les dépendances pour :
- Root du projet
- Client React (port 3000)
- Server Node.js (port 3004)

### 3️⃣ Configuration des variables d'environnement

#### Client (.env)
```bash
cp .env.example .env
```
Modifier `.env` avec vos valeurs :
```env
REACT_APP_API_URL=http://localhost:3004/api
REACT_APP_ENVIRONMENT=development
# ... autres variables selon vos besoins
```

#### Server (.env)
```bash
cp server/.env.example server/.env
```
Modifier `server/.env` avec vos valeurs :
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="votre-secret-super-securise-32-caracteres-minimum"
# ... autres variables selon vos besoins
```

### 4️⃣ Initialiser la base de données
```bash
npm run db:setup
```
Cette commande :
- Génère le client Prisma
- Applique les migrations
- Seed la DB (optionnel)

### 5️⃣ Lancer l'application
```bash
npm start
```
Cette commande démarre automatiquement :
- **Client** : http://localhost:3000
- **API** : http://localhost:3004

---

## 🛠️ Commandes de Développement

### Scripts Principaux
```bash
# Démarrer l'application complète
npm start

# Démarrer seulement le client
npm run start:client

# Démarrer seulement le serveur
npm run start:server

# Build production du client
npm run build

# Tests (client + serveur)
npm test

# Linting (client + serveur)
npm run lint
```

### Base de Données
```bash
# Générer le client Prisma
cd server && npm run db:generate

# Appliquer les migrations
cd server && npm run db:migrate

# Reset complet de la DB
cd server && npm run db:reset

# Interface graphique de la DB
cd server && npm run db:studio
```

### Tests
```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:client -- --coverage
cd server && npm run test:coverage

# Tests E2E
cd client && npm run test:e2e
```

---

## 🔧 Configuration Détaillée

### Variables d'Environnement Critiques

#### JWT Secrets (Server)
Générer des secrets sécurisés :
```bash
# Générer un secret JWT
openssl rand -base64 32

# Ou avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Base de Données
```env
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
DATABASE_URL="postgresql://username:password@host:5432/dbname"
```

### Ports Utilisés
- **3000** : Client React
- **3004** : API Node.js
- **5555** : Prisma Studio (optionnel)

---

## 🚨 Résolution de Problèmes

### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
lsof -i :3004

# Arrêter le processus
kill -9 <PID>
```

### Problèmes de dépendances
```bash
# Nettoyer et réinstaller
npm run clean
npm run install:all
```

### Problèmes de base de données
```bash
# Reset complet
cd server
npm run db:reset
npm run db:migrate
npm run db:seed
```

### Problèmes de cache
```bash
# Nettoyer les caches
npm cache clean --force
cd client && rm -rf node_modules/.cache
cd server && rm -rf node_modules/.cache
```

---

## 🔄 Workflow Git

### Configuration initiale
```bash
git clone <repo>
cd pluqla
git checkout -b develop
```

### Nouvelle fonctionnalité
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-fonctionnalite

# Développement...
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin feature/nom-fonctionnalite

# Créer Pull Request vers develop
```

---

## 📦 Structure du Projet

```
pluqla/
├── client/              # React App (port 3000)
│   ├── src/
│   ├── public/
│   └── package.json
├── server/              # Node.js API (port 3004)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── docs/                # Documentation
├── infra/               # Docker, CI/CD
├── shared/              # Utils partagés
├── .env.example         # Variables client
├── .gitignore          # Git ignore rules
└── package.json         # Scripts racine
```

---

## 🎯 Prêt pour la Collaboration

Une fois cette configuration terminée, votre ami développeur pourra :

1. **Cloner** le projet
2. **Installer** avec `npm run install:all`
3. **Configurer** ses `.env`
4. **Lancer** avec `npm start`

✅ **Aucune clé API réelle n'est exposée**
✅ **Base de données locale automatique**
✅ **Hot reload activé**
✅ **Tests configurés**

---

**Besoin d'aide ?** Consultez `/docs` ou créez une issue sur GitHub.