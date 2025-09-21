import React from 'react';

const Navigation = ({ darkMode, userData }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-black/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur-xl border-t`}>
      <div className="flex justify-around items-center py-2">
        <button className="py-2 px-3 flex flex-col items-center">
          <span className="text-xl mb-1">🏠</span>
          <span className="text-[10px] text-blue-500">Accueil</span>
        </button>
        <button className="py-2 px-3 flex flex-col items-center">
          <span className="text-xl mb-1 opacity-50">📊</span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stats</span>
        </button>
        <button className="py-2 px-3 flex flex-col items-center relative">
          <span className="text-xl mb-1 opacity-50">🏆</span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Récompenses</span>
          {userData.level > 2 && (
            <div className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
          )}
        </button>
        <button className="py-2 px-3 flex flex-col items-center">
          <span className="text-xl mb-1 opacity-50">👤</span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profil</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;