import React, { useState, useEffect, memo } from 'react';
import { useGamification } from '../../hooks/useGamification';

const DailyChallenge = memo(({ addTransaction, setUserData, darkMode }) => {
  const { getDailyChallenges, completeChallenge } = useGamification();
  const [challenges, setChallenges] = useState([]);
  const [completedToday, setCompletedToday] = useState(0);

  useEffect(() => {
    const dailyChallenges = getDailyChallenges();
    setChallenges(dailyChallenges);
    setCompletedToday(dailyChallenges.filter(c => c.completed).length);
  }, [getDailyChallenges]);

  const handleChallengeComplete = (challengeId) => {
    // Compléter le défi via le système de gamification
    completeChallenge(challengeId);

    // Ajouter une transaction
    addTransaction(10, 'defi', 'Défi quotidien complété');

    // Mettre à jour le streak
    setUserData(prev => ({ ...prev, streak: prev.streak + 1 }));

    // Rafraîchir les défis
    const updatedChallenges = getDailyChallenges();
    setChallenges(updatedChallenges);
    setCompletedToday(updatedChallenges.filter(c => c.completed).length);
  };

  const totalChallenges = challenges.length;
  const progressPercent = totalChallenges > 0 ? (completedToday / totalChallenges) * 100 : 0;

  return (
    <div className="mt-4 space-y-3">
      {/* En-tête des défis avec progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🎯 Défis du jour
          <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-1 rounded-full">
            {completedToday}/{totalChallenges}
          </span>
        </h3>
        {progressPercent === 100 && (
          <div className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            ✅ Terminé !
          </div>
        )}
      </div>

      {/* Barre de progression globale */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Liste des défis */}
      <div className="space-y-2">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => !challenge.completed && handleChallengeComplete(challenge.id)}
            disabled={challenge.completed}
            className={`w-full border rounded-xl p-3 flex items-center justify-between transition-all duration-200 ${
              challenge.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-75'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:scale-[1.02]'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                challenge.completed
                  ? 'bg-green-500'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
              }`}>
                <span className="text-white">
                  {challenge.completed ? '✅' : '🎯'}
                </span>
              </div>
              <div className="text-left">
                <p className={`font-medium text-sm ${
                  challenge.completed
                    ? 'text-green-700 dark:text-green-300 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {challenge.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {challenge.completed ? 'Complété !' : `+${challenge.points} points`}
                </p>
              </div>
            </div>
            {!challenge.completed && (
              <span className="text-blue-500 dark:text-blue-400 text-sm">→</span>
            )}
          </button>
        ))}
      </div>

      {/* Bonus de complétion */}
      {progressPercent === 100 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-center">
          <span className="text-2xl mb-2 block">🏆</span>
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Tous les défis complétés !
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            +20 points bonus • Revenez demain pour de nouveaux défis
          </p>
        </div>
      )}
    </div>
  );
});

DailyChallenge.displayName = 'DailyChallenge';

export default DailyChallenge;