# Phase 2A Component Library Guide
## Pluqla Premium Components - Documentation Développeur

**Date**: Décembre 2024
**Version**: 2.0.0
**Status**: ✅ Complete

---

## 📦 Vue d'Ensemble

Phase 2A a introduit une bibliothèque complète de composants premium avec l'identité visuelle Pluqla:

- **PluqlaButton** - Système de boutons avec shimmer & glow
- **PluqlaCard** - Cards avec glassmorphism
- **PluqlaLoader** - États de chargement brandés
- **PluqlaEmptyState** - États vides avec personnalité
- **PluqlaToast** - Notifications toast animées
- **PluqlaModal** - Modals avec backdrop blur

---

## 🚀 Installation & Usage

### Import Centralisé

```javascript
import {
  PluqlaButton,
  PluqlaCard,
  PluqlaLoader,
  PluqlaEmptyState,
  useToast,
  PluqlaModal
} from '@/components/common';
```

### Setup Toast Provider

Wrapper l'app avec ToastProvider pour utiliser les toasts globalement:

```javascript
// App.js
import { ToastProvider } from '@/components/common';

function App() {
  return (
    <ToastProvider position="top-right" maxToasts={5}>
      <YourApp />
    </ToastProvider>
  );
}
```

---

## 🎨 Composants

### 1. PluqlaButton

**Features**:
- Shimmer effect sur hover
- Framer Motion spring animations
- Glow effect optionnel
- 5 variants (primary, secondary, ghost, success, danger)
- Support icônes & loading states

**Usage Basique**:

```javascript
import { PluqlaButton } from '@/components/common';

<PluqlaButton
  variant="primary"
  shimmer={true}
  glow={true}
  onClick={handleClick}
>
  Enregistrer
</PluqlaButton>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'ghost' \| 'success' \| 'danger'` | `'primary'` | Style du bouton |
| size | `'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Taille du bouton |
| shimmer | `boolean` | `true` | Effet shimmer au hover |
| glow | `boolean` | `false` | Effet glow premium |
| fullWidth | `boolean` | `false` | Pleine largeur |
| loading | `boolean` | `false` | État chargement |
| disabled | `boolean` | `false` | État désactivé |
| icon | `ReactNode` | - | Icône Lucide React |
| iconPosition | `'left' \| 'right'` | `'left'` | Position icône |

**Exemples**:

```javascript
// Primary avec shimmer (par défaut)
<PluqlaButton variant="primary">
  Confirmer
</PluqlaButton>

// Secondary avec icône
<PluqlaButton variant="secondary" icon={<Plus />}>
  Ajouter
</PluqlaButton>

// Ghost avec glow
<PluqlaButton variant="ghost" glow>
  En savoir plus
</PluqlaButton>

// Loading state
<PluqlaButton loading={isSubmitting}>
  Enregistrement...
</PluqlaButton>

// Full width
<PluqlaButton fullWidth variant="primary">
  Continuer
</PluqlaButton>
```

**Pre-configured Variants**:

```javascript
import { PrimaryButton, SecondaryButton, GhostButton } from '@/components/common';

<PrimaryButton onClick={handleSave}>Enregistrer</PrimaryButton>
<SecondaryButton onClick={handleCancel}>Annuler</SecondaryButton>
<GhostButton onClick={handleSkip}>Passer</GhostButton>
```

---

### 2. PluqlaCard

**Features**:
- Glassmorphism avec backdrop blur
- Hover lift animations
- Red highlight border optionnel
- Glow effect premium
- 3 variants pré-configurés (Stat, Info, Feature)

**Usage Basique**:

```javascript
import { PluqlaCard } from '@/components/common';

<PluqlaCard
  glass={true}
  hover={true}
  highlight={false}
  glow={false}
  onClick={handleClick}
>
  <h3>Titre</h3>
  <p>Contenu de la card</p>
</PluqlaCard>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| glass | `boolean` | `false` | Effet glassmorphism |
| glow | `boolean` | `false` | Effet glow au hover |
| hover | `boolean` | `true` | Animations hover |
| highlight | `boolean` | `false` | Bordure rouge accent |
| elevated | `boolean` | `false` | Shadow élevée |
| padding | `'none' \| 'sm' \| 'normal' \| 'lg'` | `'normal'` | Espacement interne |
| darkMode | `boolean` | `false` | Mode sombre |

**Pre-configured Variants**:

**PluqlaStatCard** - Pour statistiques:

```javascript
import { PluqlaStatCard } from '@/components/common';
import { TrendingUp } from 'lucide-react';

<PluqlaStatCard
  icon={TrendingUp}
  label="Économies ce mois"
  value="€245"
  change="+12%"
  trend="up"
  color="green"
/>
```

**PluqlaInfoCard** - Avec icône et description:

```javascript
import { PluqlaInfoCard } from '@/components/common';
import { Info } from 'lucide-react';

<PluqlaInfoCard
  icon={Info}
  title="Nouvelle fonctionnalité"
  description="Découvrez notre système de suggestions IA"
  action={{
    label: "En savoir plus",
    onClick: () => navigate('/features')
  }}
/>
```

**PluqlaFeatureCard** - Pour features avec badge NEW:

```javascript
import { PluqlaFeatureCard } from '@/components/common';
import { Sparkles } from 'lucide-react';

<PluqlaFeatureCard
  icon={Sparkles}
  title="Suggestions IA"
  description="Recevez des conseils personnalisés pour économiser"
  isNew={true}
  onClick={() => navigate('/ai-suggestions')}
/>
```

---

### 3. PluqlaLoader

**Features**:
- 4 variants (spinner, pulse, dots, progress)
- Animations 60fps optimisées
- Fullscreen overlay optionnel
- Branded avec gradient rouge

**Usage Basique**:

```javascript
import { PluqlaLoader } from '@/components/common';

<PluqlaLoader
  variant="spinner"
  size="md"
  text="Chargement..."
  fullscreen={false}
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'spinner' \| 'pulse' \| 'dots' \| 'progress'` | `'spinner'` | Type de loader |
| size | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Taille |
| text | `string` | `''` | Texte descriptif |
| fullscreen | `boolean` | `false` | Overlay plein écran |
| progress | `number` | - | Valeur pour progress bar (0-100) |

**Variants Individuels**:

```javascript
import { PluqlaSpinner, PluqlaDots, PluqlaPulse, PluqlaProgress } from '@/components/common';

// Spinner simple
<PluqlaSpinner size="md" color="red" />

// Dots animés
<PluqlaDots size="md" color="red" />

// Pulse avec logo
<PluqlaPulse size="lg" />

// Progress bar
<PluqlaProgress value={75} max={100} showPercentage={true} />
```

**Exemples**:

```javascript
// Fullscreen loader
<PluqlaLoader
  variant="pulse"
  size="xl"
  text="Chargement de vos données..."
  fullscreen={true}
/>

// Inline spinner
<PluqlaLoader variant="spinner" size="sm" />

// Progress bar pour upload
<PluqlaLoader
  variant="progress"
  progress={uploadProgress}
  text="Téléchargement..."
/>
```

---

### 4. PluqlaEmptyState

**Features**:
- Animations engageantes
- Mascotte Pluqi intégrée
- Illustrations emoji
- Support icônes Lucide
- CTA avec shimmer

**Usage Basique**:

```javascript
import { PluqlaEmptyState } from '@/components/common';

<PluqlaEmptyState
  illustration="pluqi"
  mood="encourage"
  title="Aucune transaction"
  description="Commencez à suivre vos dépenses dès aujourd'hui"
  action={{
    text: "Ajouter une transaction",
    onClick: handleAdd
  }}
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icon | `LucideIcon` | - | Icône Lucide React |
| illustration | `'pluqi' \| 'piggy' \| 'rocket' \| 'search' \| 'empty'` | `'pluqi'` | Type illustration |
| mood | `'neutral' \| 'encourage' \| 'celebrate' \| 'thinking'` | `'neutral'` | Mood Pluqi |
| title | `string` | - | Titre |
| description | `string` | - | Description |
| action | `{ text, onClick, variant?, icon? }` | - | Bouton primaire |
| secondaryAction | `{ text, onClick, icon? }` | - | Bouton secondaire |

**Pre-configured Variants**:

```javascript
import {
  NoTransactionsEmptyState,
  NoRecipesEmptyState,
  NoGoalsEmptyState,
  SearchEmptyState
} from '@/components/common';

// No transactions
<NoTransactionsEmptyState
  onAddTransaction={() => setShowAddModal(true)}
/>

// No recipes
<NoRecipesEmptyState
  onExplore={() => navigate('/recipes')}
/>

// Search no results
<SearchEmptyState
  query={searchQuery}
  onReset={() => setSearchQuery('')}
/>
```

**Avec icône custom**:

```javascript
import { ShoppingBag } from 'lucide-react';

<PluqlaEmptyState
  icon={ShoppingBag}
  title="Panier vide"
  description="Ajoutez des produits pour commencer"
  action={{
    text: "Explorer les produits",
    onClick: () => navigate('/shop')
  }}
/>
```

---

### 5. PluqlaToast

**Features**:
- 4 types (success, error, info, warning)
- Auto-dismiss avec progress bar
- Stack management
- Actions optionnelles
- Context API pour usage global

**Setup**:

```javascript
// App.js
import { ToastProvider } from '@/components/common';

<ToastProvider position="top-right" maxToasts={5}>
  <YourApp />
</ToastProvider>
```

**Usage**:

```javascript
import { useToast } from '@/components/common';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Enregistré avec succès!');
  };

  const handleError = () => {
    toast.error('Erreur lors de l\'enregistrement', {
      duration: 7000,
      action: {
        label: 'Réessayer',
        onClick: handleRetry
      }
    });
  };

  return (
    <PluqlaButton onClick={handleSuccess}>
      Enregistrer
    </PluqlaButton>
  );
}
```

**API Methods**:

```javascript
const toast = useToast();

// Success
toast.success(message, options);

// Error
toast.error(message, options);

// Info
toast.info(message, options);

// Warning
toast.warning(message, options);

// Dismiss
toast.dismiss(toastId);
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| duration | `number` | `5000` | Durée en ms (0 = permanent) |
| action | `{ label, onClick }` | - | Action button |

**Exemples**:

```javascript
// Simple success
toast.success('Transaction ajoutée');

// Error avec action
toast.error('Échec de la connexion', {
  duration: 0, // Ne se ferme pas automatiquement
  action: {
    label: 'Réessayer',
    onClick: reconnect
  }
});

// Info temporaire
toast.info('Mise à jour disponible', {
  duration: 3000
});

// Warning
toast.warning('Votre session expire bientôt');
```

---

### 6. PluqlaModal

**Features**:
- Backdrop glassmorphism avec blur
- Animations slide-up fluides
- Close on Escape / Backdrop click
- Focus trap
- Sizes flexibles
- Pre-configured variants (Confirm, Alert)
- BottomSheet pour mobile

**Usage Basique**:

```javascript
import { PluqlaModal } from '@/components/common';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <PluqlaButton onClick={() => setIsOpen(true)}>
        Ouvrir
      </PluqlaButton>

      <PluqlaModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Titre du modal"
        description="Description optionnelle"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <PluqlaButton variant="ghost" onClick={() => setIsOpen(false)}>
              Annuler
            </PluqlaButton>
            <PluqlaButton variant="primary" onClick={handleSave}>
              Enregistrer
            </PluqlaButton>
          </div>
        }
      >
        {/* Contenu du modal */}
        <p>Contenu ici...</p>
      </PluqlaModal>
    </>
  );
}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | `boolean` | `false` | État ouvert/fermé |
| onClose | `function` | - | Callback fermeture |
| title | `string` | - | Titre |
| description | `string` | - | Description |
| size | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| 'full'` | `'md'` | Taille |
| footer | `ReactNode` | - | Footer avec actions |
| closeOnBackdropClick | `boolean` | `true` | Ferme au clic backdrop |
| closeOnEscape | `boolean` | `true` | Ferme avec Escape |
| showCloseButton | `boolean` | `true` | Bouton X |

**ConfirmModal** - Pre-configured:

```javascript
import { ConfirmModal } from '@/components/common';

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Supprimer la transaction ?"
  description="Cette action est irréversible"
  confirmText="Supprimer"
  cancelText="Annuler"
  variant="danger"
  isLoading={isDeleting}
/>
```

**AlertModal** - Pre-configured:

```javascript
import { AlertModal } from '@/components/common';

<AlertModal
  isOpen={showAlert}
  onClose={() => setShowAlert(false)}
  title="Succès"
  description="Vos modifications ont été enregistrées"
  buttonText="OK"
/>
```

**BottomSheet** - Mobile-optimized:

```javascript
import { BottomSheet } from '@/components/common';

<BottomSheet
  isOpen={showSheet}
  onClose={() => setShowSheet(false)}
  title="Options"
  height="auto"
>
  {/* Contenu mobile-friendly */}
  <div className="space-y-4">
    <button>Option 1</button>
    <button>Option 2</button>
  </div>
</BottomSheet>
```

---

## 🎨 Design System Integration

Tous les composants utilisent les tokens du Pluqla Design System (`unified-theme.css`):

### Couleurs
- `--pluqla-red-primary`: #F14545
- `--pluqla-gradient-primary`: linear-gradient(135deg, #F14545 0%, #D73030 100%)
- `--pluqla-green-primary`: #10B981
- `--pluqla-blue-primary`: #3B82F6

### Shadows
- `--pluqla-shadow-premium`: 0 8px 25px -5px rgba(241, 69, 69, 0.3)
- `--pluqla-shadow-glow`: 0 0 20px rgba(241, 69, 69, 0.4)

### Transitions
- `--pluqla-transition-normal`: 0.2s cubic-bezier(0.4, 0, 0.2, 1)
- `--pluqla-transition-spring`: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)

---

## 📱 Responsive Design

Tous les composants sont mobile-first et responsive:

- **Touch targets minimum**: 44px (WCAG compliance)
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **BottomSheet**: Optimisé pour mobile avec drag-to-close

---

## ♿ Accessibilité

- **ARIA labels**: Tous les composants interactifs
- **Keyboard navigation**: Focus trap dans modals, Escape pour fermer
- **Screen reader support**: Labels descriptifs
- **Contrast**: WCAG 2.1 AA compliant
- **Reduced motion**: Respecte prefers-reduced-motion

---

## 🚀 Performance

- **60fps animations**: GPU-optimized avec will-change
- **Framer Motion**: Spring animations fluides
- **Lazy loading**: AnimatePresence pour mount/unmount
- **Code splitting**: Import individuel des composants

---

## 📝 Migration Guide

### Depuis anciens composants:

**Boutons**:
```javascript
// Avant
<button className="pluqla-btn-primary">Enregistrer</button>

// Après
<PluqlaButton variant="primary">Enregistrer</PluqlaButton>
```

**Cards**:
```javascript
// Avant
<div className="pluqla-card pluqla-card-glass">...</div>

// Après
<PluqlaCard glass={true}>...</PluqlaCard>
```

**Loaders**:
```javascript
// Avant
<LoadingSpinner size="md" />

// Après
<PluqlaLoader variant="spinner" size="md" />
```

---

## 🔧 Troubleshooting

### Toasts ne s'affichent pas
**Solution**: Vérifier que `<ToastProvider>` enveloppe l'app:
```javascript
<ToastProvider>
  <App />
</ToastProvider>
```

### Animations saccadées
**Solution**: Vérifier que `framer-motion` est installé:
```bash
npm install framer-motion
```

### Glassmorphism pas visible
**Solution**: Vérifier le backdrop (pas de background opaque derrière):
```javascript
<div className="relative">
  <PluqlaCard glass={true}>...</PluqlaCard>
</div>
```

---

## 📚 Ressources

- **Design System**: [unified-theme.css](../client/src/styles/unified-theme.css)
- **Phase 2 Plan**: [PHASE_2_UXUI_ENHANCEMENT_PLAN.md](./PHASE_2_UXUI_ENHANCEMENT_PLAN.md)
- **Framer Motion Docs**: https://www.framer.com/motion/
- **Lucide Icons**: https://lucide.dev/

---

**Status Phase 2A**: ✅ Complete
**Next**: Phase 2B - HomeScreen Enhancements

**Questions?** Check `/docs` ou contacte l'équipe dev sur Slack #pluqla-dev
