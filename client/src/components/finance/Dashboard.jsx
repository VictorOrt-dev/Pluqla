import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import ExpensesChart from './ExpensesChart';
import IncomeChart from './IncomeChart';
import LoadingSpinner from '../common/LoadingSpinner';
import '../../styles/unified-theme.css';
import '../../styles/finance-premium.css';

const Dashboard = ({ darkMode }) => {
  const { t, i18n } = useTranslation();
  const { user, apiCall, isAuthenticated, authState } = useAuth();
  const { setCurrentScreen } = useNavigation();

  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('expenses'); // 'expenses' or 'income'
  const animationStageRef = React.useRef(3);

  const fetchFinancialData = useCallback(async () => {
    if (!isAuthenticated || !apiCall) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoint = `/financial/summary?lang=${i18n.language}&period=month`;
      console.log('[DEBUG] Fetching financial summary from:', endpoint);

      const result = await apiCall(endpoint);
      const data = result.data || result;
      setFinancialData(data);

      // Affichage immédiat
      animationStageRef.current = 3;

    } catch (err) {
      console.error('Error fetching financial data:', err);

      // Gestion spécifique pour les erreurs d'authentification
      if (err.message.includes('authentication') || err.message.includes('token') || err.message.includes('session') || err.message.includes('expired')) {
        setError(t('auth.sessionExpired'));
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [i18n.language, isAuthenticated, apiCall, t]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Afficher le loading pendant la vérification d'auth ou le chargement des données
  if (loading || authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
        <button
          onClick={fetchFinancialData}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Afficher les graphiques même sans données (ils ont leurs propres données d'exemple)
  const displayData = financialData || {};


  // Fonction pour naviguer vers les vues détaillées

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Hero Balance Section */}
        <div className="finance-hero">
          <div className="text-center relative z-10">
            <div className="balance-hero">
              {formatCurrency(displayData?.totals?.netSavings || 3540)}
            </div>
            <p className="balance-subtitle">
              Balance totale
            </p>
            <div className="balance-trend">
              <div className="trend-dot"></div>
              <span>+{(displayData?.totals?.savingsRate || 12.5).toFixed(1)}% ce mois</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="finance-tabs">
          <button
            onClick={() => setActiveView('expenses')}
            className={`finance-tab ${
              activeView === 'expenses' ? 'active' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            Dépenses
          </button>
          <button
            onClick={() => setActiveView('income')}
            className={`finance-tab ${
              activeView === 'income' ? 'active' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Revenus
          </button>
        </div>

        {/* Key Metrics */}
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon income">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="metric-trend positive">
                +8.2%
              </div>
            </div>
            <div className="metric-value">
              {formatCurrency(displayData?.income?.total || 4750)}
            </div>
            <div className="metric-label">
              Revenus ce mois
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon expense">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div className="metric-trend negative">
                -3.1%
              </div>
            </div>
            <div className="metric-value">
              {formatCurrency(displayData?.expenses?.total || 1210)}
            </div>
            <div className="metric-label">
              Dépenses ce mois
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon savings">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="metric-trend positive">
                Excellent
              </div>
            </div>
            <div className="metric-value">
              {(displayData?.totals?.savingsRate || 25.3).toFixed(1)}%
            </div>
            <div className="metric-label">
              Taux d'épargne
            </div>
          </div>
        </div>

        {/* Dynamic Content Based on Active View */}
        <div className="transition-all duration-500 ease-in-out mb-8">
          {activeView === 'expenses' ? (
            /* Expenses Overview */
            <div className="chart-grid">
              {/* Expenses Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Répartition des dépenses</div>
                    <div className="chart-subtitle">Analyse par catégorie</div>
                  </div>
                  <div className="chart-icon" style={{background: 'linear-gradient(135deg, rgba(241, 69, 69, 0.1) 0%, rgba(241, 69, 69, 0.05) 100%)', color: '#F14545'}}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <ExpensesChart
                  data={displayData?.expenses}
                  darkMode={darkMode}
                  compact={true}
                />
              </div>

              {/* Top Categories */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Top catégories</div>
                    <div className="chart-subtitle">Ce mois-ci</div>
                  </div>
                </div>

                <div className="category-list">
                  {[
                    { name: 'Alimentation', amount: 420, percentage: 35, icon: '🍽️' },
                    { name: 'Transport', amount: 280, percentage: 23, icon: '🚗' },
                    { name: 'Loisirs', amount: 180, percentage: 15, icon: '🎬' }
                  ].map((category, index) => (
                    <div key={category.name} className="category-item">
                      <div className="category-info">
                        <div className="category-emoji">{category.icon}</div>
                        <div className="category-details">
                          <div className="category-name">{category.name}</div>
                          <div className="category-meta">{category.percentage}% du total</div>
                        </div>
                      </div>
                      <div className="category-amount">
                        <div className="category-value">{formatCurrency(category.amount)}</div>
                        <div className="category-progress">
                          <div
                            className="category-progress-fill"
                            style={{width: `${category.percentage}%`}}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Income Overview */
            <div className="chart-grid">
              {/* Income Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Sources de revenus</div>
                    <div className="chart-subtitle">Diversification des entrées</div>
                  </div>
                  <div className="chart-icon" style={{background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', color: '#10B981'}}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <IncomeChart
                  data={displayData?.income}
                  darkMode={darkMode}
                  compact={true}
                />
              </div>

              {/* Income Sources */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Revenus ce mois</div>
                    <div className="chart-subtitle">Par source</div>
                  </div>
                </div>

                <div className="category-list">
                  {[
                    { name: 'Salaire principal', amount: 3200, percentage: 67, trend: '+2%', trending: 'up', icon: '💼' },
                    { name: 'Freelance', amount: 850, percentage: 18, trend: '+15%', trending: 'up', icon: '💻' },
                    { name: 'Investissements', amount: 420, percentage: 9, trend: '+8%', trending: 'up', icon: '📈' },
                    { name: 'Autres', amount: 280, percentage: 6, trend: '-5%', trending: 'down', icon: '💰' }
                  ].map((source, index) => (
                    <div key={source.name} className="category-item">
                      <div className="category-info">
                        <div className="category-emoji">{source.icon}</div>
                        <div className="category-details">
                          <div className="category-name">{source.name}</div>
                          <div className="category-meta">
                            {source.percentage}% du total
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              source.trending === 'up'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {source.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="category-amount">
                        <div className="category-value">{formatCurrency(source.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="action-group">
          <button className="action-button primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une transaction
          </button>
          <button
            onClick={() => setCurrentScreen(activeView === 'expenses' ? 'expenses-detail' : 'income-detail')}
            className="action-button secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Voir l'analyse détaillée
          </button>
        </div>

        {/* AI Insights */}
        <div className="insights-card">
          <div className="insights-header">
            <div>
              <div className="insights-title">Insights IA</div>
              <div className="insights-subtitle">
                Recommandations pour vos {activeView === 'expenses' ? 'dépenses' : 'revenus'}
              </div>
            </div>
            <div className="ai-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          <div>
            {activeView === 'expenses' ? (
              /* Expense Insights */
              [
                { icon: '💡', title: 'Optimisation possible', desc: 'Vous pouvez économiser 15% en réduisant vos dépenses de transport', color: 'bg-yellow-500/20 text-yellow-600' },
                { icon: '📊', title: 'Tendance', desc: 'Vos dépenses alimentaires ont augmenté de 12% ce mois', color: 'bg-blue-500/20 text-blue-600' },
                { icon: '🎯', title: 'Objectif', desc: 'Vous êtes à 85% de votre budget mensuel', color: 'bg-green-500/20 text-green-600' }
              ].map((insight, index) => (
                <div key={index} className="insight-item">
                  <div className={`insight-icon ${insight.color}`}>
                    <span>{insight.icon}</span>
                  </div>
                  <div className="insight-content">
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-description">{insight.desc}</div>
                  </div>
                </div>
              ))
            ) : (
              /* Income Insights */
              [
                { icon: '📈', title: 'Croissance', desc: 'Vos revenus freelance ont augmenté de 28% ce trimestre', color: 'bg-green-500/20 text-green-600' },
                { icon: '💼', title: 'Diversification', desc: 'Considérez ajouter une nouvelle source de revenus passifs', color: 'bg-blue-500/20 text-blue-600' },
                { icon: '🎯', title: 'Objectif', desc: 'Vous avez dépassé votre objectif de revenus de 8%', color: 'bg-purple-500/20 text-purple-600' }
              ].map((insight, index) => (
                <div key={index} className="insight-item">
                  <div className={`insight-icon ${insight.color}`}>
                    <span>{insight.icon}</span>
                  </div>
                  <div className="insight-content">
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-description">{insight.desc}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Footer */}
        <div className="security-footer">
          <div className="security-item">
            <svg className="security-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Chiffrement 256-bit</span>
          </div>
          <div className="security-item">
            <svg className="security-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
            <span>Conforme GDPR</span>
          </div>
          <div className="security-item">
            <svg className="security-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>PCI DSS Level 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;