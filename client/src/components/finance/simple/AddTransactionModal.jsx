/**
 * AddTransactionModal - Simple & Fast Transaction Entry
 * Money Manager inspired: 4 fields max, quick add flow
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

const AddTransactionModal = ({ isOpen, onClose, onSave, type = 'expense', darkMode }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const expenseCategories = [
    { id: 'alimentation', name: 'Alimentation', icon: '🍽️' },
    { id: 'transport', name: 'Transport', icon: '🚗' },
    { id: 'loisirs', name: 'Loisirs', icon: '🎬' },
    { id: 'logement', name: 'Logement', icon: '🏠' },
    { id: 'sante', name: 'Santé', icon: '💊' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'autres', name: 'Autres', icon: '📦' }
  ];

  const revenueCategories = [
    { id: 'salary', name: 'Salaire', icon: '💼' },
    { id: 'freelance', name: 'Freelance', icon: '💻' },
    { id: 'investment', name: 'Investissement', icon: '📈' },
    { id: 'other', name: 'Autres', icon: '💰' }
  ];

  const categories = type === 'expense' ? expenseCategories : revenueCategories;

  const handleSave = () => {
    if (!amount || !description || !category) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const transaction = {
      id: Date.now().toString(),
      type,
      amount: parseFloat(amount),
      description,
      category,
      date,
      createdAt: new Date().toISOString()
    };

    onSave(transaction);

    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={`relative w-full sm:max-w-lg sm:rounded-2xl overflow-hidden ${
            darkMode
              ? 'bg-slate-900 border-slate-700'
              : 'bg-white border-gray-200'
          } border shadow-2xl`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {type === 'expense' ? 'Nouvelle dépense' : 'Nouveau revenu'}
            </h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="px-6 py-6 space-y-6">
            {/* Amount */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Montant
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className={`w-full text-3xl font-bold text-center py-4 rounded-2xl border-2 focus:outline-none focus:ring-2 focus:ring-[#F14545]/50 ${
                    darkMode
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-white text-gray-900 border-gray-200'
                  }`}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${
                  darkMode ? 'text-slate-400' : 'text-gray-400'
                }`}>
                  €
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Description
              </label>
              <input
                type="text"
                placeholder="Ex: Courses Carrefour"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50 ${
                  darkMode
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
              />
            </div>

            {/* Category */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Catégorie
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      category === cat.id
                        ? 'border-[#F14545] bg-[#F14545]/10'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1">{cat.icon}</span>
                    <span className={`text-xs font-medium ${
                      category === cat.id
                        ? 'text-[#F14545]'
                        : darkMode
                        ? 'text-white'
                        : 'text-gray-900'
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50 ${
                  darkMode
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSave}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-br from-[#F14545] to-[#FF6B6B] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Enregistrer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

AddTransactionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['expense', 'income']),
  darkMode: PropTypes.bool
};

export default AddTransactionModal;
