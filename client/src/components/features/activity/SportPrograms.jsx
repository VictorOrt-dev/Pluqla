import React, { useState } from 'react';

const SportPrograms = ({
  darkMode,
  aiSuggestions = [],
  isLoading = false,
  error = null,
  userData,
  setUserData,
  onUsePlan,
  category
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  // Programmes sportifs prédéfinis avec suggestions IA
  const sportPrograms = [
    // Musculation
    {
      id: 1,
      type: 'musculation',
      title: 'Programme Débutant Musculation',
      description: 'Plan d\'entraînement 3 fois/semaine pour débuter la musculation',
      duration: '8 semaines',
      frequency: '3x/semaine',
      difficulty: 'Débutant',
      icon: '💪',
      objectives: ['Force', 'Masse musculaire', 'Technique'],
      equipment: 'Salle de sport',
      isAI: true
    },
    {
      id: 2,
      type: 'musculation',
      title: 'Push/Pull/Legs Intermédiaire',
      description: 'Programme avancé en split pour développement musculaire optimal',
      duration: '12 semaines',
      frequency: '6x/semaine',
      difficulty: 'Intermédiaire',
      icon: '🏋️‍♂️',
      objectives: ['Hypertrophie', 'Force', 'Définition'],
      equipment: 'Salle de sport',
      isAI: true
    },
    // Cardio & Endurance
    {
      id: 3,
      type: 'cardio',
      title: 'Préparation Marathon',
      description: 'Plan progressif pour courir votre premier marathon en 16 semaines',
      duration: '16 semaines',
      frequency: '4-5x/semaine',
      difficulty: 'Intermédiaire',
      icon: '🏃‍♂️',
      objectives: ['Endurance', 'Vitesse', 'Mental'],
      equipment: 'Chaussures de course',
      isAI: true
    },
    {
      id: 4,
      type: 'cardio',
      title: 'HIIT Brûle Graisse',
      description: 'Entraînements courts et intenses pour perdre du poids efficacement',
      duration: '6 semaines',
      frequency: '3x/semaine',
      difficulty: 'Tous niveaux',
      icon: '🔥',
      objectives: ['Perte de poids', 'Conditionnement', 'Métabolisme'],
      equipment: 'Poids du corps',
      isAI: true
    },
    // Fitness général
    {
      id: 5,
      type: 'fitness',
      title: 'Remise en Forme Express',
      description: 'Programme complet pour retrouver la forme en 30 jours',
      duration: '4 semaines',
      frequency: '5x/semaine',
      difficulty: 'Débutant',
      icon: '⚡',
      objectives: ['Forme générale', 'Énergie', 'Habitudes'],
      equipment: 'Minimal',
      isAI: true
    },
    {
      id: 6,
      type: 'flexibility',
      title: 'Yoga & Mobilité',
      description: 'Améliorer flexibilité, équilibre et bien-être mental',
      duration: '8 semaines',
      frequency: '4x/semaine',
      difficulty: 'Tous niveaux',
      icon: '🧘‍♀️',
      objectives: ['Flexibilité', 'Relaxation', 'Posture'],
      equipment: 'Tapis de yoga',
      isAI: true
    },
    // Sports spécifiques
    {
      id: 7,
      type: 'sports',
      title: 'Préparation Physique Football',
      description: 'Conditionnement spécifique pour améliorer vos performances au football',
      duration: '10 semaines',
      frequency: '3x/semaine',
      difficulty: 'Intermédiaire',
      icon: '⚽',
      objectives: ['Agilité', 'Explosivité', 'Endurance'],
      equipment: 'Terrain + matériel',
      isAI: true
    },
    {
      id: 8,
      type: 'sports',
      title: 'Tennis Performance',
      description: 'Entraînement physique adapté aux exigences du tennis',
      duration: '12 semaines',
      frequency: '4x/semaine',
      difficulty: 'Avancé',
      icon: '🎾',
      objectives: ['Puissance', 'Réactivité', 'Résistance'],
      equipment: 'Salle + terrain',
      isAI: true
    }
  ];

  const categories = [
    { key: 'all', label: 'Tout', icon: '🎯' },
    { key: 'musculation', label: 'Musculation', icon: '💪' },
    { key: 'cardio', label: 'Cardio', icon: '🏃‍♂️' },
    { key: 'fitness', label: 'Fitness', icon: '⚡' },
    { key: 'flexibility', label: 'Flexibilité', icon: '🧘‍♀️' },
    { key: 'sports', label: 'Sports', icon: '⚽' }
  ];

  const filteredPrograms = sportPrograms.filter(program =>
    activeCategory === 'all' || program.type === activeCategory
  );

  // Combiner avec les suggestions IA si disponibles
  const combinedPrograms = [
    ...aiSuggestions.map(suggestion => ({
      ...suggestion,
      isAI: true,
      isFromAPI: true
    })),
    ...filteredPrograms
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Débutant': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'Intermédiaire': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      case 'Avancé': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-red-600 bg-blue-100 dark:bg-blue-900/20 dark:text-red-400';
    }
  };

  const handleStartProgram = (program) => {
    if (onUsePlan) {
      onUsePlan(program, category);
    }
    console.log('Démarrage programme:', program);
  };

  return (
    <div className="space-y-6">
      {/* Filtres par catégorie - Glassmorphism */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-r from-indigo-500 to-red-600 rounded-xl">
            <span className="text-white text-lg">🏆</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${
              darkMode
                ? 'from-white via-gray-200 to-gray-300'
                : 'from-gray-900 via-gray-700 to-gray-600'
            } bg-clip-text text-transparent`}>
              Programmes d'entraînement
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choisissez votre discipline
            </p>
          </div>
        </div>

        <div className={`p-3 backdrop-blur-xl rounded-2xl border ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="flex space-x-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map((cat, idx) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`group relative flex items-center space-x-2 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 min-w-fit hover:scale-105 ${
                  activeCategory === cat.key
                    ? 'bg-gradient-to-r from-indigo-500 to-red-600 text-white shadow-lg shadow-indigo-500/25'
                    : darkMode
                      ? 'bg-gray-800/60 border border-gray-600/40 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500/60'
                      : 'bg-white/80 border border-gray-200/60 text-gray-700 hover:bg-white/90 hover:border-gray-300/80'
                } shadow-md hover:shadow-lg`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>

                {/* Active indicator */}
                {activeCategory === cat.key && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-lg"></div>
                )}

                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* États de chargement et erreur - Glassmorphism */}
      {isLoading && (
        <div className={`group relative p-8 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-red-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-4">
            <div className="relative">
              <div className="animate-spin w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-red-500/20 border-r-red-500 rounded-full mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Chargement des programmes IA...
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Personnalisation en cours
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-red-900/40 border-red-700/50 shadow-lg'
            : 'bg-red-50/80 border-red-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 rounded-3xl"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
              <span className="text-white text-lg">⚠️</span>
            </div>
            <div>
              <p className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                Erreur de chargement
              </p>
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des programmes - Glassmorphism */}
      <div className="space-y-4">
        {combinedPrograms.map((program, index) => (
          <div
            key={program.id || index}
            className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
              darkMode
                ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
                : 'bg-white/70 border-gray-200/60 shadow-md'
            } ${program.isFromAPI ? 'ring-2 ring-emerald-500/25 shadow-emerald-500/10' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient overlay based on program type */}
            <div className={`absolute inset-0 rounded-3xl ${
              program.type === 'musculation'
                ? 'bg-gradient-to-br from-blue-500/5 to-indigo-500/5'
                : program.type === 'cardio'
                  ? 'bg-gradient-to-br from-red-500/5 to-orange-500/5'
                  : program.type === 'fitness'
                    ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5'
                    : program.type === 'flexibility'
                      ? 'bg-gradient-to-br from-red-500/5 to-orange-500/5'
                      : 'bg-gradient-to-br from-yellow-500/5 to-orange-500/5'
            }`}></div>

            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-red-600 rounded-2xl shadow-lg">
                  <span className="text-white text-2xl">{program.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-lg leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {program.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {program.isAI && (
                          <span className="text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1 rounded-full font-semibold">
                            🤖 IA {program.isFromAPI ? 'API' : 'Optimisé'}
                          </span>
                        )}
                        {program.difficulty && (
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getDifficultyColor(program.difficulty)}`}>
                            {program.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2 leading-relaxed`}>
                    {program.description}
                  </p>
                </div>
              </div>

              {/* Détails du programme */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: program.duration, label: 'Durée', icon: '⏱️' },
                  { value: program.frequency, label: 'Fréquence', icon: '📅' },
                  { value: program.equipment, label: 'Équipement', icon: '🏋️' }
                ].filter(item => item.value).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
                      darkMode
                        ? 'bg-gray-800/60 border-gray-600/40 hover:bg-gray-700/70'
                        : 'bg-white/80 border-gray-200/60 hover:bg-white/90'
                    } shadow-md hover:shadow-lg`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.value}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Objectifs */}
              {program.objectives && program.objectives.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    🎯 Objectifs :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {program.objectives.map((objective, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-3 py-1.5 rounded-full border ${
                          darkMode
                            ? 'bg-gray-800/60 border-gray-600/40 text-gray-300'
                            : 'bg-white/80 border-gray-200/60 text-gray-700'
                        } shadow-md`}
                      >
                        {objective}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton d'action */}
              <button
                onClick={() => handleStartProgram(program)}
                className="group w-full sm:w-auto sm:px-8 py-3 bg-gradient-to-r from-indigo-500 to-red-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:from-indigo-600 hover:to-red-700 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🚀</span>
                  <span>Commencer le programme</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {combinedPrograms.length === 0 && !isLoading && (
        <div className={`group relative p-12 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-red-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-6">
            <div className="relative">
              <div className="text-8xl animate-bounce">💪</div>
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-red-500/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Aucun programme trouvé
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Essayez une autre catégorie ou consultez nos recommandations personnalisées
              </p>
            </div>
            <button
              onClick={() => setActiveCategory('all')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-red-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:from-indigo-600 hover:to-red-700 shadow-lg hover:shadow-xl"
            >
              🔄 Voir tous les programmes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SportPrograms;