/**
 * Bank Selection Modal - Nordigen Bank Connection
 * Allows users to select their bank to connect via Open Banking
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader, Building2, ExternalLink } from 'lucide-react';

const BankSelectionModal = ({ isOpen, onClose, darkMode = false }) => {
  const [banks, setBanks] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('FR');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const countries = [
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
    { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
    { code: 'IT', name: 'Italie', flag: '🇮🇹' },
    { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧' },
    { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
    { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  ];

  // Fetch banks when modal opens or country changes
  useEffect(() => {
    if (isOpen) {
      fetchBanks();
    }
  }, [isOpen, selectedCountry]);

  // Filter banks based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBanks(banks);
    } else {
      const filtered = banks.filter(bank =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  }, [searchQuery, banks]);

  const fetchBanks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3004/api/bank-accounts/institutions?country=${selectedCountry}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch banks');
      }

      const data = await response.json();
      setBanks(data.data || []);
      setFilteredBanks(data.data || []);
    } catch (err) {
      console.error('[BankSelection] Fetch error:', err);
      setError('Impossible de charger la liste des banques');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankSelect = async (bank) => {
    setIsConnecting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3004/api/bank-accounts/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: bank.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create bank connection');
      }

      const data = await response.json();

      // Store requisition ID for callback
      localStorage.setItem('nordigen_requisition_id', data.data.requisitionId);

      // Redirect to bank authorization page
      window.location.href = data.data.authLink;
    } catch (err) {
      console.error('[BankSelection] Connect error:', err);
      setError('Impossible de se connecter à la banque');
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => !isConnecting && onClose()}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl ${
            darkMode
              ? 'bg-gradient-to-b from-gray-900/95 to-gray-800/95 border border-white/10'
              : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode
                  ? 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B]'
                  : 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B]'
              }`}>
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                  Connecter une banque
                </h2>
                <p className={`text-sm ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                  Sélectionnez votre banque pour synchroniser vos comptes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isConnecting}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
                darkMode
                  ? 'bg-black/40 hover:bg-[#F14545]/50 border-white/10 text-white/80'
                  : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 text-gray-600 hover:text-white'
              }`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Country Selection */}
          <div className={`p-4 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {countries.map(country => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    selectedCountry === country.code
                      ? darkMode
                        ? 'bg-[#F14545] text-white'
                        : 'bg-[#F14545] text-white'
                      : darkMode
                        ? 'bg-gray-800 text-white/70 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4">
            <div className={`relative rounded-xl border ${
              darkMode ? 'bg-gray-800/50 border-white/10' : 'bg-gray-50 border-gray-200'
            }`}>
              <Search size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                darkMode ? 'text-white/40' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Rechercher une banque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-transparent outline-none ${
                  darkMode ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 pb-2">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            </div>
          )}

          {/* Banks List */}
          <div className="overflow-y-auto max-h-[400px] p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size={32} className="animate-spin text-[#F14545]" />
              </div>
            ) : filteredBanks.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={48} className={`mx-auto mb-4 ${
                  darkMode ? 'text-white/20' : 'text-gray-300'
                }`} />
                <p className={`font-medium ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                  {searchQuery ? 'Aucune banque trouvée' : 'Aucune banque disponible'}
                </p>
              </div>
            ) : (
              filteredBanks.map(bank => (
                <button
                  key={bank.id}
                  onClick={() => handleBankSelect(bank)}
                  disabled={isConnecting}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                    darkMode
                      ? 'bg-gray-800/50 border-white/10 hover:border-[#F14545]/50 hover:bg-gray-800'
                      : 'bg-white border-gray-200 hover:border-[#F14545]/40 hover:shadow-md'
                  } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    {bank.logo ? (
                      <img
                        src={bank.logo}
                        alt={bank.name}
                        className="w-10 h-10 rounded-lg object-contain bg-white"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <Building2 size={20} className={darkMode ? 'text-white/40' : 'text-gray-400'} />
                      </div>
                    )}
                    <div className="text-left">
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                        {bank.name}
                      </p>
                      {bank.bic && (
                        <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                          BIC: {bank.bic}
                        </p>
                      )}
                    </div>
                  </div>
                  <ExternalLink size={18} className={`${
                    darkMode ? 'text-white/40 group-hover:text-[#F14545]' : 'text-gray-400 group-hover:text-[#F14545]'
                  } transition-colors`} />
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-xs text-center ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
              🔒 Connexion sécurisée via Open Banking (PSD2) • Vos données sont protégées
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

BankSelectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

export default BankSelectionModal;
