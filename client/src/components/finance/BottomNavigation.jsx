/**
 * Bottom Navigation - Mobile-First Financial Dashboard
 * Provides quick access to Dashboard, Transactions, Budgets, and Settings
 * Sticky bottom navigation with glassmorphism effect
 */

import React from 'react';
import PropTypes from 'prop-types';

const BottomNavigation = ({ activeTab, onTabChange, darkMode }) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t transition-all duration-300 ${
        darkMode
          ? 'bg-slate-900/95 backdrop-blur-xl border-slate-800'
          : 'bg-white/95 backdrop-blur-xl border-gray-200'
      }`}
      style={{
        boxShadow: darkMode
          ? '0 -4px 24px rgba(0, 0, 0, 0.4)'
          : '0 -4px 24px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 rounded-2xl transition-all duration-300 touch-manipulation ${
              activeTab === tab.id
                ? darkMode
                  ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white scale-105'
                  : 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white scale-105'
                : darkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
            style={{
              minHeight: '64px',
            }}
          >
            <div
              className={`transition-transform duration-300 ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}
            >
              {tab.icon}
            </div>
            <span
              className={`text-xs font-semibold mt-1 transition-all duration-300 ${
                activeTab === tab.id ? 'opacity-100' : 'opacity-70'
              }`}
            >
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

BottomNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

BottomNavigation.defaultProps = {
  darkMode: false,
};

export default BottomNavigation;
