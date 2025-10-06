/**
 * Bank Accounts - Pluqla Finance
 * Empty state with connection CTA + account cards with health scores
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Plus, Building2, TrendingUp, Shield, RefreshCw } from 'lucide-react';

const BankAccounts = ({ accounts = [], onConnectBank, onAccountClick, darkMode = false }) => {
  // Empty state when no accounts connected
  if (accounts.length === 0) {
    return (
      <div className="relative pluqla-scale-in">
        {/* Premium hover glow overlay - HomeScreen pattern */}
        <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
          darkMode
            ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
            : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
        }`}></div>

        <div
          className={`relative rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
            darkMode
              ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
              : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
          }`}
        >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] flex items-center justify-center shadow-xl">
            <Building2 size={32} className="text-white" />
          </div>
        </div>

          {/* Title and description */}
          <h3 className={`text-xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
            Connecte tes comptes bancaires
          </h3>
          <p className={`text-sm text-center mb-6 ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
            Synchronise automatiquement tes transactions et obtiens une vue complète de tes finances
          </p>

          {/* Features list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Shield size={16} className="text-emerald-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
                Connexion 100% sécurisée (PSD2)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <RefreshCw size={16} className="text-blue-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
                Synchronisation automatique
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-purple-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
                Analyse IA de tes dépenses
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onConnectBank}
            className="w-full px-6 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#F14545] to-[#FF6B6B] hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            <Plus size={20} />
            <span>Connecter un compte</span>
          </button>

          {/* Security note */}
          <p className={`text-xs text-center mt-4 ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
            🔒 Tes données bancaires sont cryptées et jamais stockées
          </p>
        </div>
      </div>
    );
  }

  // Account cards when accounts are connected
  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthScoreGradient = (score) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-600';
    if (score >= 60) return 'from-blue-500 to-blue-600';
    if (score >= 40) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
          Mes comptes bancaires
        </h3>
        <button
          onClick={onConnectBank}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
            darkMode
              ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
              : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
          }`}
          aria-label="Ajouter un compte"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Account cards */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="relative">
            {/* Premium hover glow overlay */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
                : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
            }`}></div>

            <button
              onClick={() => onAccountClick(account)}
              className={`relative w-full rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group text-left ${
                darkMode
                  ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
                  : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
              }`}
            >
            <div className="flex items-center justify-between mb-3">
              {/* Bank name and type */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] flex items-center justify-center shadow-lg">
                  <Building2 size={20} className="text-white" />
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                    {account.name}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                    {account.type}
                  </p>
                </div>
              </div>

              {/* Sync status */}
              <div className="flex items-center space-x-2">
                <RefreshCw
                  size={14}
                  className={account.isSyncing ? 'animate-spin text-blue-500' : darkMode ? 'text-white/60' : 'text-gray-400'}
                />
                <span className={`text-xs ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                  {account.lastSync}
                </span>
              </div>
            </div>

            {/* Balance */}
            <p className={`text-2xl font-bold mb-3 transition-all duration-300 ${
              darkMode ? 'text-white group-hover:text-[#FF6B6B]' : 'text-[#121212] group-hover:text-[#F14545] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
            }`}>
              {formatCurrency(account.balance)}
            </p>

            {/* Health score */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Score de santé
              </span>
              <div className="flex items-center space-x-2">
                <div className={`w-24 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                  <div
                    className={`h-full bg-gradient-to-r ${getHealthScoreGradient(account.healthScore)} transition-all duration-500`}
                    style={{ width: `${account.healthScore}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${getHealthScoreColor(account.healthScore)}`}>
                  {account.healthScore}%
                </span>
              </div>
            </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

BankAccounts.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      balance: PropTypes.number.isRequired,
      healthScore: PropTypes.number.isRequired,
      lastSync: PropTypes.string.isRequired,
      isSyncing: PropTypes.bool,
    })
  ),
  onConnectBank: PropTypes.func.isRequired,
  onAccountClick: PropTypes.func,
  darkMode: PropTypes.bool,
};

export default BankAccounts;
