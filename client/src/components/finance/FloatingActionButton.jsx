/**
 * Floating Action Button (FAB) - Mobile-First Financial Dashboard
 * Always accessible button for adding transactions, income, or transfers
 * Expandable menu with smooth animations
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

const FloatingActionButton = ({ onAction, darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      id: 'transaction',
      label: 'Transaction',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-[#F14545] to-[#FF6B6B]',
    },
    {
      id: 'income',
      label: 'Revenu',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'from-[#10B981] to-[#059669]',
    },
    {
      id: 'transfer',
      label: 'Transfert',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: 'from-[#3B82F6] to-[#1D4ED8]',
    },
  ];

  const handleActionClick = (actionId) => {
    onAction(actionId);
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end space-y-3">
        {/* Action buttons - shown when expanded */}
        {isExpanded && (
          <div className="flex flex-col items-end space-y-3 animate-scale-in">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center space-x-3 animate-slide-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <span
                  className={`px-3 py-2 rounded-xl text-sm font-semibold shadow-lg ${
                    darkMode
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {action.label}
                </span>
                <button
                  onClick={() => handleActionClick(action.id)}
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center`}
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center ${
            isExpanded ? 'rotate-45' : ''
          }`}
          style={{
            boxShadow: '0 12px 48px rgba(241, 69, 69, 0.35)',
          }}
        >
          <svg
            className="w-8 h-8 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
};

FloatingActionButton.propTypes = {
  onAction: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

FloatingActionButton.defaultProps = {
  darkMode: false,
};

export default FloatingActionButton;
