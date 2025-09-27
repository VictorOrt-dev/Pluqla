import React from 'react';

const PremiumBanner = ({ userData, setUserData, darkMode }) => {
  if (userData.isPremium || userData.plansUsedThisMonth < 3) return null;

  return (
    <div className="mt-4 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            Plus que {5 - userData.plansUsedThisMonth} bons plans
          </p>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Passez Premium pour illimité
          </p>
        </div>
        <button 
          onClick={() => setUserData(prev => ({ ...prev, isPremium: true }))}
          className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-semibold rounded-full"
        >
          3€/mois
        </button>
      </div>
    </div>
  );
};

export default PremiumBanner;