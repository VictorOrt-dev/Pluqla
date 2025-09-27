import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import SavingsSummary from './SavingsSummary';
import ExpensesChart from './ExpensesChart';
import IncomeChart from './IncomeChart';
import SuggestionsCard from './SuggestionsCard';
import LoadingSpinner from '../common/LoadingSpinner';
import '../../styles/unified-theme.css';

const Dashboard = ({ darkMode }) => {
  const { t, i18n } = useTranslation();
  const { user, apiCall, isAuthenticated, authState } = useAuth();

  const { setCurrentScreen } = useNavigation();
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Vue d'ensemble avec cartes cliquables - affichage immédiat
  const animationStageRef = React.useRef(3); // Force tous les éléments à être visibles

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

  // Données d'exemple pour l'utilisateur si pas connecté
  const displayUser = user || {
    name: "Utilisateur Demo",
    savedAmount: 2100,
    monthlyGoal: 2500
  };

  // Fonction pour naviguer vers les vues détaillées

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 pluqla-font-family">
      {/* Premium Trust & Security Banner - Signature Pluqla Style */}
      <div className={`mb-6 pluqla-card-glass border ${
        darkMode
          ? 'border-gray-600/30 text-gray-200'
          : 'border-blue-200/50 text-blue-900'
      } pluqla-shadow-premium pluqla-hover-lift pluqla-fade-in`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 pluqla-gradient-success rounded-2xl flex items-center justify-center pluqla-shadow-lg">
              <span className="text-white text-xl">🔒</span>
            </div>
            <div>
              <h3 className="pluqla-h3 pluqla-text-gradient-primary mb-1">
                Données sécurisées & protégées
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="pluqla-badge info">
                  <span>🔒</span>
                  <span>SSL 256-bit</span>
                </span>
                <span className="pluqla-badge success">
                  <span>🇪🇺</span>
                  <span>GDPR</span>
                </span>
                <span className="pluqla-badge warning">
                  <span>🏦</span>
                  <span>PCI DSS</span>
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="pluqla-caption pluqla-text-muted mb-1">
              Sync: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="flex items-center justify-end space-x-2">
              <div className="w-3 h-3 pluqla-bg-success rounded-full animate-pulse"></div>
              <span className="pluqla-caption pluqla-text-success font-bold">En ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Financial Overview Cards */}
      <div className="space-y-8">
        <div className="pluqla-scale-in">
          <SavingsSummary
            data={displayData}
            userData={displayUser}
            darkMode={darkMode}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Premium Expenses Card */}
          <div
            onClick={() => setCurrentScreen('expenses-detail')}
            className="pluqla-financial-card group cursor-pointer"
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="pluqla-h3 pluqla-text-primary">Dépenses</h3>
                  <div className="flex items-center gap-2">
                    <span className="pluqla-metric-primary">
                      {displayData?.expenses?.total ?
                        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                          .format(displayData.expenses.total) :
                        '1,210€'
                      }
                    </span>
                    <span className="pluqla-trend-down pluqla-text-primary text-sm">-5.2%</span>
                  </div>
                </div>
                <div className="pluqla-avatar w-12 h-12">
                  📊
                </div>
              </div>
              <ExpensesChart
                data={displayData?.expenses}
                darkMode={darkMode}
                compact={true}
              />
              {/* Hover indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full pluqla-glass-backdrop backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm pluqla-text-primary">→</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Income Card */}
          <div
            onClick={() => setCurrentScreen('income-detail')}
            className="pluqla-financial-card group cursor-pointer"
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="pluqla-h3 pluqla-text-success">Revenus</h3>
                  <div className="flex items-center gap-2">
                    <span className="pluqla-metric-primary pluqla-text-success">
                      {displayData?.income?.total ?
                        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                          .format(displayData.income.total) :
                        '4,750€'
                      }
                    </span>
                    <span className="pluqla-trend-up pluqla-text-success text-sm">+2.8%</span>
                  </div>
                </div>
                <div className="pluqla-avatar w-12 h-12 pluqla-gradient-success">
                  📈
                </div>
              </div>
              <IncomeChart
                data={displayData?.income}
                darkMode={darkMode}
                compact={true}
              />
              {/* Hover indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full pluqla-glass-backdrop backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm pluqla-text-success">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium AI Suggestions Card */}
        <div
          onClick={() => setCurrentScreen('suggestions-detail')}
          className="pluqla-financial-card group cursor-pointer pluqla-slide-up"
        >
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="pluqla-h3 pluqla-text-info">Suggestions IA</h3>
                <p className="pluqla-caption pluqla-text-muted">Optimisations personnalisées</p>
              </div>
              <div className="pluqla-avatar w-12 h-12 pluqla-gradient-info">
                🤖
              </div>
            </div>
            <SuggestionsCard darkMode={darkMode} limit={3} />
            {/* Hover indicator */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full pluqla-glass-backdrop backdrop-blur-sm flex items-center justify-center">
                <span className="text-sm pluqla-text-info">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;