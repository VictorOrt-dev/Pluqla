import React, { useState } from 'react';
import { trackOnboardingEvent } from '../../../utils/analytics';

const GoalsScreen = ({
  onNext,
  onPrevious,
  darkMode,
  updateOnboardingData,
  canGoBack
}) => {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [customGoal, setCustomGoal] = useState('');
  const [targetAmount, setTargetAmount] = useState(400);

  const predefinedGoals = [
    {
      id: 'emergency_fund',
      title: 'Fonds d\'urgence',
      description: 'Constituer une épargne de sécurité',
      icon: '🛡️',
      color: 'from-red-500 to-orange-500',
      timeframe: '6 mois',
      difficulty: 'Moyen'
    },
    {
      id: 'vacation',
      title: 'Vacances de rêve',
      description: 'Économiser pour des vacances mémorables',
      icon: '🏖️',
      color: 'from-blue-500 to-cyan-500',
      timeframe: '8 mois',
      difficulty: 'Facile'
    },
    {
      id: 'major_purchase',
      title: 'Achat important',
      description: 'Voiture, électroménager, etc.',
      icon: '🚗',
      color: 'from-green-500 to-emerald-500',
      timeframe: '12 mois',
      difficulty: 'Difficile'
    },
    {
      id: 'home_project',
      title: 'Projet maison',
      description: 'Rénovation ou aménagement',
      icon: '🏠',
      color: 'from-red-500 to-orange-500',
      timeframe: '10 mois',
      difficulty: 'Moyen'
    },
    {
      id: 'education',
      title: 'Formation',
      description: 'Investir dans tes compétences',
      icon: '📚',
      color: 'from-indigo-500 to-blue-500',
      timeframe: '4 mois',
      difficulty: 'Facile'
    },
    {
      id: 'investment',
      title: 'Investissement',
      description: 'Placements et épargne long terme',
      icon: '📈',
      color: 'from-yellow-500 to-orange-500',
      timeframe: 'Ongoing',
      difficulty: 'Expert'
    }
  ];

  const handleGoalToggle = (goalId) => {
    setSelectedGoals(prev => {
      const isSelected = prev.includes(goalId);
      const newSelection = isSelected
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId];

      trackOnboardingEvent('goal_selection', {
        goalId,
        action: isSelected ? 'deselect' : 'select',
        totalSelected: newSelection.length
      });

      return newSelection;
    });
  };

  const handleNext = () => {
    const goalsData = {
      selectedGoals,
      customGoal: customGoal.trim(),
      targetAmount,
      goalsConfigured: true
    };

    updateOnboardingData({
      goalsData,
      userGoals: goalsData
    });

    trackOnboardingEvent('goals_complete', {
      selectedGoalsCount: selectedGoals.length,
      hasCustomGoal: !!customGoal.trim(),
      targetAmount
    });

    onNext(goalsData);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Facile': return 'text-green-500';
      case 'Moyen': return 'text-yellow-500';
      case 'Difficile': return 'text-orange-500';
      case 'Expert': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTimeframeIcon = (timeframe) => {
    if (timeframe.includes('mois')) {
      const months = parseInt(timeframe);
      if (months <= 4) return '⚡';
      if (months <= 8) return '📅';
      return '🗓️';
    }
    return '♾️';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col px-6 py-8`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎯</div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
          Quels sont tes objectifs ?
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Définir tes objectifs m'aide à personnaliser tes conseils d'économies
        </p>
      </div>

      {/* Target Amount */}
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} mb-6`}>
        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
          Objectif d'économies mensuel
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={targetAmount}
            onChange={(e) => setTargetAmount(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'} min-w-[80px]`}>
            {targetAmount}€
          </div>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>50€</span>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>1000€</span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="flex-1 mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-4`}>
          Choisis tes objectifs prioritaires
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {predefinedGoals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);

            return (
              <button
                key={goal.id}
                onClick={() => handleGoalToggle(goal.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-red-500 bg-red-500/10 scale-[1.02]'
                    : darkMode
                    ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } hover:scale-[1.02]`}
              >
                <div className="mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center mb-2`}>
                    <span className="text-xl">{goal.icon}</span>
                  </div>
                  <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-black'} mb-1`}>
                    {goal.title}
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} leading-tight`}>
                    {goal.description}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getTimeframeIcon(goal.timeframe)} {goal.timeframe}
                  </span>
                  <span className={`font-medium ${getDifficultyColor(goal.difficulty)}`}>
                    {goal.difficulty}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Goal */}
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Objectif personnalisé (optionnel)
          </label>
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="Ex: Offrir un cadeau à ma famille..."
            className={`w-full px-3 py-2 rounded-lg border transition-all ${
              darkMode
                ? 'border-gray-700 bg-gray-800 text-white focus:border-red-500'
                : 'border-gray-300 bg-white focus:border-red-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
        </div>
      </div>

      {/* Selection Summary */}
      {selectedGoals.length > 0 && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} mb-6 border border-red-500/20`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              {selectedGoals.length} objectif{selectedGoals.length > 1 ? 's' : ''} sélectionné{selectedGoals.length > 1 ? 's' : ''}
            </span>
            <span className="text-2xl">🎯</span>
          </div>
          <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'} mt-1`}>
            Je vais personnaliser tes conseils pour t'aider à atteindre ces objectifs
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          onClick={onPrevious}
          className={`flex-1 py-3 ${darkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-black hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          ← Retour
        </button>

        <button
          onClick={handleNext}
          disabled={selectedGoals.length === 0 && !customGoal.trim()}
          className={`flex-1 py-3 rounded-xl transition-colors ${
            selectedGoals.length > 0 || customGoal.trim()
              ? 'pluqla-btn-primary text-white hover:scale-[1.02]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continuer →
        </button>
      </div>
    </div>
  );
};

export default GoalsScreen;