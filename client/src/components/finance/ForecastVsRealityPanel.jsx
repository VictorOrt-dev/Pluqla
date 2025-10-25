/**
 * ForecastVsRealityPanel Component
 *
 * Phase 5: Prévision vs Réalité
 * Displays comparative statistics between forecasted and actual food spending
 *
 * Features:
 * - Progress bars comparing forecast vs actual amounts
 * - Variance percentage with contextual messaging
 * - Detailed breakdown of matched/pending/archived items
 * - Manual matching trigger button
 * - Skeleton loading states
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion } from '../../utils/lazyFramerMotion';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
  RefreshCw,
  Target,
} from 'lucide-react';
import {
  useForecastVsRealityStats,
  useMatchForecasts,
} from '../../hooks/useRecipesQuery';

/**
 * ForecastVsRealityPanel Component
 */
const ForecastVsRealityPanel = ({ startDate, endDate, className = '' }) => {
  // Fetch forecast vs reality stats
  const {
    data: stats,
    isLoading,
    error,
  } = useForecastVsRealityStats(startDate, endDate);

  // Manual matching mutation
  const { mutate: triggerMatching, isPending: isMatching } = useMatchForecasts();

  /**
   * Format price
   */
  const formatPrice = (price) => {
    if (!price && price !== 0) return '0,00 €';
    return `${price.toFixed(2).replace('.', ',')} €`;
  };

  /**
   * Format percentage
   */
  const formatPercent = (percent) => {
    if (!percent && percent !== 0) return '0%';
    return `${percent.toFixed(1).replace('.', ',')}%`;
  };

  /**
   * Get variance message and color
   */
  const getVarianceInfo = useMemo(() => {
    if (!stats?.variance) return null;

    const { percent } = stats.variance;
    const absPercent = Math.abs(percent);

    if (absPercent < 5) {
      return {
        message: 'Excellent ! Vos prévisions sont très précises 🎯',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: Target,
      };
    } else if (absPercent < 15) {
      if (percent > 0) {
        return {
          message: 'Vous avez dépensé un peu plus que prévu',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: TrendingUp,
        };
      } else {
        return {
          message: 'Vous avez dépensé un peu moins que prévu',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: TrendingDown,
        };
      }
    } else {
      if (percent > 0) {
        return {
          message: 'Attention ! Vos dépenses dépassent significativement vos prévisions',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: AlertCircle,
        };
      } else {
        return {
          message: 'Bravo ! Vous avez économisé par rapport à vos prévisions',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: TrendingDown,
        };
      }
    }
  }, [stats]);

  /**
   * Handle manual matching trigger
   */
  const handleTriggerMatching = () => {
    triggerMatching({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  /**
   * Loading skeleton
   */
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8 text-red-500">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">Erreur de chargement des statistiques</p>
        </div>
      </div>
    );
  }

  /**
   * No data state
   */
  if (!stats || (!stats.forecast.count && !stats.matched.count && !stats.archived.count)) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <Archive size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Aucune donnée pour cette période</p>
          <p className="text-sm text-gray-500">
            Ajoutez des recettes à votre budget pour commencer à suivre vos prévisions
          </p>
        </div>
      </div>
    );
  }

  const varianceInfo = getVarianceInfo;
  const VarianceIcon = varianceInfo?.icon || Target;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Manual Matching Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Prévision vs Réalité</h3>
        <button
          onClick={handleTriggerMatching}
          disabled={isMatching}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#E63946] hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
          aria-label="Déclencher le matching manuel"
        >
          <RefreshCw size={16} className={isMatching ? 'animate-spin' : ''} />
          {isMatching ? 'Matching...' : 'Actualiser'}
        </button>
      </div>

      {/* Forecast vs Actual Comparison */}
      <div className="space-y-4">
        {/* Forecast Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              Prévu
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(stats.forecast.total)}
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
            />
          </div>
          <p className="text-xs text-gray-500">
            {stats.forecast.count} {stats.forecast.count > 1 ? 'repas planifiés' : 'repas planifié'}
          </p>
        </div>

        {/* Actual Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Réel
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(stats.matched.total)}
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: stats.forecast.total > 0
                  ? `${Math.min((stats.matched.total / stats.forecast.total) * 100, 100)}%`
                  : '0%',
              }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-green-400 to-green-600"
            />
          </div>
          <p className="text-xs text-gray-500">
            {stats.matched.count} {stats.matched.count > 1 ? 'transactions trouvées' : 'transaction trouvée'}
          </p>
        </div>
      </div>

      {/* Variance Message */}
      {varianceInfo && stats.matched.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`
            p-4 rounded-xl border
            ${varianceInfo.bgColor}
            ${varianceInfo.borderColor}
          `}
        >
          <div className="flex items-start gap-3">
            <VarianceIcon size={20} className={varianceInfo.color} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${varianceInfo.color}`}>
                {varianceInfo.message}
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                <span>
                  Écart: <strong>{formatPrice(Math.abs(stats.variance.amount))}</strong>
                </span>
                <span>
                  ({stats.variance.percent > 0 ? '+' : ''}{formatPercent(stats.variance.percent)})
                </span>
                {stats.accuracy > 0 && (
                  <span className="text-green-600 font-medium">
                    Précision: {formatPercent(stats.accuracy)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {/* Matched */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">Matchés</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.matched.count}</p>
          <p className="text-xs text-green-600 mt-1">
            {formatPrice(stats.matched.total)}
          </p>
        </motion.div>

        {/* Pending */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-4 bg-orange-50 border border-orange-200 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-orange-600" />
            <span className="text-xs font-medium text-orange-700">En attente</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{stats.forecast.count}</p>
          <p className="text-xs text-orange-600 mt-1">
            Prévus mais non matchés
          </p>
        </motion.div>

        {/* Archived */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-gray-50 border border-gray-200 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Archive size={16} className="text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Archivés</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.archived.count}</p>
          <p className="text-xs text-gray-600 mt-1">
            Aucune correspondance
          </p>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="p-4 bg-blue-50 border border-blue-200 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-blue-900 font-medium mb-1">
              Comment fonctionne le matching automatique ?
            </p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Chaque jour, le système recherche automatiquement les transactions bancaires
              correspondant à vos prévisions (±10% sur le montant, ±3 jours sur la date).
              Les prévisions sans correspondance après 7 jours sont archivées.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

ForecastVsRealityPanel.propTypes = {
  /** Start date for filtering stats (optional) */
  startDate: PropTypes.string,
  /** End date for filtering stats (optional) */
  endDate: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ForecastVsRealityPanel;
