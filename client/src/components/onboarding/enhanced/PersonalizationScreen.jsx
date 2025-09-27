import React, { useState, useEffect } from 'react';
import { trackOnboardingEvent } from '../../../utils/analytics';

const ENHANCED_QUESTIONS = [
  {
    id: 'lifestyle',
    question: 'Quel est ton style de vie ?',
    emoji: '🏠',
    type: 'select',
    options: [
      { value: 'etudiant', label: 'Étudiant(e)', icon: '📚' },
      { value: 'jeune_actif', label: 'Jeune actif', icon: '💼' },
      { value: 'famille', label: 'En famille', icon: '👨‍👩‍👧‍👦' },
      { value: 'senior', label: 'Senior', icon: '🧓' }
    ]
  },
  {
    id: 'income_range',
    question: 'Quelle est ta tranche de revenus mensuelle ?',
    emoji: '💰',
    type: 'select',
    options: [
      { value: 'moins_1000', label: 'Moins de 1000€', icon: '🟥' },
      { value: '1000_2000', label: '1000€ - 2000€', icon: '🟨' },
      { value: '2000_3500', label: '2000€ - 3500€', icon: '🟩' },
      { value: 'plus_3500', label: 'Plus de 3500€', icon: '🟦' }
    ]
  },
  {
    id: 'spending_priorities',
    question: 'Quelles sont tes priorités de dépenses ?',
    emoji: '🎯',
    type: 'multi_select',
    maxSelections: 3,
    options: [
      { value: 'alimentation', label: 'Alimentation', icon: '🍕' },
      { value: 'logement', label: 'Logement', icon: '🏠' },
      { value: 'transport', label: 'Transport', icon: '🚗' },
      { value: 'vetements', label: 'Vêtements', icon: '👕' },
      { value: 'loisirs', label: 'Loisirs', icon: '🎭' },
      { value: 'technologie', label: 'Technologie', icon: '📱' },
      { value: 'voyage', label: 'Voyages', icon: '✈️' },
      { value: 'sante', label: 'Santé', icon: '🏥' }
    ]
  },
  {
    id: 'savings_goal',
    question: 'Quel est ton objectif d\'économies mensuel ?',
    emoji: '🎯',
    type: 'range',
    min: 50,
    max: 1000,
    step: 50,
    default: 300,
    unit: '€'
  },
  {
    id: 'current_habits',
    question: 'Décris tes habitudes actuelles',
    emoji: '📊',
    type: 'habits_grid',
    categories: [
      {
        id: 'food',
        label: 'Alimentation',
        icon: '🍽️',
        habits: [
          { id: 'resto_week', label: 'Resto/semaine', type: 'range', min: 0, max: 7, default: 2 },
          { id: 'courses_bio', label: 'Courses bio', type: 'boolean', default: false },
          { id: 'meal_prep', label: 'Meal prep', type: 'boolean', default: false }
        ]
      },
      {
        id: 'transport',
        label: 'Transport',
        icon: '🚗',
        habits: [
          { id: 'car_usage', label: 'Voiture/semaine', type: 'range', min: 0, max: 7, default: 5 },
          { id: 'public_transport', label: 'Transports publics', type: 'boolean', default: true },
          { id: 'bike_usage', label: 'Vélo/marche', type: 'boolean', default: false }
        ]
      },
      {
        id: 'shopping',
        label: 'Shopping',
        icon: '🛍️',
        habits: [
          { id: 'online_shopping', label: 'Shopping en ligne', type: 'frequency', options: ['Rarement', 'Parfois', 'Souvent'] },
          { id: 'brand_preference', label: 'Préférence marques', type: 'boolean', default: false },
          { id: 'promo_hunter', label: 'Chasseur de promos', type: 'boolean', default: false }
        ]
      }
    ]
  },
  {
    id: 'ai_preferences',
    question: 'Comment préfères-tu recevoir tes conseils ?',
    emoji: '🤖',
    type: 'preferences',
    options: [
      {
        id: 'frequency',
        label: 'Fréquence des suggestions',
        type: 'select',
        options: [
          { value: 'daily', label: 'Quotidienne', icon: '📅' },
          { value: 'weekly', label: 'Hebdomadaire', icon: '📊' },
          { value: 'monthly', label: 'Mensuelle', icon: '📈' }
        ]
      },
      {
        id: 'communication_style',
        label: 'Style de communication',
        type: 'select',
        options: [
          { value: 'friendly', label: 'Amical et décontracté', icon: '😊' },
          { value: 'professional', label: 'Professionnel', icon: '💼' },
          { value: 'motivational', label: 'Motivant et énergique', icon: '🚀' }
        ]
      },
      {
        id: 'risk_tolerance',
        label: 'Tolérance au risque',
        type: 'select',
        options: [
          { value: 'conservative', label: 'Conservateur', icon: '🛡️' },
          { value: 'moderate', label: 'Modéré', icon: '⚖️' },
          { value: 'aggressive', label: 'Audacieux', icon: '🔥' }
        ]
      }
    ]
  }
];

const PersonalizationScreen = ({
  onNext,
  onPrevious,
  darkMode,
  isLoading,
  updateOnboardingData,
  showNotification,
  canGoBack,
  currentStep,
  totalSteps,
  progressPercentage
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);

  const currentQuestion = ENHANCED_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === ENHANCED_QUESTIONS.length - 1;

  // Debug logs
  console.log('🔍 PersonalizationScreen Debug:', {
    currentQuestionIndex,
    totalQuestions: ENHANCED_QUESTIONS.length,
    currentQuestion,
    questionId: currentQuestion?.id,
    questionType: currentQuestion?.type
  });

  useEffect(() => {
    trackOnboardingEvent('personalization_question_view', {
      questionId: currentQuestion.id,
      questionIndex: currentQuestionIndex,
      totalQuestions: ENHANCED_QUESTIONS.length
    });
  }, [currentQuestion.id, currentQuestionIndex]);

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    trackOnboardingEvent('personalization_answer', {
      questionId,
      answer: typeof answer === 'object' ? Object.keys(answer) : answer,
      questionIndex: currentQuestionIndex
    });

    // Auto-progression pour les questions simples
    if (currentQuestion.type === 'select' && !Array.isArray(answer)) {
      setTimeout(() => nextQuestion(), 300);
    }
  };

  const nextQuestion = () => {
    if (isLastQuestion) {
      completePersonalization();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setIsAnimating(false);
      }, 200);
    } else {
      onPrevious();
    }
  };

  const completePersonalization = () => {
    // Calculer un score de personnalisation
    const personalizationScore = calculatePersonalizationScore(answers);

    updateOnboardingData({
      personalizationAnswers: answers,
      personalizationScore,
      personalizationCompleted: true
    });

    trackOnboardingEvent('personalization_complete', {
      totalAnswers: Object.keys(answers).length,
      personalizationScore,
      answers: answers
    });

    onNext({
      personalizationData: answers,
      personalizationScore
    });
  };

  const calculatePersonalizationScore = (answers) => {
    let score = 0;
    const maxScore = ENHANCED_QUESTIONS.length * 20;

    // Bonus pour chaque question répondue
    Object.keys(answers).forEach(questionId => {
      const answer = answers[questionId];
      if (answer !== null && answer !== undefined && answer !== '') {
        score += 20;

        // Bonus pour les réponses détaillées
        if (typeof answer === 'object' && Object.keys(answer).length > 1) {
          score += 5;
        }
      }
    });

    return Math.round((score / maxScore) * 100);
  };

  const renderQuestionContent = () => {
    console.log('🔍 Debug - Question type:', currentQuestion?.type, 'Question:', currentQuestion);

    if (!currentQuestion) {
      console.error('❌ currentQuestion is undefined!', { currentQuestionIndex, totalQuestions: ENHANCED_QUESTIONS.length });
      return (
        <div className="text-center">
          <p className="text-red-500">Erreur: Question non trouvée</p>
          <p className="text-xs mt-2">Debug: Index {currentQuestionIndex} / {ENHANCED_QUESTIONS.length}</p>
        </div>
      );
    }

    switch (currentQuestion.type) {
      case 'select':
        return (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  answers[currentQuestion.id] === option.value
                    ? 'border-red-500 bg-red-500/10'
                    : darkMode
                    ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } hover:scale-[1.02]`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{option.icon}</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    {option.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'multi_select':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id]?.includes(option.value);
                const selectedCount = answers[currentQuestion.id]?.length || 0;
                const canSelect = selectedCount < currentQuestion.maxSelections;

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      const currentAnswers = answers[currentQuestion.id] || [];
                      let newAnswers;

                      if (isSelected) {
                        newAnswers = currentAnswers.filter(val => val !== option.value);
                      } else if (canSelect) {
                        newAnswers = [...currentAnswers, option.value];
                      } else {
                        return;
                      }

                      handleAnswer(currentQuestion.id, newAnswers);
                    }}
                    disabled={!isSelected && !canSelect}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10'
                        : !canSelect
                        ? 'border-gray-300 bg-gray-100 opacity-50'
                        : darkMode
                        ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{option.icon}</div>
                      <div className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                        {option.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Sélectionne jusqu'à {currentQuestion.maxSelections} priorités
                ({(answers[currentQuestion.id]?.length || 0)}/{currentQuestion.maxSelections})
              </p>
            </div>

            {(answers[currentQuestion.id]?.length || 0) > 0 && (
              <button
                onClick={nextQuestion}
                className="w-full py-3 pluqla-btn-primary text-white font-semibold rounded-xl"
              >
                Continuer
              </button>
            )}
          </div>
        );

      case 'range':
        const value = answers[currentQuestion.id] || currentQuestion.default;
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                {value}{currentQuestion.unit}
              </div>
              <input
                type="range"
                min={currentQuestion.min}
                max={currentQuestion.max}
                step={currentQuestion.step}
                value={value}
                onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-sm mt-2">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {currentQuestion.min}{currentQuestion.unit}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {currentQuestion.max}{currentQuestion.unit}
                </span>
              </div>
            </div>

            <button
              onClick={nextQuestion}
              className="w-full py-3 pluqla-btn-primary text-white font-semibold rounded-xl"
            >
              Continuer
            </button>
          </div>
        );

      case 'habits_grid':
        return (
          <div className="space-y-6">
            {currentQuestion.categories.map((category) => (
              <div key={category.id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">{category.icon}</span>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    {category.label}
                  </h3>
                </div>

                <div className="space-y-3">
                  {category.habits.map((habit) => (
                    <div key={habit.id} className="flex items-center justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {habit.label}
                      </span>

                      {habit.type === 'boolean' && (
                        <button
                          onClick={() => {
                            const currentAnswer = answers[currentQuestion.id] || {};
                            const categoryAnswer = currentAnswer[category.id] || {};
                            const newValue = !categoryAnswer[habit.id];

                            handleAnswer(currentQuestion.id, {
                              ...currentAnswer,
                              [category.id]: {
                                ...categoryAnswer,
                                [habit.id]: newValue
                              }
                            });
                          }}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            answers[currentQuestion.id]?.[category.id]?.[habit.id]
                              ? 'bg-red-500'
                              : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            answers[currentQuestion.id]?.[category.id]?.[habit.id]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`} />
                        </button>
                      )}

                      {habit.type === 'range' && (
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {answers[currentQuestion.id]?.[category.id]?.[habit.id] || habit.default}
                          </span>
                          <input
                            type="range"
                            min={habit.min}
                            max={habit.max}
                            value={answers[currentQuestion.id]?.[category.id]?.[habit.id] || habit.default}
                            onChange={(e) => {
                              const currentAnswer = answers[currentQuestion.id] || {};
                              const categoryAnswer = currentAnswer[category.id] || {};

                              handleAnswer(currentQuestion.id, {
                                ...currentAnswer,
                                [category.id]: {
                                  ...categoryAnswer,
                                  [habit.id]: parseInt(e.target.value)
                                }
                              });
                            }}
                            className="w-20 h-1"
                          />
                        </div>
                      )}

                      {habit.type === 'frequency' && (
                        <select
                          value={answers[currentQuestion.id]?.[category.id]?.[habit.id] || habit.options[0]}
                          onChange={(e) => {
                            const currentAnswer = answers[currentQuestion.id] || {};
                            const categoryAnswer = currentAnswer[category.id] || {};

                            handleAnswer(currentQuestion.id, {
                              ...currentAnswer,
                              [category.id]: {
                                ...categoryAnswer,
                                [habit.id]: e.target.value
                              }
                            });
                          }}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                        >
                          {habit.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={nextQuestion}
              className="w-full py-3 pluqla-btn-primary text-white font-semibold rounded-xl"
            >
              Continuer
            </button>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            {currentQuestion.options.map((option) => (
              <div key={option.id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                  {option.label}
                </h3>

                <div className="space-y-2">
                  {option.options.map((subOption) => (
                    <button
                      key={subOption.value}
                      onClick={() => {
                        const currentAnswer = answers[currentQuestion.id] || {};
                        handleAnswer(currentQuestion.id, {
                          ...currentAnswer,
                          [option.id]: subOption.value
                        });
                      }}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        answers[currentQuestion.id]?.[option.id] === subOption.value
                          ? 'border-red-500 bg-red-500/10'
                          : darkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{subOption.icon}</span>
                        <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                          {subOption.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={nextQuestion}
              disabled={!answers[currentQuestion.id] || Object.keys(answers[currentQuestion.id]).length < currentQuestion.options.length}
              className={`w-full py-3 rounded-xl transition-colors ${
                answers[currentQuestion.id] && Object.keys(answers[currentQuestion.id]).length >= currentQuestion.options.length
                  ? 'pluqla-btn-primary text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continuer
            </button>
          </div>
        );

      default:
        console.error('❌ Type de question non supporté:', {
          type: currentQuestion.type,
          question: currentQuestion,
          availableTypes: ['select', 'multi_select', 'range', 'habits_grid', 'preferences']
        });
        return (
          <div className="text-center">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Type de question non supporté: {currentQuestion.type}
            </p>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Debug: {JSON.stringify(currentQuestion)}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col justify-center px-6 py-8`}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Question {currentQuestionIndex + 1} sur {ENHANCED_QUESTIONS.length}
          </div>
          <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
            {Math.round(((currentQuestionIndex + 1) / ENHANCED_QUESTIONS.length) * 100)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`h-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-200'} rounded-full overflow-hidden`}>
          <div
            className="h-full pluqla-btn-primary transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / ENHANCED_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {/* Question Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">{currentQuestion.emoji}</div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
            {currentQuestion.question}
          </h2>
        </div>

        {/* Question Input */}
        <div className="mb-8">
          {renderQuestionContent()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mt-auto">
        <button
          onClick={previousQuestion}
          className={`flex-1 py-3 ${darkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-black hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          ← {currentQuestionIndex === 0 ? 'Retour' : 'Précédent'}
        </button>

        {currentQuestion.type !== 'select' && currentQuestion.type !== 'multi_select' && (
          <button
            onClick={() => nextQuestion()}
            disabled={!answers[currentQuestion.id]}
            className={`flex-1 py-3 rounded-xl transition-colors ${
              answers[currentQuestion.id]
                ? 'pluqla-btn-primary text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLastQuestion ? 'Terminer' : 'Suivant'} →
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalizationScreen;