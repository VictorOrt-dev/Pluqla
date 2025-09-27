import { useState, useEffect } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { INITIAL_USER_DATA } from '../utils/constants';

export const useUserData = () => {
  // State avec fallback localStorage pour offline/loading
  const [userData, setUserData] = useState(() =>
    loadFromLocalStorage('userData', INITIAL_USER_DATA)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour récupérer le profil utilisateur depuis l'API
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Pas de token JWT, utilisation des données locales');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const apiUserData = {
            // Mapper les données API vers le format attendu par le frontend
            id: data.data.id,
            name: data.data.name || 'Utilisateur',
            email: data.data.email,
            savedAmount: data.data.savedAmount || 0,
            monthlyGoal: data.data.monthlyGoal || 800,
            streak: data.data.streak || 0,
            level: data.data.level || 1,
            xp: data.data.gamificationPoints || 0, // Map gamificationPoints to xp
            plansUsedThisMonth: data.data.plansUsedThisMonth || 0,
            isPremium: data.data.isPremium || false,
            joinDate: data.data.createdAt || new Date().toISOString(),

            // Données supplémentaires de l'API
            badges: data.data.badges || [],
            recentTransactions: data.data.recentTransactions || [],
            accounts: data.data.accounts || [],
            financialGoals: data.data.financialGoals || [],
            todayChallenges: data.data.todayChallenges || [],

            // Statistiques dynamiques
            progressToGoal: data.data.progressToGoal || 0,
            lastLoginAt: data.data.lastLoginAt,

            // Inclure les statistiques calculées si disponibles
            ...data.data.stats
          };

          setUserData(apiUserData);

          // Sauvegarder en localStorage pour le cache offline
          saveToLocalStorage('userData', apiUserData);

          console.log('✅ Profil utilisateur récupéré depuis l\'API');
        }
      } else if (response.status === 401) {
        // Token expiré
        localStorage.removeItem('token');
        console.warn('Token expiré, redirection vers login nécessaire');
        setError('Session expirée');
      } else {
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (apiError) {
      console.error('❌ Erreur API userData:', apiError.message);
      setError(apiError.message);

      // Fallback: utiliser les données localStorage si API indisponible
      const localData = loadFromLocalStorage('userData', INITIAL_USER_DATA);
      setUserData(localData);
      console.log('🏠 Utilisation des données locales en fallback');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour le profil utilisateur
  const updateUserData = async (updates) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        // Mode offline - juste mettre à jour localement
        setUserData(prev => ({ ...prev, ...updates }));
        saveToLocalStorage('userData', { ...userData, ...updates });
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/users/profile`, {
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
          // Mettre à jour avec la réponse de l'API
          const updatedData = { ...userData, ...data.data };
          setUserData(updatedData);
          saveToLocalStorage('userData', updatedData);
          console.log('✅ Profil utilisateur mis à jour via API');
        }
      } else {
        throw new Error(`Erreur mise à jour: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour userData:', error.message);
      setError(error.message);

      // Fallback: mise à jour locale
      setUserData(prev => ({ ...prev, ...updates }));
      saveToLocalStorage('userData', { ...userData, ...updates });
      console.log('🏠 Mise à jour locale en fallback');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger le profil au montage du hook
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    }
  }, []); // Seulement au montage

  // Fonction legacy pour compatibilité (setUserData direct)
  const setUserDataLegacy = (newData) => {
    if (typeof newData === 'function') {
      setUserData(prev => {
        const updated = newData(prev);
        saveToLocalStorage('userData', updated);
        return updated;
      });
    } else {
      setUserData(newData);
      saveToLocalStorage('userData', newData);
    }
  };

  return [
    userData,
    setUserDataLegacy, // Garde la compatibilité avec l'usage existant
    {
      updateUserData, // Nouvelle méthode avec API
      fetchUserProfile, // Pour rafraîchir manuellement
      isLoading,
      error,
      hasApiConnection: !!localStorage.getItem('token')
    }
  ];
};