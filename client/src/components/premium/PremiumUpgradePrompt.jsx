/**
 * PremiumUpgradePrompt - Modal/Banner for Premium Upgrade
 *
 * Displays when free users hit premium features (403 responses)
 * Pluqla Design System with rouge cerise (#F14545)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react'; // Or use plain symbols if no icon library

const PremiumUpgradePrompt = ({
  isOpen,
  onClose,
  feature = 'cette fonctionnalité premium',
  details = null,
  variant = 'modal' // 'modal' or 'banner'
}) => {
  const navigate = useNavigate();

  // Extract details from 403 response
  const benefits = details?.benefits || [
    '500 requêtes IA par jour (10x plus)',
    'Optimisation des trajets',
    'Analyse de photos',
    'Planification repas premium',
    'Recommandations activités',
    'Analytics avancés',
    'Support prioritaire',
    'Sécurité renforcée'
  ];

  const pricing = details?.pricing?.monthly || '5€';

  const handleUpgrade = () => {
    onClose?.();
    navigate('/subscription');
  };

  if (!isOpen) return null;

  // Banner variant (less intrusive)
  if (variant === 'banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-[#F14545] to-[#D63737] text-white p-4 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-bold text-sm sm:text-base">
                  Accédez à {feature}
                </p>
                <p className="text-xs text-white/90 mt-1">
                  Passez à Premium pour seulement {pricing}/mois
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUpgrade}
                className="bg-white text-[#F14545] font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors text-sm whitespace-nowrap"
              >
                Découvrir Premium
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-2"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal variant (full-screen on mobile, centered on desktop)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#F14545] to-[#D63737] text-white p-6 sm:p-8 rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors p-2"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>

          <div className="text-center">
            <span className="text-5xl block mb-4" role="img" aria-hidden="true">🔒</span>
            <h2 id="premium-modal-title" className="text-2xl sm:text-3xl font-bold mb-2">
              Fonctionnalité Premium
            </h2>
            <p className="text-white/90 text-sm sm:text-base">
              Passez à Premium pour accéder à {feature}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Pricing Highlight */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-[#F14545] rounded-2xl p-6 mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Débloquez tout pour seulement</p>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-extrabold text-[#F14545]">{pricing}</span>
              <span className="text-xl text-gray-700">/mois</span>
            </div>
            <p className="text-xs text-gray-600">Sans engagement • Annulation à tout moment</p>
          </div>

          {/* Benefits List */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-4 text-center">
              Ce que vous obtenez avec Premium :
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.slice(0, 6).map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-[#F14545] font-bold flex-shrink-0">✓</span>
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-[#F14545] to-[#D63737] text-white font-bold py-4 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              🚀 Passer à Premium maintenant
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Continuer avec la version gratuite
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span>✓</span> Paiement sécurisé
              </span>
              <span className="flex items-center gap-1">
                <span>✓</span> Données cryptées
              </span>
              <span className="flex items-center gap-1">
                <span>✓</span> RGPD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to easily show/hide the prompt
export const usePremiumPrompt = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [promptData, setPromptData] = React.useState({
    feature: 'cette fonctionnalité premium',
    details: null,
    variant: 'modal'
  });

  const showPrompt = (feature, details = null, variant = 'modal') => {
    setPromptData({ feature, details, variant });
    setIsOpen(true);
  };

  const hidePrompt = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    promptData,
    showPrompt,
    hidePrompt
  };
};

export default PremiumUpgradePrompt;
