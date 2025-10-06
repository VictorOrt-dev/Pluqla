/**
 * SimpleDashboard - Money Manager Inspired Finance Dashboard
 * Simple, clean, effective - everything on one screen
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import EditableBalance from './EditableBalance';
import SegmentedControl from './SegmentedControl';
import SimplePieChart from './SimplePieChart';
import CategoryList from './CategoryList';
import SimpleTransactionList from './SimpleTransactionList';
import AddTransactionModal from './AddTransactionModal';

const SimpleDashboard = ({ darkMode }) => {
  // State
  const [activeView, setActiveView] = useState('expenses');
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('pluqla_transactions');
    return saved ? JSON.parse(saved) : [
      // Mock data
      { id: '1', type: 'expense', amount: 52.50, description: 'Courses Carrefour', category: 'alimentation', date: '2025-10-04' },
      { id: '2', type: 'expense', amount: 35.00, description: 'Essence Total', category: 'transport', date: '2025-10-04' },
      { id: '3', type: 'expense', amount: 15.90, description: 'Netflix', category: 'loisirs', date: '2025-10-03' },
      { id: '4', type: 'revenue', amount: 3200.00, description: 'Salaire', category: 'salary', date: '2025-10-01' },
      { id: '5', type: 'revenue', amount: 450.00, description: 'Freelance projet web', category: 'freelance', date: '2025-10-02' }
    ];
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Persist transactions
  useEffect(() => {
    localStorage.setItem('pluqla_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Filter transactions by view
  const filteredTransactions = transactions.filter(t =>
    activeView === 'expenses' ? t.type === 'expense' : t.type === 'revenue'
  );

  // Calculate categories
  const calculateCategories = () => {
    const categoryData = {};

    filteredTransactions.forEach(t => {
      if (!categoryData[t.category]) {
        categoryData[t.category] = {
          category: t.category,
          amount: 0,
          count: 0
        };
      }
      categoryData[t.category].amount += t.amount;
      categoryData[t.category].count += 1;
    });

    const total = Object.values(categoryData).reduce((sum, cat) => sum + cat.amount, 0);

    const categories = Object.values(categoryData).map((cat, index) => {
      const categoryInfo = getCategoryInfo(cat.category, activeView);
      return {
        ...cat,
        id: cat.category,
        name: categoryInfo.name,
        icon: categoryInfo.icon,
        percentage: total > 0 ? Math.round((cat.amount / total) * 100) : 0,
        color: categoryInfo.color
      };
    });

    return categories.sort((a, b) => b.amount - a.amount);
  };

  const getCategoryInfo = (category, view) => {
    if (view === 'expenses') {
      const expenseCategories = {
        alimentation: { name: 'Alimentation', icon: '🍽️', color: '#F14545' },
        transport: { name: 'Transport', icon: '🚗', color: '#FF6B6B' },
        loisirs: { name: 'Loisirs', icon: '🎬', color: '#D73030' },
        logement: { name: 'Logement', icon: '🏠', color: '#F85454' },
        sante: { name: 'Santé', icon: '💊', color: '#E63946' },
        shopping: { name: 'Shopping', icon: '🛍️', color: '#FF5A5A' },
        autres: { name: 'Autres', icon: '📦', color: '#B83030' }
      };
      return expenseCategories[category] || { name: category, icon: '📦', color: '#F14545' };
    } else {
      const revenueCategories = {
        salary: { name: 'Salaire', icon: '💼', color: '#10B981' },
        freelance: { name: 'Freelance', icon: '💻', color: '#059669' },
        investment: { name: 'Investissement', icon: '📈', color: '#0D9488' },
        other: { name: 'Autres', icon: '💰', color: '#14B8A6' }
      };
      return revenueCategories[category] || { name: category, icon: '💰', color: '#10B981' };
    }
  };

  const categories = calculateCategories();
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

  // Handlers
  const handleViewChange = (view) => {
    if (view !== activeView) {
      // Haptic feedback
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
      setActiveView(view);
    }
  };

  const handleAddTransaction = (transaction) => {
    setTransactions([transaction, ...transactions]);
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }`}>
      {/* Editable Balance */}
      <EditableBalance darkMode={darkMode} />

      {/* Segmented Control */}
      <SegmentedControl
        activeView={activeView}
        onViewChange={handleViewChange}
        darkMode={darkMode}
      />

      {/* Animated View Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: activeView === 'expenses' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeView === 'expenses' ? 20 : -20 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Pie Chart */}
          {categories.length > 0 && (
            <SimplePieChart
              data={categories}
              darkMode={darkMode}
              colorScheme={activeView === 'expenses' ? 'red' : 'green'}
            />
          )}

          {/* Category List */}
          {categories.length > 0 && (
            <CategoryList
              categories={categories}
              darkMode={darkMode}
              colorScheme={activeView === 'expenses' ? 'red' : 'green'}
            />
          )}

          {/* Summary */}
          <div className={`mx-4 mb-4 p-4 rounded-2xl backdrop-blur-xl border text-center ${
            darkMode
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white/70 border-gray-200'
          }`}>
            <p className={`text-sm font-medium ${
              darkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              {activeView === 'expenses' ? 'Total dépenses' : 'Total revenus'} ce mois
            </p>
            <p className={`text-3xl font-black mt-1 ${
              activeView === 'expenses'
                ? 'text-[#F14545]'
                : 'text-emerald-500'
            }`}>
              {formatCurrency(totalAmount)}
            </p>
            <p className={`text-xs mt-1 ${
              darkMode ? 'text-slate-500' : 'text-gray-500'
            }`}>
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Transaction List */}
          <SimpleTransactionList
            transactions={filteredTransactions.slice(0, 5)}
            onDelete={handleDeleteTransaction}
            darkMode={darkMode}
          />
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-110 z-40 flex items-center justify-center"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddTransaction}
        type={activeView === 'expenses' ? 'expense' : 'revenue'}
        darkMode={darkMode}
      />
    </div>
  );
};

SimpleDashboard.propTypes = {
  darkMode: PropTypes.bool
};

export default SimpleDashboard;
