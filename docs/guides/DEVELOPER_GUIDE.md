# 🚀 Pluqla Developer Guide

> Guide de développement pour la fintech premium Pluqla

## 🎯 **Vue d'ensemble**

Pluqla est une application fintech premium basée sur React + Node.js avec une identité visuelle distinctive et des micro-interactions haut de gamme.

## 🏗️ **Architecture Projet**

```
pluqla/
├── client/                    # Frontend React 18
│   ├── src/
│   │   ├── styles/
│   │   │   ├── unified-theme.css    # 🎨 Design system unifié
│   │   │   └── legacy/              # Anciens styles archivés
│   │   ├── components/              # Composants React
│   │   ├── services/                # Services API
│   │   └── utils/                   # Utilitaires
├── server/                    # Backend Node.js
├── docs/                      # Documentation
└── infra/                     # Infrastructure
```

## 🎨 **Design System Pluqla**

### **Couleurs Signature**
```css
/* Rouge cerise - Couleur principale */
--pluqla-red-primary: #F14545;

/* Sémantique des couleurs */
--pluqla-green-primary: #10B981;  /* Succès, économies */
--pluqla-blue-primary: #3B82F6;   /* Information, neutralité */
--pluqla-orange-primary: #F59E0B;  /* Gamification */
```

### **Typographie Premium**
```css
/* Hiérarchie claire */
.pluqla-h1    /* 36px / bold / Titres principaux */
.pluqla-h2    /* 24px / semibold / Sous-titres */
.pluqla-h3    /* 20px / semibold / Sections */
.pluqla-body  /* 16px / regular / Texte standard */
.pluqla-caption /* 14px / medium / Labels, métadonnées */
```

### **Composants Clés**
```jsx
// Boutons premium avec animations 60fps
<button className="pluqla-btn pluqla-btn-primary">
  Action principale
</button>

// Cartes financières avec hover effects
<div className="pluqla-financial-card">
  <h3 className="pluqla-h3 pluqla-text-primary">Dépenses</h3>
  <span className="pluqla-metric-primary">1,210€</span>
</div>

// Badges informatifs
<span className="pluqla-badge success">✅ Confirmé</span>
```

## 💰 **Dashboard Financier**

### **Hiérarchie Visuelle**
1. **Métriques principales** : `pluqla-metric-primary` (36px, rouge Pluqla)
2. **Valeurs secondaires** : `pluqla-metric-secondary` (20px, gris foncé)
3. **Labels** : `pluqla-caption` (14px, uppercase)

### **Indicateurs de Tendance**
```jsx
// Automatic trend indicators
<span className="pluqla-trend-up">+2.8%</span>    // 🔺 +2.8%
<span className="pluqla-trend-down">-5.2%</span>  // 🔻 -5.2%
<span className="pluqla-trend-stable">0%</span>   // ➡️ 0%
```

### **Formatage Monétaire**
```javascript
// Standard français avec Intl.NumberFormat
new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(amount);
```

## ✨ **Micro-interactions Premium**

### **Animations 60fps Optimisées**
```css
/* Hover lift premium - GPU optimized */
.pluqla-hover-lift {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
}

.pluqla-hover-lift:hover {
  transform: translateY(-2px);
}
```

### **Animations d'Entrée**
```jsx
// Apparition fluide
<div className="pluqla-fade-in">Content</div>

// Scale avec spring
<div className="pluqla-scale-in">Content</div>

// Slide from bottom
<div className="pluqla-slide-up">Content</div>
```

## 📱 **Responsive & Mobile-First**

### **Zones Tactiles**
```css
/* Minimum 44px pour toutes les interactions */
.pluqla-btn {
  min-height: var(--pluqla-touch-min); /* 44px */
}
```

### **Breakpoints**
```css
/* Mobile first approach */
@media (max-width: 640px) {
  /* Ajustements mobile */
}
```

## 🔐 **Sécurité & Performance**

### **Bonnes Pratiques**
- ❌ Jamais de `console.log` en production
- ✅ Variables d'environnement pour secrets
- ✅ Validation côté client ET serveur
- ✅ HTTPS obligatoire
- ✅ Headers de sécurité

### **Performance**
```javascript
// Lazy loading des composants
const FinancialDashboard = React.lazy(() =>
  import('./components/features/FinancialDashboard')
);

// Memoization pour éviter re-renders
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});
```

## 🧪 **Tests & Qualité**

### **Tests Unitaires**
```bash
npm test                    # Jest + React Testing Library
npm run test:coverage      # Couverture minimum 85%
```

### **Tests E2E**
```bash
npx playwright test        # Tests end-to-end
npx playwright test --ui   # Mode interface
```

### **Linting & Formatage**
```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

## 🚀 **Déploiement**

### **Build Production**
```bash
npm run build             # Build optimisé
npm run analyze           # Analyse bundle
```

### **Variables d'Environnement**
```bash
# Développement
REACT_APP_API_URL=http://localhost:3004
REACT_APP_ENV=development

# Production
REACT_APP_API_URL=https://api.pluqla.com
REACT_APP_ENV=production
```

## 📋 **Checklist Contribution**

### **Avant Commit**
- [ ] Tests unitaires passants
- [ ] Aucun `console.log`
- [ ] Design system Pluqla respecté
- [ ] Performance non dégradée
- [ ] Responsive design vérifié

### **Code Review**
- [ ] Lisibilité et documentation
- [ ] Pas de hardcoded values
- [ ] Gestion d'erreurs appropriée
- [ ] Accessibilité (WCAG 2.1 AA)

## 🎨 **Visual Identity Checklist**

### **Reconnaissance Immédiate**
- [ ] Rouge cerise #F14545 dominant
- [ ] Typographie Inter/SF Pro
- [ ] Animations subtiles (pas de bounce excessif)
- [ ] Glassmorphism pour overlays
- [ ] Cards avec border-radius 24px

### **Différenciation Concurrents**
- [ ] Plus chaleureux que Revolut/N26
- [ ] Plus premium que Lydia
- [ ] Plus moderne que banques traditionnelles

## 🔧 **Outils Recommandés**

### **VS Code Extensions**
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- Auto Rename Tag

### **Chrome Extensions Dev**
- React Developer Tools
- Redux DevTools
- Lighthouse
- Web Vitals

## 📞 **Support & Ressources**

- **Documentation API** : `/docs/api/`
- **Design System** : `/client/src/styles/unified-theme.css`
- **Tests** : `/client/src/__tests__/`
- **Issues** : GitHub Issues
- **Discussions** : GitHub Discussions

---

**Version** : 2.0.0 | **Maintenu par** : Pluqla Team | **Dernière MAJ** : Décembre 2024