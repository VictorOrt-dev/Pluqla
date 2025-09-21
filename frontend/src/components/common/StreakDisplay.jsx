import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const StreakDisplay = ({ className = '' }) => {
  const { user, tokens } = useAuth();
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    fetchStreakData();
  }, [user, tokens]);

  const fetchStreakData = async () => {
    // Récupérer le token depuis le contexte d'auth ou localStorage en fallback
    const token = tokens?.accessToken || localStorage.getItem('token');

    if (!token) {
      setStreakData({ currentStreak: 0, isLoading: false, error: null });
      return;
    }

    try {
      setStreakData(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3004'}/api/strikes/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du streak');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setStreakData({
          currentStreak: data.data.currentStrike || 0,
          isLoading: false,
          error: null
        });
      } else {
        setStreakData({
          currentStreak: 0,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.warn('Erreur streak (non critique):', error);
      setStreakData({
        currentStreak: 0,
        isLoading: false,
        error: null // On cache l'erreur pour pas casser l'UX
      });
    }
  };

  // Mise à jour du streak quand l'utilisateur ajoute une économie
  useEffect(() => {
    const handleTransactionAdded = () => {
      // Attendre un peu pour que le backend traite la transaction
      setTimeout(() => {
        fetchStreakData();
      }, 500);
    };

    // Écouter l'événement personnalisé
    window.addEventListener('transactionAdded', handleTransactionAdded);

    return () => {
      window.removeEventListener('transactionAdded', handleTransactionAdded);
    };
  }, []);

  // Ne rien afficher si on charge encore ou s'il y a une erreur
  if (streakData.isLoading || streakData.error) {
    return null;
  }

  // Ne rien afficher si pas de streak pour garder l'interface épurée
  if (streakData.currentStreak === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <span className="text-orange-500 text-lg">🔥</span>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {streakData.currentStreak} jour{streakData.currentStreak > 1 ? 's' : ''}
      </span>
    </div>
  );
};

export default StreakDisplay;