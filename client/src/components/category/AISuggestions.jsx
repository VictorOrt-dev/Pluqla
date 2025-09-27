// ==================== src/components/category/AISuggestions.jsx ====================
import React, { useState } from 'react';

const AISuggestions = ({
  aiSuggestions = [], // Valeur par défaut sécurisée
  isLoading = false,
  error = null,
  darkMode,
  userData,
  setUserData,
  onUsePlan, // Renommé de usePlan vers onUsePlan
  category
}) => {
  const [expandedPlan, setExpandedPlan] = useState(null);

  // Gestion de l'état de chargement
  if (isLoading) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl mb-4">🤖</div>
        <div className="animate-pulse">
          <div className="text-lg font-medium mb-2">Génération IA en cours...</div>
          <div className="text-sm">Analyse de votre profil pour des suggestions personnalisées</div>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-lg font-medium mb-2 text-red-500">Erreur de chargement</div>
        <div className="text-sm">{error}</div>
        <div className="text-xs mt-4 opacity-70">
          Utilisation des suggestions locales en cours...
        </div>
      </div>
    );
  }

  // Sécuriser aiSuggestions pour s'assurer que c'est un tableau
  const safeSuggestions = Array.isArray(aiSuggestions) ? aiSuggestions : [];

  // Gestion du cas où il n'y a pas de suggestions
  if (safeSuggestions.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl mb-4">🤖</div>
        <div className="text-lg font-medium mb-2">Aucune suggestion disponible</div>
        <div className="text-sm">L'IA n'a pas encore généré de suggestions pour cette catégorie</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          🤖 SUGGESTIONS IA POUR TOI
        </h3>
        <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-red-800'}`}>
          Basé sur ton profil
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {safeSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`${darkMode ? 'bg-gradient-to-r from-red-900/20 to-pink-900/20 border-red-800' : 'bg-gradient-to-r from-red-50 to-pink-50 border-orange-200'} border rounded-2xl overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                      {suggestion.title}
                    </h3>
                    {suggestion.badge && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-bold rounded-full">
                        {suggestion.badge}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {suggestion.reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-500">{suggestion.savings}</p>
                  <p className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Score: {suggestion.score}/100
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!userData.isPremium && userData.plansUsedThisMonth >= 5 ? (
                  <button 
                    onClick={() => setUserData(prev => ({ ...prev, isPremium: true }))}
                    className="flex-1 py-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 rounded-xl text-xs font-medium"
                  >
                    🔒 Débloquer (Premium)
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => onUsePlan(suggestion, category)} // Changé usePlan vers onUsePlan
                      className="flex-1 py-2 pluqla-btn-primary text-white rounded-xl text-xs font-medium transition-all active:scale-95"
                    >
                      Utiliser maintenant
                    </button>
                    <button 
                      onClick={() => setExpandedPlan(expandedPlan === suggestion.id ? null : suggestion.id)}
                      className={`py-2 px-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl`}
                    >
                      {expandedPlan === suggestion.id ? '−' : '+'}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {expandedPlan === suggestion.id && (
              <div className={`px-4 pb-4 ${darkMode ? 'bg-black/30' : 'bg-white/30'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cette suggestion est générée par notre IA basée sur ton profil.
                  En l'utilisant, tu contribues à améliorer les recommandations futures.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default AISuggestions;