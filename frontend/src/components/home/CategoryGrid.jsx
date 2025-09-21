import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const CategoryGrid = ({ darkMode }) => {
  const { setCurrentScreen } = useNavigation();
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => setCurrentScreen('activite')}
        className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4 text-left transition-all active:scale-[0.98] relative`}
      >
        <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">3</span>
        </div>
        <div className={`w-10 h-10 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-xl flex items-center justify-center mb-2`}>
          <span className="text-xl">🎭</span>
        </div>
        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Activité</p>
        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Nouveautés IA</p>
      </button>

      <button
        onClick={() => setCurrentScreen('habits')}
        className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4 text-left transition-all active:scale-[0.98]`}
      >
        <div className={`w-10 h-10 ${darkMode ? 'bg-pink-900/30' : 'bg-pink-100'} rounded-xl flex items-center justify-center mb-2`}>
          <span className="text-xl">👕</span>
        </div>
        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Habits</p>
        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Mode durable</p>
      </button>

      <button
        onClick={() => setCurrentScreen('deplacement')}
        className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4 text-left transition-all active:scale-[0.98]`}
      >
        <div className={`w-10 h-10 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-xl flex items-center justify-center mb-2`}>
          <span className="text-xl">🚗</span>
        </div>
        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Déplacement</p>
        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Trajets éco</p>
      </button>

      <button
        onClick={() => setCurrentScreen('alimentation')}
        className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4 text-left transition-all active:scale-[0.98] relative`}
      >
        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-white text-[9px] font-bold">5</span>
        </div>
        <div className={`w-10 h-10 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'} rounded-xl flex items-center justify-center mb-2`}>
          <span className="text-xl">🍕</span>
        </div>
        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Alimentation</p>
        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Batch cooking</p>
      </button>
    </div>
  );
};

export default CategoryGrid;