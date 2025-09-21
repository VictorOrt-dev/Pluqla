import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import SavingsSummary from './SavingsSummary';
import ExpensesChart from './ExpensesChart';
import IncomeChart from './IncomeChart';
import SuggestionsCard from './SuggestionsCard';
import LoadingSpinner from '../common/LoadingSpinner';

const Dashboard = ({ darkMode }) => {
  const { t, i18n } = useTranslation();
  const { user, apiCall, isAuthenticated, authState } = useAuth();

  const { setCurrentScreen } = useNavigation();
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Toujours afficher la vue d'ensemble avec cartes cliquables
  const [animationStage, setAnimationStage] = useState(3); // Force tous les éléments à être visibles

  const fetchFinancialData = useCallback(async () => {
    if (!isAuthenticated || !apiCall) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await apiCall(`/financial/summary?lang=${i18n.language}&period=month`);
      const data = result.data || result;
      setFinancialData(data);

      // Affichage immédiat
      setAnimationStage(3);

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
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      {/* Vue d'ensemble avec cartes cliquables */}
      <div className="space-y-4 sm:space-y-6">
        <div className="opacity-100 transition-opacity duration-300">
          <SavingsSummary
            data={displayData}
            userData={displayUser}
            darkMode={darkMode}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 opacity-100 transition-opacity duration-300">
          {/* Carte Dépenses - Cliquable */}
          <div
            onClick={() => setCurrentScreen('expenses-detail')}
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            <ExpensesChart
              data={displayData?.expenses}
              darkMode={darkMode}
              compact={true}
            />
          </div>

          {/* Carte Revenus - Cliquable */}
          <div
            onClick={() => setCurrentScreen('income-detail')}
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            <IncomeChart
              data={displayData?.income}
              darkMode={darkMode}
              compact={true}
            />
          </div>
        </div>

        {/* Carte Suggestions - Cliquable */}
        <div
          onClick={() => setCurrentScreen('suggestions-detail')}
          className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl opacity-100 transition-opacity duration-300"
        >
          <SuggestionsCard darkMode={darkMode} limit={3} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;