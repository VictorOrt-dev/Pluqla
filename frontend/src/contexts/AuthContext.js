import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext();

// États d'authentification
const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  TOKEN_EXPIRED: 'token_expired',
  REFRESHING: 'refreshing'
};

// Actions du reducer
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH_START: 'TOKEN_REFRESH_START',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

const initialState = {
  authState: AUTH_STATES.LOADING,
  user: null,
  tokens: {
    accessToken: null,
    refreshToken: null
  },
  error: null,
  isRefreshing: false
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        authState: AUTH_STATES.LOADING,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        authState: AUTH_STATES.AUTHENTICATED,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
        isRefreshing: false
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        authState: AUTH_STATES.UNAUTHENTICATED
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_START:
      return {
        ...state,
        authState: AUTH_STATES.REFRESHING,
        isRefreshing: true,
        error: null
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        authState: AUTH_STATES.AUTHENTICATED,
        tokens: action.payload.tokens,
        isRefreshing: false,
        error: null
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILED:
      return {
        ...initialState,
        authState: AUTH_STATES.UNAUTHENTICATED,
        error: action.payload.error
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        authState: action.payload.authState || state.authState
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { t } = useTranslation();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

  // Fonction pour sauvegarder les tokens
  const saveTokensToStorage = useCallback((tokens) => {
    if (tokens.accessToken) {
      localStorage.setItem('token', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }, []);

  // Fonction pour charger les tokens depuis localStorage
  const loadTokensFromStorage = useCallback(() => {
    return {
      accessToken: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  }, []);

  // Fonction pour supprimer les tokens
  const clearTokensFromStorage = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }, []);

  // Fonction pour rafraîchir le token
  const refreshAuthToken = useCallback(async () => {
    const { refreshToken } = loadTokensFromStorage();

    if (!refreshToken) {
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILED,
        payload: { error: t('auth.noRefreshToken') }
      });
      return false;
    }

    dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESH_START });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.tokens) {
        const newTokens = {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        };

        saveTokensToStorage(newTokens);

        dispatch({
          type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS,
          payload: { tokens: newTokens }
        });

        return true;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);

      clearTokensFromStorage();

      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILED,
        payload: { error: t('auth.sessionExpired') }
      });

      return false;
    }
  }, [API_BASE_URL, t, loadTokensFromStorage, saveTokensToStorage, clearTokensFromStorage]);

  // Fonction pour faire des appels API avec gestion automatique du token
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const { accessToken } = state.tokens.accessToken ? state.tokens : loadTokensFromStorage();

    if (!accessToken && !state.isRefreshing) {
      throw new Error('No authentication token found');
    }

    const makeRequest = async (authToken) => {
      const url = `${API_BASE_URL}${endpoint}`;
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      return await fetch(url, config);
    };

    try {
      let response = await makeRequest(accessToken);

      // Si 401, tenter de rafraîchir le token
      if (response.status === 401 && !state.isRefreshing) {
        console.log('Token expired, attempting to refresh...');

        const refreshSuccess = await refreshAuthToken();

        if (refreshSuccess) {
          // Refaire la requête avec le nouveau token
          const { accessToken: newAccessToken } = loadTokensFromStorage();
          response = await makeRequest(newAccessToken);
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }, [state.tokens, state.isRefreshing, API_BASE_URL, loadTokensFromStorage, refreshAuthToken]);

  // Fonction de connexion
  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();

      if (result.user && result.tokens) {
        const tokens = {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        };

        saveTokensToStorage(tokens);

        // Sauvegarder aussi les données utilisateur
        localStorage.setItem('userData', JSON.stringify(result.user));

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: result.user,
            tokens: tokens
          }
        });

        return { success: true, user: result.user };
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: {
          error: error.message,
          authState: AUTH_STATES.UNAUTHENTICATED
        }
      });
      return { success: false, error: error.message };
    }
  }, [API_BASE_URL, saveTokensToStorage]);

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    const { refreshToken } = loadTokensFromStorage();

    try {
      // Informer le serveur de la déconnexion
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Ne pas faire échouer la déconnexion si l'API échoue
    }

    // Nettoyer le storage local
    clearTokensFromStorage();

    // Mettre à jour l'état
    dispatch({ type: AUTH_ACTIONS.LOGOUT });

    return { success: true };
  }, [API_BASE_URL, loadTokensFromStorage, clearTokensFromStorage]);

  // Fonction pour vérifier l'état d'authentification au démarrage
  const checkAuthState = useCallback(async () => {
    const { accessToken, refreshToken } = loadTokensFromStorage();
    const savedUserData = localStorage.getItem('userData');

    if (!accessToken || !refreshToken) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: {
          authState: AUTH_STATES.UNAUTHENTICATED,
          error: null
        }
      });
      return;
    }

    try {
      // Vérifier si le token actuel est valide
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const user = result.user || (savedUserData ? JSON.parse(savedUserData) : null);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user,
            tokens: { accessToken, refreshToken }
          }
        });
      } else if (response.status === 401) {
        // Token expiré, essayer de le rafraîchir
        const refreshSuccess = await refreshAuthToken();

        if (!refreshSuccess) {
          dispatch({
            type: AUTH_ACTIONS.TOKEN_REFRESH_FAILED,
            payload: { error: t('auth.sessionExpired') }
          });
        }
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      console.error('Auth check failed:', error);

      clearTokensFromStorage();

      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: {
          authState: AUTH_STATES.UNAUTHENTICATED,
          error: null
        }
      });
    }
  }, [API_BASE_URL, loadTokensFromStorage, refreshAuthToken, clearTokensFromStorage, t]);

  // Vérifier l'authentification au montage
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Fonction pour mettre à jour les données utilisateur
  const updateUser = useCallback((userData) => {
    localStorage.setItem('userData', JSON.stringify(userData));
    dispatch({
      type: AUTH_ACTIONS.SET_USER,
      payload: { user: userData }
    });
  }, []);

  // Fonction pour nettoyer les erreurs
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // État
    authState: state.authState,
    user: state.user,
    tokens: state.tokens,
    error: state.error,
    isRefreshing: state.isRefreshing,

    // États calculés
    isAuthenticated: state.authState === AUTH_STATES.AUTHENTICATED,
    isLoading: state.authState === AUTH_STATES.LOADING || state.isRefreshing,

    // Actions
    login,
    logout,
    updateUser,
    clearError,
    apiCall,
    refreshAuthToken,

    // États d'authentification pour comparaison
    AUTH_STATES
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AUTH_STATES };
export default AuthContext;