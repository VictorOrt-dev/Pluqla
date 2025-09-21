import { useState, useCallback, useMemo } from 'react';
import { getActivities, calculateCaloriesBurned, generateWeeklyPlan } from '../utils/activityData';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';

export const useActivity = () => {
  const [activityHistory, setActivityHistory] = useState(() =>
    loadFromLocalStorage('activityHistory', [])
  );
  const [userProfile, setUserProfile] = useState(() =>
    loadFromLocalStorage('activityProfile', {
      weight: 70,
      level: 'beginner',
      goals: ['fitness'],
      preferredActivities: []
    })
  );

  const activities = useMemo(() => getActivities(), []);

  const logActivity = useCallback((activityId, duration, intensity = 'modérée') => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const caloriesBurned = calculateCaloriesBurned(activity, duration, userProfile.weight);
    
    const logEntry = {
      id: Date.now(),
      activityId,
      activityName: activity.name,
      duration,
      intensity,
      caloriesBurned,
      date: new Date().toISOString()
    };

    setActivityHistory(prev => {
      const updated = [logEntry, ...prev];
      saveToLocalStorage('activityHistory', updated);
      return updated;});
  }, [activities, userProfile.weight]);

  const getWeeklyStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyActivities = activityHistory.filter(activity => 
      new Date(activity.date) >= oneWeekAgo
    );

    const totalDuration = weeklyActivities.reduce((sum, activity) => sum + activity.duration, 0);
    const totalCalories = weeklyActivities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
    const sessionsCount = weeklyActivities.length;

    return {
      totalDuration,
      totalCalories,
      sessionsCount,
      averageDuration: sessionsCount > 0 ? Math.round(totalDuration / sessionsCount) : 0
    };
  }, [activityHistory]);

  const getRecommendations = useMemo(() => {
    return generateWeeklyPlan(activities, userProfile.level);
  }, [activities, userProfile.level]);

  const updateProfile = useCallback((updates) => {
    setUserProfile(prev => {
      const updated = { ...prev, ...updates };
      saveToLocalStorage('activityProfile', updated);
      return updated;
    });
  }, []);

  return {
    activities,
    activityHistory,
    userProfile,
    weeklyStats: getWeeklyStats,
    recommendations: getRecommendations,
    logActivity,
    updateProfile
  };
};