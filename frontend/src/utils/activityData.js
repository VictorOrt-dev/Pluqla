import activitiesData from '../data/activities.json';

export const getActivities = () => {
  return activitiesData;
};

export const getActivityById = (id) => {
  return activitiesData.find(activity => activity.id === id);
};

export const calculateCaloriesBurned = (activity, duration, weight = 70) => {
  // Calcul approximatif basé sur le poids (70kg par défaut)
  const baseCalories = activity.caloriesPerMinute * duration;
  const weightFactor = weight / 70;
  return Math.round(baseCalories * weightFactor);
};

export const getRecommendationForLevel = (activity, level) => {
  return activity.recommendations[level] || activity.recommendations.beginner;
};

export const generateWeeklyPlan = (activities, userLevel = 'beginner') => {
  return activities.map(activity => ({
    ...activity,
    weeklyPlan: getRecommendationForLevel(activity, userLevel)
  }));
};