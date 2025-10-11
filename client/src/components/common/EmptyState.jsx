/**
 * Empty State - Premium empty state with illustrations and CTAs
 * Provides delightful empty experiences with clear next actions
 * Mobile-first, accessible, and brand-consistent
 */

import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const EmptyState = ({
  variant = 'transactions',
  darkMode = false,
  onAction,
  actionLabel = 'Commencer',
  title,
  description,
}) => {
  // Animation variants for micro-interactions
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.2,
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // Empty state configurations
  const emptyStates = {
    transactions: {
      icon: (
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      title: title || 'Aucune transaction',
      description: description || 'Commencez à suivre vos finances en ajoutant votre première transaction.',
      illustration: '💳',
    },

    insights: {
      icon: (
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: title || 'Pas encore d\'insights IA',
      description: description || 'Ajoutez des transactions pour que notre IA analyse vos habitudes et vous propose des recommandations personnalisées.',
      illustration: '🤖',
    },

    budgets: {
      icon: (
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      title: title || 'Aucun budget configuré',
      description: description || 'Créez des budgets pour contrôler vos dépenses et recevoir des alertes intelligentes.',
      illustration: '📊',
    },

    offline: {
      icon: (
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      ),
      title: title || 'Mode hors ligne',
      description: description || 'Vous êtes hors ligne. Certaines fonctionnalités sont limitées.',
      illustration: '📡',
    },

    error: {
      icon: (
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: title || 'Une erreur est survenue',
      description: description || 'Impossible de charger les données. Veuillez réessayer.',
      illustration: '⚠️',
    },
  };

  const config = emptyStates[variant] || emptyStates.transactions;

  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-white/50 border-gray-200'
      } border backdrop-blur-xl`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
    >
      {/* Illustration */}
      <motion.div
        className={`mb-6 ${
          darkMode ? 'text-slate-600' : 'text-gray-400'
        }`}
        variants={iconVariants}
      >
        {config.icon}
      </motion.div>

      {/* Emoji illustration */}
      <motion.div
        className="text-6xl mb-4"
        variants={iconVariants}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.3,
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        aria-hidden="true"
      >
        {config.illustration}
      </motion.div>

      {/* Title */}
      <h3
        className={`text-xl font-bold mb-3 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        {config.title}
      </h3>

      {/* Description */}
      <p
        className={`text-sm max-w-md mb-6 leading-relaxed ${
          darkMode ? 'text-slate-400' : 'text-gray-600'
        }`}
      >
        {config.description}
      </p>

      {/* CTA Button */}
      {onAction && (
        <motion.button
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white font-semibold shadow-lg hover:shadow-xl transform transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-label={actionLabel}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{actionLabel}</span>
          </div>
        </motion.button>
      )}

      {/* Secondary action for offline/error states */}
      {(variant === 'offline' || variant === 'error') && onAction && (
        <motion.button
          onClick={onAction}
          className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
            darkMode
              ? 'bg-slate-700 text-white hover:bg-slate-600'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Réessayer"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Réessayer</span>
          </div>
        </motion.button>
      )}
    </motion.div>
  );
};

EmptyState.propTypes = {
  variant: PropTypes.oneOf(['transactions', 'insights', 'budgets', 'offline', 'error']),
  darkMode: PropTypes.bool,
  onAction: PropTypes.func,
  actionLabel: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
};

export default React.memo(EmptyState);
