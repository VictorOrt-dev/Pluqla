/**
 * Financial Health Score - AI-Powered Analysis
 * Analyzes income, spending, savings, debt ratio, and financial habits
 * Provides actionable insights and personalized recommendations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const FinancialHealthScore = ({ financialData, darkMode }) => {
  const [score, setScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate financial health score (0-100)
  // ✅ FIX: Memoized with useCallback to prevent dependency issues
  const calculateScore = useCallback(() => {
    if (!financialData) return { total: 0, factors: [] };

    let totalScore = 0;
    let factors = [];

    // Factor 1: Savings Rate (30 points max)
    const savingsRate = financialData.savingsRate || 0;
    const savingsScore = Math.min(30, (savingsRate / 20) * 30);
    totalScore += savingsScore;
    factors.push({
      name: "Taux d'épargne",
      score: savingsScore,
      max: 30,
      value: `${savingsRate.toFixed(1)}%`,
      icon: '💰',
      advice:
        savingsRate < 10
          ? 'Augmentez votre épargne à au moins 10% de vos revenus'
          : savingsRate < 20
          ? 'Bon taux ! Visez 20% pour une meilleure sécurité'
          : 'Excellent taux d\'épargne !',
    });

    // Factor 2: Income Stability (25 points max)
    const incomeStability = financialData.incomeStability || 0.5;
    const stabilityScore = incomeStability * 25;
    totalScore += stabilityScore;
    factors.push({
      name: 'Stabilité des revenus',
      score: stabilityScore,
      max: 25,
      value: `${(incomeStability * 100).toFixed(0)}%`,
      icon: '📊',
      advice:
        incomeStability < 0.5
          ? 'Diversifiez vos sources de revenus pour plus de stabilité'
          : incomeStability < 0.8
          ? 'Bonne stabilité, continuez comme ça'
          : 'Revenus très stables !',
    });

    // Factor 3: Expense Control (25 points max)
    // ⚡ SAFETY: Prevent division by zero with explicit check
    const income = financialData.income?.total || 0;
    const expenses = financialData.expenses?.total || 0;
    const expenseRatio = income > 0 ? expenses / income : 0;
    const expenseScore = Math.max(0, 25 - expenseRatio * 25);
    totalScore += expenseScore;
    factors.push({
      name: 'Contrôle des dépenses',
      score: expenseScore,
      max: 25,
      value: `${(expenseRatio * 100).toFixed(0)}%`,
      icon: '📉',
      advice:
        expenseRatio > 0.8
          ? 'Réduisez vos dépenses pour améliorer votre santé financière'
          : expenseRatio > 0.6
          ? 'Bon équilibre, surveillez vos dépenses'
          : 'Excellente maîtrise de vos dépenses !',
    });

    // Factor 4: Emergency Fund (20 points max)
    // ⚡ SAFETY: Prevent division by zero with explicit check
    const savings = financialData.savings || 0;
    const monthlyExpenses = financialData.expenses?.total || 0;
    const monthsOfExpenses = monthlyExpenses > 0 ? savings / monthlyExpenses : 0;
    const emergencyScore = Math.min(20, (monthsOfExpenses / 6) * 20);
    totalScore += emergencyScore;
    factors.push({
      name: "Fonds d'urgence",
      score: emergencyScore,
      max: 20,
      value: `${monthsOfExpenses.toFixed(1)} mois`,
      icon: '🛡️',
      advice:
        monthsOfExpenses < 3
          ? 'Visez 3-6 mois de dépenses en épargne de sécurité'
          : monthsOfExpenses < 6
          ? 'Bon fonds d\'urgence, visez 6 mois'
          : 'Excellent coussin de sécurité !',
    });

    return {
      total: Math.round(totalScore),
      factors,
    };
  }, [financialData]); // ✅ FIX: Added dependency array

  // ✅ FIX: Memoize scoreResult to avoid recalculating on every render
  const scoreResult = useMemo(() => calculateScore(), [calculateScore]);

  useEffect(() => {
    setScore(scoreResult.total);

    // Animate score
    let current = 0;
    const increment = scoreResult.total / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= scoreResult.total) {
        setAnimatedScore(scoreResult.total);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, 20);

    // ✅ FIX: Cleanup timer on unmount or when scoreResult changes
    return () => clearInterval(timer);
  }, [scoreResult]); // ✅ FIX: Added scoreResult to dependencies

  const { factors } = scoreResult; // ✅ FIX: Use memoized result

  const getScoreColor = () => {
    if (score >= 80) return 'from-emerald-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-600';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellente';
    if (score >= 60) return 'Bonne';
    if (score >= 40) return 'Moyenne';
    return 'À améliorer';
  };

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div
      className={`rounded-3xl p-6 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900/90 to-slate-800/90'
          : 'bg-gradient-to-br from-white/90 to-gray-50/90'
      } backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'} shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Santé Financière
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Analyse IA de votre situation
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      </div>

      {/* Score Circle */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <svg className="transform -rotate-90" width="160" height="160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={darkMode ? '#1e293b' : '#e5e7eb'}
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-yellow-500' : 'text-orange-500'}`} stopColor="currentColor" />
                <stop offset="100%" className={`${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-orange-500' : 'text-red-600'}`} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-black bg-gradient-to-br ${getScoreColor()} bg-clip-text text-transparent`}>
              {animatedScore}
            </span>
            <span className={`text-sm font-semibold mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              / 100
            </span>
          </div>
        </div>

        <div className={`mt-4 px-6 py-2 rounded-full bg-gradient-to-br ${getScoreColor()} text-white font-bold text-sm shadow-lg`}>
          {getScoreLabel()}
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="space-y-4">
        <h4 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Facteurs d'analyse
        </h4>
        {factors.map((factor, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{factor.icon}</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {factor.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {factor.value}
                </span>
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {Math.round(factor.score)}/{factor.max}
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getScoreColor()} transition-all duration-1000 ease-out`}
                style={{ width: `${(factor.score / factor.max) * 100}%` }}
              />
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-600'} italic`}>
              {factor.advice}
            </p>
          </div>
        ))}
      </div>

      {/* Premium CTA */}
      <div className={`mt-6 p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-300 bg-gray-50'}`}>
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="flex-1">
            <h5 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Débloquez l'analyse complète
            </h5>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Projections, simulations, conseils personnalisés IA
            </p>
            <button className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Passer Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

FinancialHealthScore.propTypes = {
  financialData: PropTypes.shape({
    savingsRate: PropTypes.number,
    incomeStability: PropTypes.number,
    savings: PropTypes.number,
    income: PropTypes.shape({
      total: PropTypes.number,
    }),
    expenses: PropTypes.shape({
      total: PropTypes.number,
    }),
  }),
  darkMode: PropTypes.bool,
};

FinancialHealthScore.defaultProps = {
  darkMode: false,
  financialData: null,
};

// ⚡ PERFORMANCE: Memoize FinancialHealthScore to prevent unnecessary re-renders
export default React.memo(FinancialHealthScore);
