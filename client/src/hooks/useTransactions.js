import { useState, useCallback, useEffect } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import tokenManager from '../utils/tokenManager';
import secureLogger from '../utils/secureLogger';

export const useTransactions = () => {
  // State avec fallback localStorage pour offline/loading
  const [transactions, setTransactions] = useState(() => {
    return loadFromLocalStorage('transactions', []);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour récupérer les transactions depuis l'API
  const fetchTransactions = async (options = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = tokenManager.getAccessToken();
      if (!token) {
        secureLogger.warn('Pas de token JWT valide, utilisation des données locales');
        return;
      }

      // Construire les paramètres de requête
      const params = new URLSearchParams({
        limit: options.limit || '50',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...options
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data?.transactions)) {
          const apiTransactions = data.data.transactions;
          setTransactions(apiTransactions);

          // Sauvegarder en localStorage pour le cache offline
          saveToLocalStorage('transactions', apiTransactions);

          secureLogger.success(`${apiTransactions.length} transactions récupérées depuis l'API`);
          return apiTransactions;
        }
      } else if (response.status === 401) {
        tokenManager.clearAccessToken();
        secureLogger.warn('Token expiré, redirection vers login nécessaire');
        setError('Session expirée');
      } else {
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (apiError) {
      secureLogger.error('Erreur API transactions:', apiError.message);
      setError(apiError.message);

      // Fallback: utiliser les données localStorage si API indisponible
      const localData = loadFromLocalStorage('transactions', []);
      setTransactions(localData);
      secureLogger.info('Utilisation des transactions locales en fallback');
      return localData;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ajouter une transaction d'économie via API
   * @param {number} amount - Montant économisé
   * @param {string} category - Catégorie associée
   * @param {string} description - Description de la transaction
   */
  const addTransaction = useCallback(async (amount, category, description) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = tokenManager.getAccessToken();
      if (!token) {
        // Mode offline - créer localement
        const localTransaction = {
          id: Date.now().toString(),
          amount,
          category,
          description: description || `Économie ${category}`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          type: 'saving'
        };

        setTransactions(prev => {
          const updated = [localTransaction, ...prev];
          saveToLocalStorage('transactions', updated);
          return updated;
        });

        secureLogger.info('Transaction ajoutée localement (mode offline)');

        // Déclencher l'événement pour mettre à jour le streak (même en mode offline)
        window.dispatchEvent(new CustomEvent('transactionAdded', {
          detail: {
            transaction: localTransaction,
            pointsEarned: 0,
            newStreak: 0
          }
        }));

        return localTransaction;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          description: description || `Économie ${category}`,
          type: 'saving'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.transaction) {
          const newTransaction = data.data.transaction;

          // Ajouter la nouvelle transaction au début de la liste
          setTransactions(prev => {
            const updated = [newTransaction, ...prev];
            saveToLocalStorage('transactions', updated);
            return updated;
          });

          secureLogger.success(`Transaction créée via API: ${amount}€ (${category})`);
          secureLogger.info(`Points gagnés: ${data.data.pointsEarned}, Streak: ${data.data.newStreak}`);

          // Déclencher l'événement pour mettre à jour le streak
          window.dispatchEvent(new CustomEvent('transactionAdded', {
            detail: {
              transaction: newTransaction,
              pointsEarned: data.data.pointsEarned,
              newStreak: data.data.newStreak
            }
          }));

          return {
            transaction: newTransaction,
            pointsEarned: data.data.pointsEarned,
            newStreak: data.data.newStreak
          };
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur création: ${response.status}`);
      }
    } catch (apiError) {
      secureLogger.error('Erreur création transaction:', apiError.message);
      setError(apiError.message);

      // Fallback: créer localement
      const fallbackTransaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        category,
        description: description || `Économie ${category}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: 'saving'
      };

      setTransactions(prev => {
        const updated = [fallbackTransaction, ...prev];
        saveToLocalStorage('transactions', updated);
        return updated;
      });

      secureLogger.info('Transaction créée localement en fallback');

      // Déclencher l'événement pour mettre à jour le streak (même en fallback)
      window.dispatchEvent(new CustomEvent('transactionAdded', {
        detail: {
          transaction: fallbackTransaction,
          pointsEarned: 0,
          newStreak: 0
        }
      }));

      return { transaction: fallbackTransaction, pointsEarned: 0, newStreak: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Supprimer une transaction par ID via API
   * @param {string} id - ID unique de la transaction
   */
  const removeTransaction = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        // Mode offline - supprimer localement
        setTransactions(prev => {
          const updated = prev.filter(t => t.id !== id);
          saveToLocalStorage('transactions', updated);
          return updated;
        });
        console.log('🏠 Transaction supprimée localement (mode offline)');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Supprimer de la liste locale
          setTransactions(prev => {
            const updated = prev.filter(t => t.id !== id);
            saveToLocalStorage('transactions', updated);
            return updated;
          });

          console.log(`✅ Transaction supprimée via API: ${id}`);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur suppression: ${response.status}`);
      }
    } catch (apiError) {
      console.error('❌ Erreur suppression transaction:', apiError.message);
      setError(apiError.message);

      // Fallback: supprimer localement quand même
      setTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        saveToLocalStorage('transactions', updated);
        return updated;
      });
      console.log('🏠 Transaction supprimée localement en fallback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mettre à jour une transaction via API
   * @param {string} id - ID de la transaction
   * @param {Object} updates - Champs à mettre à jour
   */
  const updateTransaction = useCallback(async (id, updates) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        // Mode offline - mettre à jour localement
        setTransactions(prev => {
          const updated = prev.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          );
          saveToLocalStorage('transactions', updated);
          return updated;
        });
        console.log('🏠 Transaction mise à jour localement (mode offline)');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Mettre à jour dans la liste locale
          setTransactions(prev => {
            const updated = prev.map(t => t.id === id ? data.data : t);
            saveToLocalStorage('transactions', updated);
            return updated;
          });

          console.log(`✅ Transaction mise à jour via API: ${id}`);
          return data.data;
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur mise à jour: ${response.status}`);
      }
    } catch (apiError) {
      console.error('❌ Erreur mise à jour transaction:', apiError.message);
      setError(apiError.message);

      // Fallback: mettre à jour localement
      setTransactions(prev => {
        const updated = prev.map(t =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        saveToLocalStorage('transactions', updated);
        return updated;
      });
      console.log('🏠 Transaction mise à jour localement en fallback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupérer les statistiques de transactions via API
   */
  const getTransactionStats = useCallback(async (period = 'month') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Pas de token JWT, impossible de récupérer les stats');
        return null;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/stats?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Statistiques de transactions récupérées (${period})`);
          return data.data;
        }
      } else {
        throw new Error(`Erreur stats: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur récupération stats:', error.message);
      return null;
    }
  }, []);

  // Charger les transactions au montage du hook
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchTransactions({ limit: 50 });
    }
  }, []); // Seulement au montage

  // Sauvegarder automatiquement les changements locaux
  useEffect(() => {
    saveToLocalStorage('transactions', transactions);
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    removeTransaction,
    updateTransaction,
    fetchTransactions,
    getTransactionStats,
    isLoading,
    error,
    hasApiConnection: !!localStorage.getItem('token'),

    // Méthodes legacy pour compatibilité avec le code existant
    setTransactions: (newTransactions) => {
      if (typeof newTransactions === 'function') {
        setTransactions(prev => {
          const updated = newTransactions(prev);
          saveToLocalStorage('transactions', updated);
          return updated;
        });
      } else {
        setTransactions(newTransactions);
        saveToLocalStorage('transactions', newTransactions);
      }
    }
  };
};