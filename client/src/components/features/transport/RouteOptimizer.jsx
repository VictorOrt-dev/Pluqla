import React, { useState } from 'react';
import { useTransport } from '../../../hooks/useTransport';

const RouteOptimizer = ({ darkMode }) => {
  const { routes, getBestRouteOption, preferences, updatePreferences } = useTransport();
  const [selectedCriteria, setSelectedCriteria] = useState(preferences.criteria);

  const handleCriteriaChange = (newCriteria) => {
    setSelectedCriteria(newCriteria);
    updatePreferences({ criteria: newCriteria });
  };

  const criteriaOptions = [
    { key: 'cost', label: 'Prix', icon: '💰', description: 'Option la moins chère' },
    { key: 'time', label: 'Temps', icon: '⏱️', description: 'Option la plus rapide' },
    { key: 'eco', label: 'Écolo', icon: '🌱', description: 'Option la moins polluante' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
          🎯 Optimisation des trajets
        </h3>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          {criteriaOptions.map(criteria => (
            <button
              key={criteria.key}
              onClick={() => handleCriteriaChange(criteria.key)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedCriteria === criteria.key
                  ? 'border-red-500 bg-red-500/10'
                  : darkMode 
                    ? 'border-gray-700 bg-gray-900'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-2xl mb-1">{criteria.icon}</div>
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                {criteria.label}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {criteria.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
          Recommandations optimisées
        </h4>
        
        <div className="space-y-3">
          {routes.map(route => {
            const bestOption = getBestRouteOption(route);
            const savings = route.options.reduce((max, option) => 
              Math.max(max, option.cost), 0) - bestOption.cost;
            
            return (
              <div 
                key={route.id}
                className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {route.name}
                    </h5>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Meilleur choix: {bestOption.description}
                    </p>
                  </div>
                  {savings > 0 && (
                    <div className="text-right">
                      <p className="text-green-500 font-bold">-{savings.toFixed(2)}€</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        vs plus cher
                      </p>
                    </div>
                  )}
                </div>
                
                <div className={`flex items-center gap-4 p-3 ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} rounded-xl`}>
                  <div className="text-2xl">
                    {bestOption.type === 'car' ? '🚗' : 
                     bestOption.type === 'public' ? '🚌' : 
                     bestOption.type === 'bike' ? '🚴' : 
                     bestOption.type === 'tram' ? '🚊' : '🛴'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {bestOption.cost.toFixed(2)}€
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {bestOption.duration} min
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {bestOption.co2}g CO2
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;