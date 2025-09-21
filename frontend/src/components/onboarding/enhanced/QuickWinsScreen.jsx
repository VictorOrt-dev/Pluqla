import React, { useState, useEffect } from 'react';
import { trackOnboardingEvent } from '../../../utils/analytics';

const QuickWinsScreen = ({
  onNext,
  onPrevious,
  darkMode,
  updateOnboardingData,
  onboardingData,
  showNotification,
  canGoBack
}) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [revealedTips, setRevealedTips] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Quick wins basés sur les réponses de personnalisation
  const getPersonalizedQuickWins = () => {
    const answers = onboardingData.personalizationAnswers || {};

    const baseQuickWins = [
      {
        id: 'cashback_apps',
        title: 'Apps cashback',
        description: 'Active le cashback sur tes achats quotidiens',
        savings: '15-25€/mois',
        difficulty: 'Très facile',
        timeToImplement: '5 min',
        icon: '💳',
        category: 'shopping',
        steps: [
          'Télécharge Shopmium ou iGraal',
          'Scanne tes tickets de caisse',
          'Reçois du cashback automatiquement'
        ],
        tip: 'Combine avec tes courses habituelles pour maximiser les gains'
      },
      {
        id: 'subscription_audit',
        title: 'Audit abonnements',
        description: 'Identifie et annule les abonnements inutiles',
        savings: '30-80€/mois',
        difficulty: 'Facile',
        timeToImplement: '15 min',
        icon: '📱',
        category: 'general',
        steps: [
          'Vérifie tes relevés bancaires',
          'Liste tous tes abonnements',
          'Annule ceux que tu n\'utilises plus'
        ],
        tip: 'Regarde les prélèvements des 3 derniers mois pour tout identifier'
      },
      {
        id: 'meal_planning',
        title: 'Planification repas',
        description: 'Planifie tes repas pour réduire le gaspillage',
        savings: '40-60€/mois',
        difficulty: 'Moyen',
        timeToImplement: '30 min/semaine',
        icon: '🍽️',
        category: 'alimentation',
        steps: [
          'Planifie 7 repas chaque dimanche',
          'Fais une liste de courses précise',
          'Cuisine en batch le weekend'
        ],
        tip: 'Commence par 3-4 repas planifiés, puis augmente progressivement'
      },
      {
        id: 'energy_optimization',
        title: 'Optimisation énergie',
        description: 'Réduis ta facture énergétique facilement',
        savings: '20-40€/mois',
        difficulty: 'Facile',
        timeToImplement: '10 min',
        icon: '💡',
        category: 'logement',
        steps: [
          'Baisse le chauffage de 1°C',
          'Débranché les appareils en veille',
          'Utilise des LED pour l\'éclairage'
        ],
        tip: '1°C en moins = 7% d\'économie sur ta facture chauffage'
      },
      {
        id: 'transport_optimization',
        title: 'Transport intelligent',
        description: 'Optimise tes déplacements quotidiens',
        savings: '25-50€/mois',
        difficulty: 'Facile',
        timeToImplement: '10 min',
        icon: '🚗',
        category: 'transport',
        steps: [
          'Utilise Waze pour éviter les bouchons',
          'Regroupe tes déplacements',
          'Teste le covoiturage ou vélo partagé'
        ],
        tip: 'Combine plusieurs trajets en un seul pour économiser carburant et temps'
      },
      {
        id: 'bank_fees_reduction',
        title: 'Frais bancaires',
        description: 'Négocie ou supprime les frais bancaires',
        savings: '10-30€/mois',
        difficulty: 'Moyen',
        timeToImplement: '20 min',
        icon: '🏦',
        category: 'finance',
        steps: [
          'Appelle ton conseiller bancaire',
          'Demande la suppression des frais',
          'Compare avec les banques en ligne'
        ],
        tip: 'Mentionne ta fidélité et tes revenus pour négocier'
      }
    ];

    // Personnalisation basée sur les réponses
    let personalizedWins = [...baseQuickWins];

    // Prioriser selon les priorités de dépenses
    if (answers.spending_priorities?.includes('alimentation')) {
      personalizedWins = personalizedWins.sort((a, b) =>
        a.category === 'alimentation' ? -1 : b.category === 'alimentation' ? 1 : 0
      );
    }

    if (answers.spending_priorities?.includes('transport')) {
      personalizedWins = personalizedWins.sort((a, b) =>
        a.category === 'transport' ? -1 : b.category === 'transport' ? 1 : 0
      );
    }

    return personalizedWins.slice(0, 4); // Garder 4 tips maximum
  };

  const quickWins = getPersonalizedQuickWins();
  const currentTip = quickWins[currentTipIndex];

  useEffect(() => {
    trackOnboardingEvent('quick_wins_view', {
      tipId: currentTip?.id,
      tipIndex: currentTipIndex,
      totalTips: quickWins.length
    });
  }, [currentTip?.id, currentTipIndex, quickWins.length]);

  const revealTip = () => {
    if (!revealedTips.includes(currentTipIndex)) {
      setRevealedTips(prev => [...prev, currentTipIndex]);

      // Ajouter les économies potentielles
      const savingsRange = currentTip.savings.match(/(\d+)-(\d+)/);
      if (savingsRange) {
        const avgSavings = (parseInt(savingsRange[1]) + parseInt(savingsRange[2])) / 2;
        setTotalSavings(prev => prev + avgSavings);
      }

      trackOnboardingEvent('quick_win_revealed', {
        tipId: currentTip.id,
        tipIndex: currentTipIndex,
        potentialSavings: currentTip.savings
      });

      showNotification(`+${currentTip.savings} d'économies potentielles !`, 'success');
    }
  };

  const nextTip = () => {
    if (currentTipIndex < quickWins.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTipIndex(currentTipIndex + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      completeQuickWins();
    }
  };

  const previousTip = () => {
    if (currentTipIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTipIndex(currentTipIndex - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const completeQuickWins = () => {
    updateOnboardingData({
      quickWinsData: {
        viewedTips: revealedTips.length,
        totalTips: quickWins.length,
        potentialMonthlySavings: totalSavings,
        completedAt: new Date().toISOString()
      },
      quickWinsCompleted: true
    });

    trackOnboardingEvent('quick_wins_complete', {
      viewedTips: revealedTips.length,
      totalTips: quickWins.length,
      potentialSavings: totalSavings
    });

    onNext({
      quickWinsData: {
        potentialMonthlySavings: totalSavings,
        revealedTipsCount: revealedTips.length
      }
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Très facile': return 'text-green-500';
      case 'Facile': return 'text-blue-500';
      case 'Moyen': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col px-6 py-8`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">⚡</div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
          Tes premières économies
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Découvre des astuces simples pour commencer à économiser dès aujourd'hui
        </p>
      </div>

      {/* Progress & Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Astuce {currentTipIndex + 1} sur {quickWins.length}
        </div>
        <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
          {totalSavings}€/mois potentiel
        </div>
      </div>

      <div className={`h-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-200'} rounded-full mb-8`}>
        <div
          className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentTipIndex + 1) / quickWins.length) * 100}%` }}
        />
      </div>

      {/* Current Tip */}
      <div className={`flex-1 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border-2 ${
          revealedTips.includes(currentTipIndex)
            ? 'border-green-500 bg-gradient-to-br from-green-500/5 to-blue-500/5'
            : darkMode ? 'border-gray-700' : 'border-gray-200'
        } shadow-lg mb-6`}>

          {/* Tip Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-3xl">{currentTip.icon}</div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                  {currentTip.title}
                </h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                {currentTip.description}
              </p>
            </div>
          </div>

          {/* Tip Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {currentTip.savings}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Économies
              </div>
            </div>
            <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`text-sm font-bold ${getDifficultyColor(currentTip.difficulty)}`}>
                {currentTip.difficulty}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Difficulté
              </div>
            </div>
            <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {currentTip.timeToImplement}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Temps
              </div>
            </div>
          </div>

          {/* Reveal Button */}
          {!revealedTips.includes(currentTipIndex) ? (
            <button
              onClick={revealTip}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-xl hover:scale-[1.02] transition-all shadow-lg"
            >
              🎁 Révéler l'astuce
            </button>
          ) : (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} space-y-4`}>
              {/* Steps */}
              <div>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-3`}>
                  Comment faire :
                </h4>
                <ol className="space-y-2">
                  {currentTip.steps.map((step, index) => (
                    <li key={index} className={`flex items-start space-x-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center`}>
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Pro Tip */}
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-500/20`}>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500">💡</span>
                  <div>
                    <span className={`font-medium text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Pro tip:
                    </span>
                    <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {currentTip.tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          onClick={currentTipIndex === 0 ? onPrevious : previousTip}
          className={`flex-1 py-3 ${darkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-black hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          ← {currentTipIndex === 0 ? 'Retour' : 'Précédent'}
        </button>

        <button
          onClick={nextTip}
          disabled={!revealedTips.includes(currentTipIndex)}
          className={`flex-1 py-3 rounded-xl transition-all ${
            revealedTips.includes(currentTipIndex)
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-[1.02]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {currentTipIndex === quickWins.length - 1 ? 'Terminer' : 'Suivant'} →
        </button>
      </div>

      {/* Savings Summary */}
      {totalSavings > 0 && (
        <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} border border-green-500/20 text-center`}>
          <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
            Potentiel d'économies révélé : <span className="font-bold">{totalSavings}€/mois</span>
          </p>
          <p className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'} mt-1`}>
            Soit {totalSavings * 12}€ par an ! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickWinsScreen;