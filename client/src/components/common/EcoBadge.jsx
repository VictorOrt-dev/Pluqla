/**
 * EcoBadge Component
 *
 * Displays Pluqla EcoScore with visual grade indicator
 * Cohérent avec la DA Pluqla (Glassmorphism)
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Get grade color based on score
 */
const getGradeColor = (grade) => {
  const colors = {
    A: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-700',
      emoji: '🌱',
    },
    B: {
      bg: 'bg-lime-50',
      border: 'border-lime-400',
      text: 'text-lime-700',
      emoji: '🍃',
    },
    C: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      text: 'text-yellow-700',
      emoji: '⚠️',
    },
    D: {
      bg: 'bg-orange-50',
      border: 'border-orange-400',
      text: 'text-orange-700',
      emoji: '🔶',
    },
    E: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-700',
      emoji: '🔴',
    },
  };

  return colors[grade] || colors.C;
};

/**
 * EcoBadge Component
 */
const EcoBadge = ({
  score = 50,
  grade = 'C',
  size = 'md',
  showScore = true,
  showLabel = false,
  className = '',
}) => {
  const colors = getGradeColor(grade);

  // Size variations
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      emoji: 'text-sm',
      score: 'text-xs',
      label: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      emoji: 'text-base',
      score: 'text-sm',
      label: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2 text-base',
      emoji: 'text-lg',
      score: 'text-base',
      label: 'text-base',
    },
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        border-2
        ${colors.bg}
        ${colors.border}
        ${colors.text}
        ${sizeClass.container}
        font-semibold
        shadow-sm
        transition-all duration-200
        hover:shadow-md
        ${className}
      `}
      title={`Éco-score ${grade} (${score}/100)`}
    >
      {/* Emoji indicator */}
      <span className={sizeClass.emoji} aria-label={`Éco-score ${grade}`}>
        {colors.emoji}
      </span>

      {/* Grade letter */}
      <span className="font-bold">{grade}</span>

      {/* Score number (optional) */}
      {showScore && (
        <span className={`${sizeClass.score} opacity-75`}>
          {score}/100
        </span>
      )}

      {/* Label (optional) */}
      {showLabel && (
        <span className={`${sizeClass.label} ml-1 opacity-75`}>
          Éco-score
        </span>
      )}
    </div>
  );
};

EcoBadge.propTypes = {
  /** Eco score value (0-100) */
  score: PropTypes.number,
  /** Eco score grade (A-E) */
  grade: PropTypes.oneOf(['A', 'B', 'C', 'D', 'E']),
  /** Badge size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Show numeric score */
  showScore: PropTypes.bool,
  /** Show "Éco-score" label */
  showLabel: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

/**
 * EcoScoreBar Component
 * Horizontal bar visualization of eco-score
 */
export const EcoScoreBar = ({ score = 50, className = '' }) => {
  const getBarColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 65) return 'bg-lime-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 35) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">
          Impact environnemental
        </span>
        <span className="text-xs font-semibold text-gray-900">
          {score}/100
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-500 rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

EcoScoreBar.propTypes = {
  /** Eco score value (0-100) */
  score: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
};

/**
 * EcoScoreDetail Component
 * Detailed eco-score display with recommendations
 */
export const EcoScoreDetail = ({ ecoScoreDetails, className = '' }) => {
  if (!ecoScoreDetails) return null;

  const { ingredientsAnalyzed, breakdown = [], recommendations = [] } = ecoScoreDetails;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="text-sm text-gray-600">
        {ingredientsAnalyzed} ingrédient{ingredientsAnalyzed > 1 ? 's' : ''} analysé{ingredientsAnalyzed > 1 ? 's' : ''}
      </div>

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Détail par ingrédient</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {breakdown.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-700">{item.ingredient}</span>
                <span
                  className={`font-semibold ${
                    item.impact > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.impact > 0 ? '+' : ''}{item.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Recommandations</h4>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
              >
                <span className="text-blue-600 mt-0.5">💡</span>
                <div className="flex-1">
                  <p className="text-blue-900">{rec.message}</p>
                  {rec.potentialGain && (
                    <p className="text-blue-700 mt-1">
                      Gain potentiel: +{rec.potentialGain} points
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

EcoScoreDetail.propTypes = {
  /** Eco score details object */
  ecoScoreDetails: PropTypes.shape({
    ingredientsAnalyzed: PropTypes.number,
    breakdown: PropTypes.arrayOf(
      PropTypes.shape({
        ingredient: PropTypes.string,
        category: PropTypes.string,
        impact: PropTypes.number,
        reason: PropTypes.string,
      })
    ),
    recommendations: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
        potentialGain: PropTypes.number,
      })
    ),
  }),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default EcoBadge;
