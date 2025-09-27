import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { INITIAL_USER_DATA } from '../utils/constants';

const AppContext = createContext();

const initialState = {
  userData: {
    ...INITIAL_USER_DATA,
    ...loadFromLocalStorage('userData', {}),
    // Initialiser les données de gamification si elles n'existent pas
    gamificationPoints: loadFromLocalStorage('userData', {}).gamificationPoints || 0,
    badges: loadFromLocalStorage('userData', {}).badges || [],
    dailyChallenges: loadFromLocalStorage('userData', {}).dailyChallenges || {}
  },
  notifications: [],
  transactions: loadFromLocalStorage('transactions', []),
  tripHistory: loadFromLocalStorage('tripHistory', []),
  transportPreferences: loadFromLocalStorage('transportPreferences', {
    criteria: 'cost',
    defaultTransport: 'public'
  })
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER_DATA':
      return { ...state, userData: action.payload };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.payload]
      };

    case 'REMOVE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload)
      };

    case 'ADD_TRIP':
      const updatedHistory = [action.payload, ...state.tripHistory].slice(0, 50);
      return {
        ...state,
        tripHistory: updatedHistory
      };

    case 'UPDATE_TRANSPORT_PREFERENCES':
      return {
        ...state,
        transportPreferences: { ...state.transportPreferences, ...action.payload }
      };

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    saveToLocalStorage('userData', state.userData);
  }, [state.userData]);

  useEffect(() => {
    saveToLocalStorage('transactions', state.transactions);
  }, [state.transactions]);

  useEffect(() => {
    saveToLocalStorage('tripHistory', state.tripHistory);
  }, [state.tripHistory]);

  useEffect(() => {
    saveToLocalStorage('transportPreferences', state.transportPreferences);
  }, [state.transportPreferences]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};