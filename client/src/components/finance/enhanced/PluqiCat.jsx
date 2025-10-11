/**
 * PluqiCat - Mascotte Pluqla (Chat Rouge)
 * Expressions: happy, celebrate, thinking, careful, money
 * Animations personnalisées + messages contextuels
 */

import React from 'react';
import PropTypes from 'prop-types';

const PluqiCat = ({ expression = 'happy', message, userName = 'toi', darkMode = false }) => {
  // 🎨 Illustrations du chat selon l'expression
  const catIllustrations = {
    happy: (
      <div className="w-20 h-20 bg-gradient-to-br from-[#FF5757] to-[#FF8A80] rounded-full flex items-center justify-center shadow-2xl animate-float">
        <div className="text-4xl">😊</div>
      </div>
    ),
    celebrate: (
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 bg-gradient-to-br from-[#FF5757] to-[#FF8A80] rounded-full flex items-center justify-center shadow-2xl animate-bounce-celebration overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scale(1.2)' }}
          >
            <source src="/Pluqi speek.mp4" type="video/mp4" />
          </video>
        </div>
        {/* Confetti particles */}
        <div className="absolute -top-2 -left-2 text-2xl animate-confetti">✨</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-confetti" style={{ animationDelay: '0.2s' }}>🎊</div>
        <div className="absolute -bottom-2 left-1/2 text-2xl animate-confetti" style={{ animationDelay: '0.4s' }}>⭐</div>
      </div>
    ),
    thinking: (
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 bg-gradient-to-br from-[#FF5757] to-[#FF8A80] rounded-full flex items-center justify-center shadow-2xl animate-thinking">
          <div className="text-4xl">🤔</div>
        </div>
        {/* Thought bubbles */}
        <div className="absolute -top-6 -right-6 w-8 h-8 bg-white rounded-full shadow-lg animate-ping-slow flex items-center justify-center">
          <div className="text-xl">💭</div>
        </div>
      </div>
    ),
    careful: (
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 bg-gradient-to-br from-[#FFA726] to-[#FF9800] rounded-full flex items-center justify-center shadow-2xl animate-shake">
          <div className="text-4xl">😬</div>
        </div>
        {/* Warning indicator */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full shadow-lg flex items-center justify-center animate-ping-slow">
          <div className="text-xs">⚠️</div>
        </div>
      </div>
    ),
    money: (
      <div className="w-20 h-20 bg-gradient-to-br from-[#4CAF50] to-[#66BB6A] rounded-full flex items-center justify-center shadow-2xl animate-spin-slow">
        <div className="text-4xl">💰</div>
      </div>
    ),
  };

  // 💬 Messages par défaut si non fourni
  const defaultMessages = {
    happy: `Super ${userName} ! Tes finances sont au top ! 🎯`,
    celebrate: `Bravo ${userName} ! Tu as dépassé ton objectif ! 🎉`,
    thinking: `Hmm... ${userName}, je réfléchis à comment optimiser ça... 🤔`,
    careful: `Attention ${userName}... Tes dépenses augmentent ! ⚠️`,
    money: `Génial ${userName} ! Tes économies progressent ! 💰`,
  };

  const displayMessage = message || defaultMessages[expression];

  return (
    <div className="flex items-start space-x-4 p-4">
      {/* Chat Pluqi avec expression */}
      <div className="flex-shrink-0">
        {catIllustrations[expression]}
      </div>

      {/* Bulle de dialogue - HomeScreen DA */}
      <div className="flex-1 relative">
        <div className="relative">
          {/* Premium hover glow overlay */}
          <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
            darkMode
              ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
              : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
          }`}></div>

          <div
            className={`relative rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-all duration-300 border group ${
              darkMode
                ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50'
                : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40'
            }`}
          >
            {/* Triangle pointer vers le chat */}
            <div
              className={`absolute left-0 top-4 w-0 h-0 -ml-2 border-t-8 border-b-8 border-r-8 ${
                darkMode
                  ? 'border-transparent border-r-gray-900/90'
                  : 'border-transparent border-r-white/98'
              }`}
            />

            <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
              {displayMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

PluqiCat.propTypes = {
  expression: PropTypes.oneOf(['happy', 'celebrate', 'thinking', 'careful', 'money']),
  message: PropTypes.string,
  userName: PropTypes.string,
  darkMode: PropTypes.bool,
};

export default PluqiCat;
