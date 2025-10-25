# 🚀 Pluqla - Fintech Premium avec IA

> Application financière nouvelle génération pour optimiser vos économies intelligemment

[![Version](https://img.shields.io/badge/version-2.0.0-red.svg?style=flat-square)](https://github.com/pluqla/app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Production](https://img.shields.io/badge/production-ready-green.svg?style=flat-square)](#)

## ⚡ Démarrage Ultra-Rapide

```bash
git clone https://github.com/pluqla/app.git && cd pluqla
npm run install:all

# 🔐 CONFIGURATION SÉCURITÉ (OBLIGATOIRE)
cp server/.env.example server/.env
# Générez vos clés de chiffrement
openssl rand -hex 32  # FINANCIAL_ENCRYPTION_KEY
openssl rand -hex 32  # BANK_ENCRYPTION_KEY
# Ajoutez-les à server/.env

npm start
```

**🌐 URLs** : [Client](http://localhost:3000) • [API](http://localhost:3004)

⚠️ **IMPORTANT** : Voir [SECURITY.md](./SECURITY.md) pour la configuration complète des clés de chiffrement

## 🏗️ Architecture Monorepo

```
pluqla/
├── client/     # React 18 + Tailwind CSS + PWA
├── server/     # Node.js + Express + Prisma + PostgreSQL
├── infra/      # Docker + CI/CD + Monitoring
└── docs/       # Documentation technique complète
```

## 🛠️ Stack Technique Premium

- **Frontend** : React 18, Tailwind CSS, PWA, Framer Motion
- **Backend** : Node.js 18+, Express, Prisma ORM, PostgreSQL 15
- **IA** : OpenAI GPT-4, Claude 3, Gemini Pro
- **Infra** : Docker, GitHub Actions, Monitoring temps réel

## 🎨 Design System Signature

- **Couleur principale** : Rouge cerise #F14545
- **Thème** : Glassmorphism + Micro-interactions 60fps
- **Typographie** : Inter/SF Pro Display
- **Animations** : Subtiles, orientées feedback utilisateur

## 📱 Fonctionnalités Principales

### 💰 **Dashboard Financier IA**
- Analyse automatique des dépenses
- Suggestions d'économies personnalisées
- Prédictions de budget intelligent
- Alertes proactives d'optimisation

### 👤 **Profil Gamifié**
- Système de niveaux et récompenses
- Défis d'économies quotidiens
- Streak tracking motivationnel
- Badges de progression

### 🔐 **Sécurité Premium**
- Chiffrement SSL 256-bit
- Conformité GDPR + PCI DSS
- Authentification JWT sécurisée
- Audit sécurité automatique

## 🚀 Commands Essentielles

```bash
# Développement
npm start                # Fullstack (client + server)
npm run dev:client       # Frontend seul
npm run dev:server       # Backend seul

# Production
npm run build           # Build optimisé
npm run docker:up       # Environnement Docker
npm test               # Suite de tests complète

# Base de données
npm run db:migrate     # Migrations Prisma
npm run db:seed        # Données de test
```

## 📊 Qualité & Performance

- **Tests** : 85%+ couverture (Jest + Playwright)
- **Performance** : Lighthouse 90+ score
- **Sécurité** : OWASP compliant, audit automatique
- **Accessibilité** : WCAG 2.1 AA

## 📚 Documentation

| Ressource | Description |
|-----------|-------------|
| [**📖 Documentation Hub**](docs/README.md) | Index complet de toute la documentation |
| [**🔐 SECURITY.md**](docs/security/SECURITY.md) | Guide sécurité GDPR/PSD2 (OBLIGATOIRE) |
| [**Guide Développeur**](CLAUDE.md) | Workflow complet, standards qualité |
| [**API Reference**](docs/api/API.md) | Documentation REST complète |
| [**Architecture**](docs/architecture/) | Design système, DB, rate limiting, validation |
| [**Déploiement**](docs/DEPLOYMENT.md) | Production ready guide |

## 🎯 Roadmap 2024

- [ ] **Q1** : Intégration bancaire Open Banking
- [ ] **Q2** : Assistant IA conversationnel
- [ ] **Q3** : Application mobile native
- [ ] **Q4** : Marketplace partenaires

## 🤝 Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines de contribution.

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**🚀 Pluqla Team** • Version 2.0.0 • **Production Ready** ✅

[Documentation Hub](docs/README.md) • [Client](client/README.md) • [Server](server/README.md) • [Infrastructure](infra/README.md)

</div>