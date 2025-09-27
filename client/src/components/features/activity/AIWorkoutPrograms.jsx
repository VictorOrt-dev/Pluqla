import React from 'react';

const AIWorkoutPrograms = ({ darkMode, aiSuggestions = [], isLoading = false }) => {

  // Programmes d'entraînement générés par IA avec structure complète
  const aiPrograms = [
    {
      id: 1,
      name: "Programme Force IA",
      description: "Programme personnalisé basé sur vos objectifs de force",
      difficulty: "Intermédiaire",
      duration: "12 semaines",
      frequency: "4x/semaine",
      focus: "Force & Puissance",
      icon: "💪",
      sessions: [
        { day: "Lundi", focus: "Haut du corps", duration: "60min", exercises: 8 },
        { day: "Mercredi", focus: "Bas du corps", duration: "45min", exercises: 6 },
        { day: "Vendredi", focus: "Full body", duration: "75min", exercises: 10 },
        { day: "Samedi", focus: "Cardio force", duration: "30min", exercises: 5 }
      ],
      benefits: ["Gain de force", "Masse musculaire", "Endurance"],
      equipment: "Salle de sport complète",
      isAI: true
    },
    {
      id: 2,
      name: "HIIT Métabolique IA",
      description: "Entraînement haute intensité adapté à votre condition physique",
      difficulty: "Avancé",
      duration: "8 semaines",
      frequency: "5x/semaine",
      focus: "Cardio & Métabolisme",
      icon: "🔥",
      sessions: [
        { day: "Lundi", focus: "HIIT Upper", duration: "25min", exercises: 6 },
        { day: "Mardi", focus: "HIIT Lower", duration: "30min", exercises: 8 },
        { day: "Mercredi", focus: "Core HIIT", duration: "20min", exercises: 5 },
        { day: "Jeudi", focus: "Full HIIT", duration: "35min", exercises: 10 },
        { day: "Vendredi", focus: "Recovery HIIT", duration: "15min", exercises: 4 }
      ],
      benefits: ["Brûlage de graisse", "Condition cardio", "Métabolisme"],
      equipment: "Poids du corps + kettlebells",
      isAI: true
    },
    {
      id: 3,
      name: "Mobilité & Récupération IA",
      description: "Programme de récupération active personnalisé",
      difficulty: "Débutant",
      duration: "6 semaines",
      frequency: "3x/semaine",
      focus: "Mobilité & Bien-être",
      icon: "🧘",
      sessions: [
        { day: "Lundi", focus: "Mobilité générale", duration: "40min", exercises: 12 },
        { day: "Mercredi", focus: "Étirements profonds", duration: "35min", exercises: 8 },
        { day: "Vendredi", focus: "Yoga réparateur", duration: "50min", exercises: 15 }
      ],
      benefits: ["Flexibilité", "Récupération", "Bien-être"],
      equipment: "Tapis de yoga + élastiques",
      isAI: true
    }
  ];

  // Combiner avec les suggestions IA de l'API si disponibles
  const combinedPrograms = [
    ...aiSuggestions.map(suggestion => ({
      ...suggestion,
      isAI: true,
      isFromAPI: true
    })),
    ...aiPrograms
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
    // Ici on pourrait intégrer avec l'API pour sauvegarder le programme choisi
    console.log('Démarrage programme IA:', program);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-gradient-to-r from-indigo-500 to-red-600 rounded-xl">
          <span className="text-white text-lg">🤖</span>
        </div>
        <div>
          <h3 className={`text-xl font-bold bg-gradient-to-r ${
            darkMode
              ? 'from-white via-gray-200 to-gray-300'
              : 'from-gray-900 via-gray-700 to-gray-600'
          } bg-clip-text text-transparent`}>
            Programmes d'entraînement IA
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isLoading ? 'Génération de programmes personnalisés...' : `${combinedPrograms.length} programmes disponibles`}
          </p>
        </div>
      </div>

      {/* Loading State */}
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
                Création de programmes personnalisés...
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                L'IA analyse votre profil et vos objectifs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Programs Grid */}
      <div className="space-y-4">
        {combinedPrograms.map((program, index) => (
          <div
            key={program.id || index}
            className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
              darkMode
                ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
                : 'bg-white/70 border-gray-200/60 shadow-md'
            } ${program.isFromAPI ? 'ring-2 ring-emerald-500/25 shadow-emerald-500/10' : 'ring-2 ring-indigo-500/25 shadow-indigo-500/10'}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 rounded-3xl ${
              program.isFromAPI
                ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5'
                : 'bg-gradient-to-br from-indigo-500/5 to-red-500/5'
            }`}></div>

            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-start space-x-4">
                <div className={`p-3 bg-gradient-to-r ${
                  program.isFromAPI
                    ? 'from-emerald-500 to-teal-600'
                    : 'from-indigo-500 to-red-600'
                } rounded-2xl shadow-lg`}>
                  <span className="text-white text-2xl">{program.icon || '🤖'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-lg font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {program.name || program.title}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          program.isFromAPI
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                            : 'bg-gradient-to-r from-indigo-500 to-red-600 text-white'
                        }`}>
                          {program.isFromAPI ? '🌐 API IA' : '🤖 IA Générée'}
                        </span>
                        {program.difficulty && (
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getDifficultyColor(program.difficulty)}`}>
                            {program.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 leading-relaxed`}>
                    {program.description}
                  </p>

                  {/* Program Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { value: program.duration, label: 'Durée', icon: '📅' },
                      { value: program.frequency, label: 'Fréquence', icon: '🔄' },
                      { value: program.focus, label: 'Focus', icon: '🎯' },
                      { value: program.equipment, label: 'Équipement', icon: '🏋️' }
                    ].filter(item => item.value).map((detail, idx) => (
                      <div
                        key={idx}
                        className={`p-3 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
                          darkMode
                            ? 'bg-gray-800/60 border-gray-600/40 hover:bg-gray-700/70'
                            : 'bg-white/80 border-gray-200/60 hover:bg-white/90'
                        } shadow-md hover:shadow-lg`}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{detail.icon}</div>
                          <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {detail.value}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {detail.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sessions Preview */}
                  {program.sessions && (
                    <div className={`p-4 backdrop-blur-sm rounded-2xl border mb-4 ${
                      darkMode
                        ? 'bg-gradient-to-r from-indigo-900/30 to-red-900/30 border-indigo-700/50'
                        : 'bg-gradient-to-r from-indigo-50/80 to-red-50/80 border-indigo-200/60'
                    } shadow-lg`}>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-lg">📋</span>
                        <span className={`text-sm font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                          Planning de la semaine
                        </span>
                      </div>
                      <div className="space-y-2">
                        {program.sessions.slice(0, 3).map((session, sessionIdx) => (
                          <div key={sessionIdx} className="flex justify-between items-center">
                            <span className={`text-xs font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                              {session.day}: {session.focus}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-indigo-300' : 'text-indigo-500'}`}>
                              {session.duration}
                            </span>
                          </div>
                        ))}
                        {program.sessions.length > 3 && (
                          <div className={`text-xs text-center ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            +{program.sessions.length - 3} autres séances
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {program.benefits && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {program.benefits.map((benefit, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-3 py-1.5 rounded-full border ${
                            darkMode
                              ? 'bg-gray-800/60 border-gray-600/40 text-gray-300'
                              : 'bg-white/80 border-gray-200/60 text-gray-700'
                          } shadow-md`}
                        >
                          ✨ {benefit}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleStartProgram(program)}
                    className={`group w-full sm:w-auto sm:px-8 py-3 bg-gradient-to-r ${
                      program.isFromAPI
                        ? 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                        : 'from-indigo-500 to-red-600 hover:from-indigo-600 hover:to-red-700'
                    } text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg">🚀</span>
                      <span>Démarrer le programme</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {combinedPrograms.length === 0 && !isLoading && (
        <div className={`group relative p-12 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-red-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-6">
            <div className="relative">
              <div className="text-8xl animate-bounce">🤖</div>
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-red-500/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Génération de programmes en cours
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                L'IA crée des programmes personnalisés selon votre profil
              </p>
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-red-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:from-indigo-600 hover:to-red-700 shadow-lg hover:shadow-xl">
              🔄 Générer des programmes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIWorkoutPrograms;