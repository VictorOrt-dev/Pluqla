# 🎨 Pluqla Visual Identity Guide

> Guide d'identité visuelle pour la fintech premium Pluqla

## 🍒 **Palette Couleurs Signature**

### **Couleur Principale**
```css
/* Rouge cerise Pluqla - Signature unique */
--pluqla-red-primary: #F14545;
--pluqla-red-hover: #D73030;
--pluqla-red-light: #FF6B6B;
--pluqla-red-soft: #FFE5E5;
```

### **Couleurs Sémantiques**
| Couleur | Usage | Hex | Exemples |
|---------|-------|-----|----------|
| 🍒 **Rouge** | Actions principales, alerts | `#F14545` | Boutons CTA, métriques importantes |
| 🟢 **Vert** | Succès, économies, gains | `#10B981` | Revenus, économies réalisées |
| 🔵 **Bleu** | Information, neutralité | `#3B82F6` | Données générales, infos |
| 🟠 **Orange** | Gamification, rewards | `#F59E0B` | Badges, niveaux, récompenses |
| ⚫ **Gris** | Texte, neutralité | `#1A202C` | Texte principal, backgrounds |

## ✍️ **Typographie Premium**

### **Police Principale**
```css
font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
```

### **Hiérarchie Typographique**
```css
/* H1 - Titres principaux */
.pluqla-h1 {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

/* H2 - Sous-titres */
.pluqla-h2 {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
}

/* H3 - Sections */
.pluqla-h3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

/* Body - Texte standard */
.pluqla-body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

/* Caption - Labels, métadonnées */
.pluqla-caption {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## 📐 **Système d'Espacement**

### **Échelle d'Espacement**
```css
--pluqla-space-1: 4px;    /* Micro-espacements */
--pluqla-space-2: 8px;    /* Petits espacements */
--pluqla-space-3: 12px;   /* Espacements moyens */
--pluqla-space-4: 16px;   /* Espacements standards */
--pluqla-space-6: 24px;   /* Grands espacements */
--pluqla-space-8: 32px;   /* Très grands espacements */
```

### **Border Radius**
```css
--pluqla-radius-sm: 8px;    /* Petits éléments */
--pluqla-radius-md: 12px;   /* Boutons standards */
--pluqla-radius-lg: 16px;   /* Cards et inputs */
--pluqla-radius-xl: 24px;   /* Cards premium */
--pluqla-radius-2xl: 32px;  /* Grandes sections */
```

## 💳 **Composants Financiers**

### **Métriques Financières**
```css
/* Métrique principale - Montants importants */
.pluqla-metric-primary {
  font-size: 30px;
  font-weight: 700;
  color: var(--pluqla-red-primary);
}

/* Métrique secondaire - Données de support */
.pluqla-metric-secondary {
  font-size: 20px;
  font-weight: 600;
  color: var(--pluqla-gray-700);
}
```

### **Indicateurs de Tendance**
```css
/* Tendance positive */
.pluqla-trend-up::before {
  content: '🔺';
  color: var(--pluqla-green-primary);
}

/* Tendance négative */
.pluqla-trend-down::before {
  content: '🔻';
  color: var(--pluqla-red-primary);
}

/* Tendance stable */
.pluqla-trend-stable::before {
  content: '➡️';
  color: var(--pluqla-blue-primary);
}
```

## ✨ **Micro-interactions Premium**

### **Hover Effects 60fps**
```css
/* Lift effect premium */
.pluqla-hover-lift {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
}

.pluqla-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--pluqla-shadow-premium);
}
```

### **Animations d'Entrée**
```css
/* Fade in subtle */
@keyframes pluqla-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale in avec spring */
@keyframes pluqla-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## 🪟 **Glassmorphism Premium**

### **Effets de Verre**
```css
/* Backdrop premium */
.pluqla-card-glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Navigation glassmorphism */
.pluqla-nav {
  background: var(--pluqla-glass-backdrop);
  backdrop-filter: var(--pluqla-glass-blur);
  border-top: 1px solid var(--pluqla-glass-border);
}
```

## 🎯 **Application des Couleurs**

### **Dashboard Financier**
- **Dépenses** : Rouge `#F14545` (attention, contrôle)
- **Revenus** : Vert `#10B981` (positif, croissance)
- **Économies** : Vert `#10B981` (succès, objectifs)
- **Suggestions IA** : Bleu `#3B82F6` (intelligence, conseil)
- **Gamification** : Orange `#F59E0B` (récompenses, fun)

### **États Interactifs**
```css
/* État normal */
.pluqla-btn-primary {
  background: var(--pluqla-gradient-primary);
}

/* État hover */
.pluqla-btn-primary:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: var(--pluqla-shadow-glow);
}

/* État actif */
.pluqla-btn-primary:active {
  transform: translateY(0) scale(0.99);
}
```

## 📱 **Responsive Design**

### **Mobile-First**
```css
/* Base mobile (320px+) */
.pluqla-card {
  padding: 16px;
  border-radius: 16px;
}

/* Tablet (640px+) */
@media (min-width: 640px) {
  .pluqla-card {
    padding: 24px;
    border-radius: 24px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .pluqla-card {
    padding: 32px;
  }
}
```

### **Touch Targets**
```css
/* Minimum 44px pour mobile */
.pluqla-touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

## 🎨 **Exemples Visuels**

### **Bouton Principal**
```jsx
<button className="pluqla-btn pluqla-btn-primary pluqla-hover-lift">
  <span className="pluqla-body">Démarrer</span>
</button>
```

### **Card Financière**
```jsx
<div className="pluqla-financial-card">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="pluqla-h3 pluqla-text-primary">Dépenses</h3>
      <div className="flex items-center gap-2">
        <span className="pluqla-metric-primary">1,210€</span>
        <span className="pluqla-trend-down pluqla-text-primary text-sm">-5.2%</span>
      </div>
    </div>
    <div className="pluqla-avatar w-12 h-12">📊</div>
  </div>
</div>
```

### **Badge Informatif**
```jsx
<span className="pluqla-badge success">
  <span>✅</span>
  <span>Vérifié</span>
</span>
```

## 🔍 **Checklist Qualité Visuelle**

### **Reconnaissance Pluqla** ✅
- [ ] Rouge cerise #F14545 visible et dominant
- [ ] Typographie Inter/SF Pro systématique
- [ ] Animations subtiles (pas de bounce excessif)
- [ ] Border-radius 16-24px pour modernité
- [ ] Hover effects premium (+translateY, +scale)

### **Différenciation Marché** 🎯
- [ ] Plus chaleureux que Revolut (moins froid)
- [ ] Plus premium que Lydia (moins juvénile)
- [ ] Plus moderne que N26 (interface refreshed)
- [ ] Plus distinctif que banques traditionnelles

### **Cohérence Système** 📐
- [ ] Variables CSS utilisées (pas de hardcoded)
- [ ] Espacement selon échelle définie
- [ ] Couleurs sémantiques respectées
- [ ] Hiérarchie typographique claire

---

**🎨 Design System** : Version 2.0.0 | **Production Ready** ✅