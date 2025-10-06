/**
 * EditableBalance - Tap to Edit Account Balance
 * Simple, clean, Money Manager style
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const EditableBalance = ({ darkMode }) => {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('pluqla_balance');
    return saved ? parseFloat(saved) : 3540;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    localStorage.setItem('pluqla_balance', balance.toString());
  }, [balance]);

  const handleEdit = () => {
    setInputValue(balance.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const newBalance = parseFloat(inputValue);
    if (!isNaN(newBalance) && newBalance >= 0) {
      setBalance(newBalance);
      setIsEditing(false);
      // Haptic feedback
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(20);
      }
    } else {
      alert('Montant invalide');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`mx-4 mt-4 mb-4 p-6 rounded-3xl backdrop-blur-xl border transition-all ${
      darkMode
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-white/70 border-gray-200'
    } shadow-lg`}>
      <p className={`text-sm font-medium mb-2 ${
        darkMode ? 'text-slate-400' : 'text-gray-600'
      }`}>
        Ce que j'ai sur mon compte
      </p>

      {!isEditing ? (
        <button
          onClick={handleEdit}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex-1">
            <p className="text-4xl font-black bg-gradient-to-br from-[#F14545] to-[#FF6B6B] bg-clip-text text-transparent">
              {formatCurrency(balance)}
            </p>
          </div>
          <svg
            className={`w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity ${
              darkMode ? 'text-slate-400' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              className={`w-full text-3xl font-bold py-3 px-4 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-[#F14545]/50 ${
                darkMode
                  ? 'bg-slate-900 text-white border-slate-600'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${
              darkMode ? 'text-slate-500' : 'text-gray-400'
            }`}>
              €
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-br from-[#F14545] to-[#FF6B6B] hover:shadow-lg transition-all"
            >
              ✓ Enregistrer
            </button>
            <button
              onClick={handleCancel}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                darkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✗ Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

EditableBalance.propTypes = {
  darkMode: PropTypes.bool
};

export default EditableBalance;
