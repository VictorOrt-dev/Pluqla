import React, { useState } from 'react';
import {
  PluqlaButton,
  PluqlaCard,
  PluqlaStatCard,
  PluqlaInfoCard,
  PluqlaFeatureCard,
  PluqlaLoader,
  PluqlaSpinner,
  PluqlaDots,
  PluqlaPulse,
  PluqlaProgress,
  PluqlaEmptyState,
  NoTransactionsEmptyState,
  useToast,
  PluqlaModal,
  ConfirmModal,
  AlertModal,
  BottomSheet
} from '../components/common';
import {
  Plus,
  TrendingUp,
  Info,
  Sparkles,
  Settings,
  Heart,
  ShoppingBag,
  Trash2
} from 'lucide-react';

/**
 * Phase 2A Component Showcase
 * Page de démonstration de tous les composants premium
 *
 * Usage: Navigate to /component-showcase pour voir tous les composants
 */

const ComponentShowcase = () => {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [progress, setProgress] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate loading
  const handleSimulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Phase 2A Component Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Bibliothèque de composants premium Pluqla
          </p>
        </div>

        {/* Section: Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🔘 PluqlaButton
          </h2>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">Variants</h3>
            <div className="flex flex-wrap gap-3">
              <PluqlaButton variant="primary" shimmer glow>
                Primary
              </PluqlaButton>
              <PluqlaButton variant="secondary">
                Secondary
              </PluqlaButton>
              <PluqlaButton variant="ghost">
                Ghost
              </PluqlaButton>
              <PluqlaButton variant="success">
                Success
              </PluqlaButton>
              <PluqlaButton variant="danger">
                Danger
              </PluqlaButton>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <PluqlaButton size="small">Small</PluqlaButton>
              <PluqlaButton size="medium">Medium</PluqlaButton>
              <PluqlaButton size="large">Large</PluqlaButton>
              <PluqlaButton size="xl">Extra Large</PluqlaButton>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">With Icons</h3>
            <div className="flex flex-wrap gap-3">
              <PluqlaButton icon={<Plus size={18} />}>
                Ajouter
              </PluqlaButton>
              <PluqlaButton icon={<TrendingUp size={18} />} variant="success">
                Analyser
              </PluqlaButton>
              <PluqlaButton icon={<Settings size={18} />} iconPosition="right" variant="ghost">
                Paramètres
              </PluqlaButton>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">States</h3>
            <div className="flex flex-wrap gap-3">
              <PluqlaButton loading>Loading...</PluqlaButton>
              <PluqlaButton disabled>Disabled</PluqlaButton>
              <PluqlaButton fullWidth>Full Width</PluqlaButton>
            </div>
          </PluqlaCard>
        </section>

        {/* Section: Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🃏 PluqlaCard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PluqlaCard glass hover>
              <h3 className="font-bold mb-2">Glass Card</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Glassmorphism avec backdrop blur
              </p>
            </PluqlaCard>

            <PluqlaCard hover glow>
              <h3 className="font-bold mb-2">Glow Card</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Effet glow au hover
              </p>
            </PluqlaCard>

            <PluqlaCard glass hover highlight>
              <h3 className="font-bold mb-2">Highlight Card</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bordure rouge accent
              </p>
            </PluqlaCard>
          </div>

          <h3 className="font-semibold mt-8 mb-4">Pre-configured Variants</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PluqlaStatCard
              icon={TrendingUp}
              label="Économies ce mois"
              value="€245"
              change="+12%"
              trend="up"
              color="green"
            />

            <PluqlaStatCard
              icon={ShoppingBag}
              label="Dépenses"
              value="€1,234"
              change="-8%"
              trend="down"
              color="red"
            />

            <PluqlaStatCard
              icon={Heart}
              label="Objectif atteint"
              value="75%"
              change="Stable"
              trend="stable"
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <PluqlaInfoCard
              icon={Info}
              title="Information importante"
              description="Découvrez notre nouveau système de suggestions IA pour mieux économiser."
              action={{
                label: "En savoir plus",
                onClick: () => toast.info('Action clicked!')
              }}
            />

            <PluqlaFeatureCard
              icon={Sparkles}
              title="Suggestions IA"
              description="Recevez des conseils personnalisés basés sur vos habitudes"
              isNew={true}
              onClick={() => toast.success('Feature clicked!')}
            />
          </div>
        </section>

        {/* Section: Loaders */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ⏳ PluqlaLoader
          </h2>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-6">Loader Variants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center space-y-3">
                <PluqlaSpinner size="lg" />
                <p className="text-sm text-gray-600">Spinner</p>
              </div>

              <div className="text-center space-y-3">
                <PluqlaDots size="lg" />
                <p className="text-sm text-gray-600">Dots</p>
              </div>

              <div className="text-center space-y-3">
                <PluqlaPulse size="md" />
                <p className="text-sm text-gray-600">Pulse</p>
              </div>

              <div className="text-center space-y-3">
                <PluqlaLoader variant="spinner" size="lg" />
                <p className="text-sm text-gray-600">Unified</p>
              </div>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">Progress Bar</h3>
            <PluqlaProgress value={progress} max={100} showPercentage />
            <div className="flex gap-2 mt-4">
              <PluqlaButton size="small" onClick={() => setProgress(Math.max(0, progress - 10))}>
                -10%
              </PluqlaButton>
              <PluqlaButton size="small" onClick={() => setProgress(Math.min(100, progress + 10))}>
                +10%
              </PluqlaButton>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">With Text</h3>
            <PluqlaLoader variant="spinner" size="md" text="Chargement de vos données..." />
          </PluqlaCard>

          <PluqlaButton onClick={handleSimulateLoading}>
            Test Fullscreen Loader (3s)
          </PluqlaButton>

          {isLoading && (
            <PluqlaLoader
              variant="pulse"
              size="xl"
              text="Chargement en cours..."
              fullscreen
            />
          )}
        </section>

        {/* Section: Empty States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📭 PluqlaEmptyState
          </h2>

          <PluqlaCard glass>
            <PluqlaEmptyState
              illustration="pluqi"
              mood="encourage"
              title="Aucun élément trouvé"
              description="Commencez par ajouter votre premier élément pour voir vos statistiques."
              action={{
                text: "Ajouter un élément",
                onClick: () => toast.success('Action clicked!')
              }}
              secondaryAction={{
                text: "En savoir plus",
                onClick: () => toast.info('Secondary action')
              }}
            />
          </PluqlaCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PluqlaCard glass>
              <NoTransactionsEmptyState
                onAddTransaction={() => toast.info('Add transaction')}
              />
            </PluqlaCard>

            <PluqlaCard glass>
              <PluqlaEmptyState
                illustration="search"
                title="Aucun résultat"
                description="Essayez avec d'autres mots-clés"
                action={{
                  text: "Réinitialiser",
                  onClick: () => toast.info('Reset search')
                }}
              />
            </PluqlaCard>
          </div>
        </section>

        {/* Section: Toasts */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🔔 PluqlaToast
          </h2>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">Toast Types</h3>
            <div className="flex flex-wrap gap-3">
              <PluqlaButton onClick={() => toast.success('Enregistré avec succès!')}>
                Success Toast
              </PluqlaButton>
              <PluqlaButton onClick={() => toast.error('Erreur lors de l\'enregistrement')}>
                Error Toast
              </PluqlaButton>
              <PluqlaButton onClick={() => toast.info('Mise à jour disponible')}>
                Info Toast
              </PluqlaButton>
              <PluqlaButton onClick={() => toast.warning('Votre session expire bientôt')}>
                Warning Toast
              </PluqlaButton>
            </div>
          </PluqlaCard>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">With Action</h3>
            <PluqlaButton onClick={() => toast.error('Échec de la connexion', {
              duration: 0,
              action: {
                label: 'Réessayer',
                onClick: () => toast.success('Reconnexion réussie!')
              }
            })}>
              Toast with Action
            </PluqlaButton>
          </PluqlaCard>
        </section>

        {/* Section: Modals */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🪟 PluqlaModal
          </h2>

          <PluqlaCard glass>
            <h3 className="font-semibold mb-4">Modal Types</h3>
            <div className="flex flex-wrap gap-3">
              <PluqlaButton onClick={() => setShowModal(true)}>
                Standard Modal
              </PluqlaButton>
              <PluqlaButton onClick={() => setShowConfirm(true)}>
                Confirm Modal
              </PluqlaButton>
              <PluqlaButton onClick={() => setShowAlert(true)}>
                Alert Modal
              </PluqlaButton>
              <PluqlaButton onClick={() => setShowSheet(true)}>
                Bottom Sheet
              </PluqlaButton>
            </div>
          </PluqlaCard>

          {/* Standard Modal */}
          <PluqlaModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Exemple de Modal"
            description="Ceci est un modal avec glassmorphism backdrop"
            size="md"
            footer={
              <div className="flex gap-3 justify-end">
                <PluqlaButton variant="ghost" onClick={() => setShowModal(false)}>
                  Annuler
                </PluqlaButton>
                <PluqlaButton variant="primary" onClick={() => {
                  toast.success('Enregistré!');
                  setShowModal(false);
                }}>
                  Enregistrer
                </PluqlaButton>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Ce modal utilise le backdrop blur glassmorphism de Phase 2A.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Il supporte les animations fluides, le close on Escape, et le focus trap.
              </p>
            </div>
          </PluqlaModal>

          {/* Confirm Modal */}
          <ConfirmModal
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            onConfirm={() => {
              toast.success('Action confirmée!');
              setShowConfirm(false);
            }}
            title="Confirmer la suppression"
            description="Cette action est irréversible"
            confirmText="Supprimer"
            cancelText="Annuler"
            variant="danger"
          />

          {/* Alert Modal */}
          <AlertModal
            isOpen={showAlert}
            onClose={() => setShowAlert(false)}
            title="Succès"
            description="Vos modifications ont été enregistrées avec succès"
            buttonText="OK"
          />

          {/* Bottom Sheet */}
          <BottomSheet
            isOpen={showSheet}
            onClose={() => setShowSheet(false)}
            title="Options"
            height="auto"
          >
            <div className="space-y-3">
              <PluqlaButton fullWidth variant="ghost" onClick={() => {
                toast.info('Option 1 clicked');
                setShowSheet(false);
              }}>
                Option 1
              </PluqlaButton>
              <PluqlaButton fullWidth variant="ghost" onClick={() => {
                toast.info('Option 2 clicked');
                setShowSheet(false);
              }}>
                Option 2
              </PluqlaButton>
              <PluqlaButton fullWidth variant="ghost" icon={<Trash2 size={18} />} onClick={() => {
                toast.warning('Suppression demandée');
                setShowSheet(false);
              }}>
                Supprimer
              </PluqlaButton>
            </div>
          </BottomSheet>
        </section>

        {/* Footer */}
        <div className="text-center pt-12 pb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Phase 2A Component Library • Pluqla Design System
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
