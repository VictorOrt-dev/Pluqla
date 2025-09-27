# Client - Interface React Pluqla

> Application frontend React avec PWA et design system Pluqla

## 🎯 Rôle

Interface utilisateur moderne pour l'application d'économies Pluqla avec :
- Interface responsive (mobile-first)
- PWA pour installation native
- Multilingue (FR, EN, ES)
- Design system Pluqla (rouge cerise)

## ⚡ Démarrage Local

```bash
cd client
npm install
npm start                # http://localhost:3000
```

## 📋 Commandes

```bash
npm start              # Développement + hot reload
npm run build          # Build production
npm test               # Tests React + Jest
npm run lint           # ESLint + Prettier
npm run analyze        # Analyse bundle size
```

## 🏗️ Structure

```
src/
├── components/        # Composants par feature
│   ├── auth/         # Authentification
│   ├── common/       # Composants réutilisables
│   ├── features/     # Features métier
│   └── ui/           # Composants UI de base
├── contexts/         # State management React
├── hooks/            # Custom hooks
├── services/         # API calls
├── utils/            # Utilitaires
├── i18n/             # Traductions
└── styles/           # CSS + thème Pluqla
```

## 🎨 Design System

- **Couleurs** : Rouge cerise (#F14545), noir élégant
- **Typography** : System responsive avec Tailwind
- **Components** : Système Pluqla unifié
- **Animations** : CSS optimisées GPU

Voir [Guide Identité Visuelle](../docs/guides/VISUAL_IDENTITY_GUIDE.md)

## 🔧 Technologies

| Tech | Usage |
|------|-------|
| **React 18** | Framework frontend |
| **Tailwind CSS** | Styling + design system |
| **i18next** | Internationalisation |
| **Chart.js** | Graphiques financiers |
| **React Router** | Navigation SPA |

## 📱 PWA

- **Service Worker** : Cache offline
- **Manifest** : Installation native
- **Performance** : Lighthouse 90+ score

## 🧪 Tests

```bash
npm test                    # Tests unitaires
npm run test:coverage       # Avec couverture
```

**Couverture cible** : 85%+ (Jest + React Testing Library)

## 🚀 Build & Déploiement

```bash
npm run build              # Génère build/
npm run serve              # Serve build local
```

**Output** : Assets optimisés dans `build/` prêts pour CDN

---

**Port** : 3000 | **Build** : `/build` | **Tests** : Jest + RTL