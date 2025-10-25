/**
 * Phase 2A Pluqla Component Library - Centralized Exports
 *
 * Import simplifié pour tous les composants premium Pluqla
 *
 * Usage:
 * import { PluqlaButton, PluqlaCard, useToast } from '@/components/common';
 */

// Buttons
export { default as PluqlaButton } from './PluqlaButton';
export {
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
  IconButton
} from './PluqlaButton';

// Cards
export { default as PluqlaCard } from './PluqlaCard';
export {
  PluqlaStatCard,
  PluqlaInfoCard,
  PluqlaFeatureCard
} from './PluqlaCard';

// Loaders
export { default as PluqlaLoader } from './PluqlaLoader';
export {
  PluqlaSpinner,
  PluqlaDots,
  PluqlaPulse,
  PluqlaProgress
} from './PluqlaLoader';

// Empty States
export { default as PluqlaEmptyState } from './PluqlaEmptyState';
export {
  PluqiMascot,
  NoTransactionsEmptyState,
  NoRecipesEmptyState,
  NoGoalsEmptyState,
  SearchEmptyState,
  GenericEmptyState,
  SuccessEmptyState
} from './PluqlaEmptyState';

// Toasts
export { default as PluqlaToast } from './PluqlaToast';
export {
  ToastProvider,
  useToast,
  StandaloneToast
} from './PluqlaToast';

// Modals
export { default as PluqlaModal } from './PluqlaModal';
export {
  ConfirmModal,
  AlertModal,
  BottomSheet
} from './PluqlaModal';

// Legacy components (keep for backward compatibility)
export { default as LoadingSpinner } from './LoadingSpinner';
