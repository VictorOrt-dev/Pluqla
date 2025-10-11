import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const QuickActions = ({ darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  const actions = [
    {
      id: 'add-transaction',
      icon: '💸',
      label: 'Ajouter',
      sublabel: 'Transaction',
      action: () => setCurrentScreen('finance'),
      gradient: 'from-[#F14545] to-[#FF6B6B]'
    },
    {
      id: 'ai-advice',
      icon: '🤖',
      label: 'Conseil',
      sublabel: 'IA',
      action: () => setCurrentScreen('finance'),
      gradient: 'from-[#FF6B6B] to-[#FFA07A]'
    },
    {
      id: 'challenge',
      icon: '🎯',
      label: 'Challenge',
      sublabel: 'du jour',
      action: () => setCurrentScreen('finance'),
      gradient: 'from-[#FFA07A] to-[#FFB499]'
    }
  ];

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`relative p-3 rounded-xl transition-all duration-300 overflow-hidden group ${
              darkMode
                ? 'bg-gray-800/60 hover:bg-gray-800/80 border border-white/10 hover:border-[#F14545]/50'
                : 'bg-white/90 hover:bg-white border border-gray-200 hover:border-[#F14545]/40 shadow-sm hover:shadow-md'
            }`}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${action.gradient}`}></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center space-y-1">
              <div className={`text-2xl transition-transform duration-300 group-hover:scale-110`}>
                {action.icon}
              </div>
              <div className="text-center">
                <div className={`text-xs font-bold leading-tight ${
                  darkMode ? 'text-white' : 'text-[#121212]'
                }`}>
                  {action.label}
                </div>
                <div className={`text-[10px] ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {action.sublabel}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
