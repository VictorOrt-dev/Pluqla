import { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getRoutes, getBestOption, calculateSavings } from '../utils/transportData';

export const useTransport = () => {
  const { state, dispatch } = useAppContext();
  const [selectedRoute, setSelectedRoute] = useState(null);

  const routes = useMemo(() => getRoutes(), []);

  const addTrip = useCallback((routeId, transportOption, actualDuration) => {
    const trip = {
      id: Date.now(),
      routeId,
      transportOption,
      actualDuration,
      date: new Date().toISOString(),
      cost: transportOption.cost,
      co2: transportOption.co2
    };

    dispatch({ type: 'ADD_TRIP', payload: trip });
  }, [dispatch]);

  const getBestRouteOption = useCallback((route) => {
    return getBestOption(route, state.transportPreferences.criteria);
  }, [state.transportPreferences.criteria]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const monthlyTrips = state.tripHistory.filter(trip =>
      new Date(trip.date) >= oneMonthAgo
    );

    const totalCost = monthlyTrips.reduce((sum, trip) => sum + trip.cost, 0);
    const totalCO2 = monthlyTrips.reduce((sum, trip) => sum + trip.co2, 0);
    const totalTrips = monthlyTrips.length;

    return {
      totalCost: totalCost.toFixed(2),
      totalCO2: Math.round(totalCO2),
      totalTrips,
      averageCost: totalTrips > 0 ? (totalCost / totalTrips).toFixed(2) : '0'
    };
  }, [state.tripHistory]);

  const updatePreferences = useCallback((newPreferences) => {
    dispatch({
      type: 'UPDATE_TRANSPORT_PREFERENCES',
      payload: newPreferences
    });
  }, [dispatch]);

  return {
    routes,
    selectedRoute,
    tripHistory: state.tripHistory,
    preferences: state.transportPreferences,
    monthlyStats,
    setSelectedRoute,
    addTrip,
    getBestRouteOption,
    updatePreferences,
    calculateSavings
  };
};