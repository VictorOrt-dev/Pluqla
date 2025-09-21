import React from 'react';

const StandardDeals = ({ category, darkMode, showNotification, addTransaction }) => {
  const renderAlimentationDeals = () => (
    <>
      <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
              Batch Cooking Semaine
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                👥 4 pers
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ⱖ️ 2h dimanche
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-green-500">2,80€</p>
            <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/repas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} rounded-full text-[10px] font-medium`}>
            Gain de temps
          </span>
          <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-[10px] font-bold">
            +25 pts
          </span>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
              Anti-gaspi du jour
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                🏪 Carrefour 500m
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ⏰ 18h-19h
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-green-500">-50%</p>
            <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>sur frais</p>
          </div>
        </div>
        <button 
          onClick={() => {
            showNotification('Direction Carrefour ! GPS activé', 'success');
            addTransaction(15, 'alimentation', 'Anti-gaspi Carrefour');
          }}
          className="w-full py-2 bg-green-500 text-white rounded-xl text-xs font-medium"
        >
          Y aller maintenant
        </button>
      </div>
    </>
  );

  const renderHabitsDeals = () => (
    <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            Vente privée H&M
          </h3>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Accès exclusif +Clair
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-green-500">-40%</p>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Extra</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className={`px-2 py-1 ${darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-700'} rounded-full text-[10px] font-medium`}>
            24h restantes
          </span>
        </div>
        <button 
          onClick={() => {
            showNotification('Code promo copié: CLAIR40', 'success');
            addTransaction(30, 'habits', 'Vente privée H&M');
          }}
          className="text-blue-500 text-xs font-medium"
        >
          Obtenir le code →
        </button>
      </div>
    </div>
  );

  return (
    <>
      <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
        BONS PLANS VÉRIFIÉS
      </h3>
      
      <div className="space-y-3">
        {category === 'alimentation' && renderAlimentationDeals()}
        {category === 'habits' && renderHabitsDeals()}
      </div>
    </>
  );
};

export default StandardDeals;