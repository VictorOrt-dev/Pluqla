# 📚 Pluqla Documentation

> Documentation technique complète pour l'équipe de développement Pluqla

[![Version](https://img.shields.io/badge/version-2.0.0-red.svg?style=flat-square)](https://github.com/pluqla/app)
[![Documentation](https://img.shields.io/badge/docs-complete-green.svg?style=flat-square)](#)

## 🚀 Quick Start

**Nouveau développeur?** Commencez ici:
1. [**Guide Setup**](guides/SETUP.md) - Installation et configuration complètes
2. [**Guide Développeur**](../CLAUDE.md) - Workflow et standards qualité
3. [**API Reference**](api/API.md) - Documentation API REST complète
4. [**Guidelines Sécurité**](security/SECURITY.md) - Bonnes pratiques sécurité

## 📁 Structure de la Documentation

```
docs/
├── README.md                    # Ce fichier - index principal
├── CHANGELOG.md                 # Historique des versions
├── COMPLIANCE.md                # Conformité GDPR/PSD2
├── DEPLOYMENT.md                # Guide déploiement production
│
├── architecture/                # Architecture système
│   ├── DATABASE_INDEXES.md      # Optimisation DB (2-10x perf)
│   ├── DIRECTORY_STRUCTURE_GUIDE.md
│   ├── RATE_LIMITING_ARCHITECTURE.md
│   └── VALIDATION_ARCHITECTURE.md
│
├── api/                         # Documentation API
│   └── API.md                   # Référence REST complète
│
├── security/                    # Sécurité & conformité
│   └── SECURITY.md              # Guidelines de sécurité
│
├── features/                    # Documentation des features
│   ├── AUTH.md                  # Better Auth (session-based)
│   ├── AI_SETUP.md              # Intégration IA multi-provider
│   ├── AI_MIGRATION.md          # Migration système IA
│   ├── AI_CONTEXT.md            # Architecture IA
│   ├── FINANCE_*.md             # Features finance
│   ├── UX_AUTH.md               # UX authentification
│   └── VISUAL_IDENTITY.md       # Design system Pluqla
│
├── guides/                      # Guides développeur
│   ├── SETUP.md                 # Setup environnement dev
│   ├── DEVELOPER_GUIDE.md       # Onboarding développeur
│   ├── DEPLOYMENT_CHECKLIST.md # Checklist pré-déploiement
│   ├── PRODUCTION_CHECKLIST.md # Production readiness
│   └── COLLABORATION.md         # Guide collaboration équipe
│
├── development/                 # Outils & pratiques dev
│   ├── TESTS.md                 # Procédures de test
│   └── MONITORING.md            # Monitoring & observabilité
│
└── archive/                     # Documentation historique
    ├── README.md                # Index de l'archive
    ├── phases/                  # Rapports de phases (ETAPE/PHASE)
    ├── implementations/         # Rapports d'implémentation
    ├── features/                # Features obsolètes
    ├── audits/                  # Audits historiques
    └── optimization/            # Anciens rapports d'optimisation
```

## 📋 Documentation Essentielle

### 🛠️ Setup & Développement
- [**Guide Setup**](guides/SETUP.md) - Configuration environnement complet
- [**Guide Développeur**](guides/DEVELOPER_GUIDE.md) - Onboarding nouveaux devs
- [**Guide Tests**](development/TESTS.md) - Procédures de test (unit, E2E)
- [**Guide Déploiement**](DEPLOYMENT.md) - Déploiement production
- [**Checklist Déploiement**](guides/DEPLOYMENT_CHECKLIST.md) - Vérification pré-déploiement

### 🔐 Authentification & Sécurité
- [**Système Auth**](features/AUTH.md) - Better Auth integration (session-based)
- [**Guidelines Sécurité**](security/SECURITY.md) - Documentation sécurité complète
- [**Conformité**](COMPLIANCE.md) - GDPR/PSD2 requirements
- [**API Reference**](api/API.md) - Endpoints protégés et auth

### 🤖 Features IA
- [**Guide Setup IA**](features/AI_SETUP.md) - Intégration services IA
- [**Guide Migration IA**](features/AI_MIGRATION.md) - Migration nouveau système
- [**Contexte IA**](features/AI_CONTEXT.md) - Architecture système IA

### 💰 Features Finance
- [**Features Finance**](features/FINANCE_FEATURE_DOCUMENTATION.md) - Vue d'ensemble
- [**Référence Technique Finance**](features/FINANCE_TECHNICAL_REFERENCE.md) - Implémentation

### 🍽️ Features Alimentation (Phase 4A - Octobre 2024)
- [**Phase 4A Enhancements**](PHASE4A_POST_DEPLOYMENT_ENHANCEMENTS.md) - Documentation technique complète
- [**Phase 4A Delivery Report**](PHASE4A_DELIVERY_REPORT.md) - Rapport de livraison
  - ✅ Social Share avec tracking
  - ✅ Shopping List Generator
  - ✅ Meal Planner Calendar
  - ✅ Offline Mode (PWA)

### 🏗️ Architecture & Implémentation
- [**Structure Projet**](architecture/DIRECTORY_STRUCTURE_GUIDE.md) - Organisation monorepo
- [**Optimisation DB**](architecture/DATABASE_INDEXES.md) - Schema et index (2-10x perf)
- [**Rate Limiting**](architecture/RATE_LIMITING_ARCHITECTURE.md) - Architecture rate limiting
- [**Système Validation**](architecture/VALIDATION_ARCHITECTURE.md) - Framework validation

### 📊 Monitoring & Operations
- [**Guide Monitoring**](development/MONITORING.md) - Observabilité et monitoring
- [**Checklist Production**](guides/PRODUCTION_CHECKLIST.md) - Production readiness
- [**Guide Monitoring Prod**](PRODUCTION_MONITORING_GUIDE.md) - Monitoring production

### 🎨 Design & UX
- [**Identité Visuelle**](features/VISUAL_IDENTITY.md) - Design system et branding
- [**Guidelines UX Auth**](features/UX_AUTH.md) - Expérience utilisateur auth

## 💻 Workflow Développement

### Pour les nouveaux développeurs:

1. **Clone & Setup**: Suivre le [Guide Setup](guides/SETUP.md)
2. **Authentification**: Comprendre [Better Auth](features/AUTH.md)
3. **Tests**: Lancer tests avec [Guide Tests](development/TESTS.md)
4. **Développement**: Construire features avec [API Reference](api/API.md)
5. **Sécurité**: Suivre [Guidelines Sécurité](security/SECURITY.md)
6. **Déploiement**: Utiliser [Guide Déploiement](DEPLOYMENT.md)

## 🔄 Mises à Jour Récentes

### Phase 4A - Post-Deployment Enhancements (Octobre 2024) ✨
- ✅ **Social Share**: Partage social avec Web Share API + UTM tracking
- ✅ **Shopping List**: Génération listes de courses agrégées avec catégorisation
- ✅ **Meal Planner**: Planificateur hebdomadaire avec drag-and-drop natif
- ✅ **Offline Mode**: PWA complète avec Service Worker intelligent
- ✅ Score: **98/100** - Production Ready
- ✅ Tests: 95% coverage (85 tests automatisés)
- ✅ Lighthouse PWA: 85 → **100** (+15 pts)

### Réorganisation Documentation (Janvier 2025)
- ✅ Organisation docs en catégories logiques
- ✅ 38 fichiers archivés (phases, implémentations, features obsolètes)
- ✅ Réduction de 100+ fichiers → 27 fichiers actifs
- ✅ Création système d'archive organisé
- ✅ Documentation centralisée par thème

### Better Auth Integration (v2.0.0)
- ✅ Système auth session-based complet
- ✅ RBAC (User/Premium/Admin)
- ✅ Protection endpoints IA avec sanitisation PII
- ✅ Couche compatibilité JWT legacy
- ✅ Suite de tests complète
- ✅ Procédures déploiement production

## 📊 Métriques Qualité

- **Tests**: 85%+ couverture (Jest + Playwright)
- **Performance**: Lighthouse 90+ score
- **Sécurité**: OWASP compliant, audit automatique
- **Documentation**: 27 docs actives + 38 archivées

## 📞 Support

- **Problèmes Documentation**: Créer une issue dans le repo
- **Questions Développement**: Consulter [COLLABORATION.md](guides/COLLABORATION.md)
- **Préoccupations Sécurité**: Suivre [Guidelines Sécurité](security/SECURITY.md)

## 📝 Contribuer à la Documentation

Quand vous ajoutez de la documentation:
- **Guides** → `guides/`
- **Features** → `features/`
- **API specs** → `api/`
- **Architecture** → `architecture/`
- **Rapports terminés** → Ne pas créer (utiliser issues GitHub)
- Mettre à jour ce README avec les nouveaux liens

## 🗂️ Archive Historique

Les rapports de phases, implémentations terminées et features obsolètes sont archivés dans [`archive/`](archive/README.md):
- **38 fichiers archivés** (phases ETAPE/PHASE, implémentations, features legacy)
- **Organisation thématique** (phases, implementations, features, audits, optimization)
- **Consultation référence** pour historique et contexte technique

---

**Dernière mise à jour**: Janvier 2025 | **Version**: 2.1.0 | **Status**: Production Ready ✅
