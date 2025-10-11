/**
 * SubscriptionPage - Premium Subscription Offer
 *
 * Pluqla Design System:
 * - Rouge cerise (#F14545)
 * - Noir élégant
 * - Modern animations (GPU-optimized)
 * - Responsive (mobile-first)
 * - Accessible (ARIA, keyboard navigation)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is already premium
  const isPremium = user?.subscriptionTier === 'PREMIUM' ||
                     user?.subscriptionTier === 'ENTERPRISE' ||
                     user?.isPremium === true;

  // Premium benefits (8 features)
  const benefits = [
    {
      icon: '🤖',
      title: '500 requêtes IA par jour',
      description: '10x plus de suggestions intelligentes',
      highlight: true
    },
    {
      icon: '🚗',
      title: 'Optimisation des trajets',
      description: 'Économisez sur vos déplacements'
    },
    {
      icon: '📸',
      title: 'Analyse de photos',
      description: 'Match automatique avec vos reçus'
    },
    {
      icon: '🍽️',
      title: 'Planification repas premium',
      description: 'Menus personnalisés et économiques'
    },
    {
      icon: '🎯',
      title: 'Recommandations activités',
      description: 'Suggestions adaptées à votre budget'
    },
    {
      icon: '📊',
      title: 'Analytics avancés',
      description: 'Insights détaillés et prédictions'
    },
    {
      icon: '⚡',
      title: 'Support prioritaire',
      description: 'Réponse en moins de 24h'
    },
    {
      icon: '🔒',
      title: 'Sécurité renforcée',
      description: 'Protection avancée de vos données'
    }
  ];

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      // TODO: Integrate with payment provider (Stripe, PayPal, etc.)
      // For now, redirect to payment page or show modal
      console.log('Initiating premium upgrade...');

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect to payment gateway or success page
      navigate('/payment', { state: { plan: 'premium', price: 5 } });
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              aria-label="Retour"
            >
              <span className="text-xl">←</span>
              <span className="hidden sm:inline">Retour</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Passer Premium</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Already Premium Banner */}
        {isPremium && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h2 className="text-lg font-bold text-green-900">Vous êtes déjà Premium !</h2>
                <p className="text-sm text-green-700 mt-1">
                  Profitez de tous les avantages de votre abonnement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <div className="relative mb-12">
          {/* Popular Badge */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <span className="inline-block bg-gradient-to-r from-[#F14545] to-[#D63737] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
              ⭐ Offre Recommandée
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-[#F14545] transform hover:scale-105 transition-transform duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F14545] to-[#D63737] text-white p-8 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">Premium</h2>
              <p className="text-white/90 text-sm sm:text-base">
                Débloquez tout le potentiel de Pluqla
              </p>

              {/* Price */}
              <div className="mt-6 mb-4">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl sm:text-7xl font-extrabold">5€</span>
                  <span className="text-xl text-white/90">/mois</span>
                </div>
                <p className="text-sm text-white/80 mt-2">Sans engagement • Annulation à tout moment</p>
              </div>

              {/* CTA Button */}
              {!isPremium && (
                <button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="mt-6 w-full max-w-md mx-auto bg-white text-[#F14545] font-bold py-4 px-8 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                  aria-label="Passer à Premium pour 5€ par mois"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Traitement...
                    </span>
                  ) : (
                    '🚀 Passer à Premium maintenant'
                  )}
                </button>
              )}
            </div>

            {/* Benefits List */}
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Ce qui est inclus :
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-300 hover:shadow-md ${
                      benefit.highlight
                        ? 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-[#F14545]'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0" role="img" aria-hidden="true">
                      {benefit.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        {benefit.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 sm:px-8 py-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span>✓</span> Paiement sécurisé
                </span>
                <span className="flex items-center gap-2">
                  <span>✓</span> Données cryptées
                </span>
                <span className="flex items-center gap-2">
                  <span>✓</span> RGPD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Questions fréquentes</h3>

          <div className="space-y-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 hover:text-[#F14545] transition-colors">
                <span>Puis-je annuler à tout moment ?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm">
                Oui, absolument. Vous pouvez annuler votre abonnement à tout moment depuis votre profil.
                Aucun engagement, aucune question posée.
              </p>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 hover:text-[#F14545] transition-colors">
                <span>Quels moyens de paiement acceptez-vous ?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm">
                Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal, et les virements SEPA.
                Tous les paiements sont sécurisés et cryptés.
              </p>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 hover:text-[#F14545] transition-colors">
                <span>Mes données sont-elles en sécurité ?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm">
                Vos données sont cryptées et stockées en Europe (RGPD). Nous ne vendons jamais vos informations
                et vous gardez le contrôle total de vos données.
              </p>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 hover:text-[#F14545] transition-colors">
                <span>Que se passe-t-il si j'annule ?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm">
                Vous conservez l'accès Premium jusqu'à la fin de votre période payée.
                Après, vous repassez automatiquement en version gratuite avec 50 requêtes IA/jour.
              </p>
            </details>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Ils sont passés Premium
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#F14545] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div>
                  <p className="font-bold text-gray-900">Marie L.</p>
                  <p className="text-sm text-gray-600">Lyon</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm italic">
                "L'optimisation des trajets m'a fait économiser plus de 50€ par mois.
                L'abonnement est vite rentabilisé !"
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#F14545] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  T
                </div>
                <div>
                  <p className="font-bold text-gray-900">Thomas R.</p>
                  <p className="text-sm text-gray-600">Paris</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm italic">
                "Les 500 requêtes IA par jour changent tout. Je gère mes finances
                10x plus efficacement qu'avant."
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        {!isPremium && (
          <div className="mt-12 text-center">
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="inline-block bg-gradient-to-r from-[#F14545] to-[#D63737] text-white font-bold py-4 px-12 rounded-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
            >
              {isProcessing ? 'Traitement...' : 'Commencer maintenant - 5€/mois'}
            </button>
            <p className="text-sm text-gray-600 mt-4">
              Rejoignez des milliers d'utilisateurs qui économisent avec Pluqla Premium
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>
            Des questions ? Contactez-nous à{' '}
            <a href="mailto:support@pluqla.com" className="text-[#F14545] hover:underline">
              support@pluqla.com
            </a>
          </p>
          <p className="mt-2">
            <a href="/terms" className="hover:text-[#F14545]">CGU</a>
            {' • '}
            <a href="/privacy" className="hover:text-[#F14545]">Confidentialité</a>
            {' • '}
            <a href="/contact" className="hover:text-[#F14545]">Contact</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SubscriptionPage;
