/**
 * Enhanced Dashboard - Pluqla Finance
 * Money Manager inspired + Pluqla DA + Pluqi mascot
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import BalanceCard from './BalanceCard';
import QuickStats from './QuickStats';
import AIInsightCard from './AIInsightCard';
import BankAccounts from './BankAccounts';
import ExpenseBreakdown from './ExpenseBreakdown';
import AddTransactionModal from '../simple/AddTransactionModal';
import SimpleTransactionList from '../simple/SimpleTransactionList';

const EnhancedDashboard = ({ darkMode }) => {
  // State
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('pluqla_transactions');
    return saved ? JSON.parse(saved) : [
      // Mock data
      { id: '1', type: 'expense', amount: 52.50, description: 'Courses Carrefour', category: 'alimentation', date: '2025-10-04' },
      { id: '2', type: 'expense', amount: 35.00, description: 'Essence Total', category: 'transport', date: '2025-10-04' },
      { id: '3', type: 'expense', amount: 15.90, description: 'Netflix', category: 'loisirs', date: '2025-10-03' },
      { id: '4', type: 'expense', amount: 120.00, description: 'Restaurant', category: 'alimentation', date: '2025-10-02' },
      { id: '5', type: 'income', amount: 3200.00, description: 'Salaire', category: 'salary', date: '2025-10-01' },
      { id: '6', type: 'income', amount: 450.00, description: 'Freelance projet web', category: 'freelance', date: '2025-10-02' },
    ];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [showInsight, setShowInsight] = useState(true);

  // Persist transactions
  useEffect(() => {
    localStorage.setItem('pluqla_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Transaction handlers
  const handleAddTransaction = (transaction) => {
    setTransactions([transaction, ...transactions]);
    setShowAddModal(false);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleEditTransaction = (transaction) => {
    // TODO: Implement edit modal
    console.log('Edit transaction:', transaction);
  };

  const handleConfirmDelete = (transaction) => {
    if (window.confirm(`Supprimer "${transaction.description}" ?`)) {
      handleDeleteTransaction(transaction.id);
    }
  };

  // Bank account handlers
  const handleConnectBank = () => {
    // TODO: Implement bank connection flow
    console.log('Connect bank account');
  };

  const handleAccountClick = (account) => {
    // TODO: Implement account details view
    console.log('Account clicked:', account);
  };

  // Mock bank accounts (empty for now)
  const bankAccounts = [];

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode
        ? 'pluqla-bg-dark'
        : 'bg-gradient-to-b from-[#FAFAFA] via-[#F9F9F9] to-[#F5F5F5]'
    }`}
    style={!darkMode ? {
      backgroundImage: `
        linear-gradient(135deg, rgba(241, 69, 69, 0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 25% 25%, rgba(241, 69, 69, 0.03) 0%, transparent 60%),
        radial-gradient(ellipse at 75% 75%, rgba(241, 69, 69, 0.02) 0%, transparent 60%)
      `
    } : {}}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BalanceCard darkMode={darkMode} />
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <QuickStats transactions={transactions} darkMode={darkMode} />
        </motion.div>

        {/* AI Insight Card */}
        {showInsight && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AIInsightCard
              transactions={transactions}
              darkMode={darkMode}
              onDismiss={() => setShowInsight(false)}
            />
          </motion.div>
        )}

        {/* Bank Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <BankAccounts
            accounts={bankAccounts}
            onConnectBank={handleConnectBank}
            onAccountClick={handleAccountClick}
            darkMode={darkMode}
          />
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ExpenseBreakdown transactions={transactions} darkMode={darkMode} />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative pluqla-scale-in"
        >
          {/* Premium hover glow overlay */}
          <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
            darkMode
              ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
              : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
          }`}></div>

          <div
            className={`relative rounded-2xl backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
              darkMode
                ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
                : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
            }`}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                  Transactions récentes
                </h3>
                <button
                  onClick={() => {
                    setModalType('expense');
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#F14545] to-[#FF6B6B] hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-md"
                >
                  <Plus size={18} />
                  <span>Ajouter</span>
                </button>
              </div>

              <SimpleTransactionList
                transactions={recentTransactions}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onConfirmDelete={handleConfirmDelete}
                darkMode={darkMode}
              />
            </div>
          </div>
        </motion.div>

        {/* Quick Action Buttons (Fixed Bottom) - HomeScreen style */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
          {/* Add Expense */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setModalType('expense');
              setShowAddModal(true);
            }}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-200 ${
              darkMode
                ? 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B] hover:shadow-[0_0_20px_rgba(241,69,69,0.5)]'
                : 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B] hover:shadow-[0_8px_24px_rgba(241,69,69,0.4)]'
            }`}
            aria-label="Ajouter une dépense"
          >
            <span className="text-2xl font-bold">-</span>
          </motion.button>

          {/* Add Income */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setModalType('income');
              setShowAddModal(true);
            }}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-200 ${
              darkMode
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]'
            }`}
            aria-label="Ajouter un revenu"
          >
            <span className="text-2xl font-bold">+</span>
          </motion.button>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddTransactionModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={handleAddTransaction}
            type={modalType}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

EnhancedDashboard.propTypes = {
  darkMode: PropTypes.bool,
};

export default EnhancedDashboard;
