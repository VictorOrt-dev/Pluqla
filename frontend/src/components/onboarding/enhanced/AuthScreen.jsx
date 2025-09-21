import React, { useState } from 'react';
import { trackOnboardingEvent } from '../../../utils/analytics';

const AuthScreen = ({
  onNext,
  onPrevious,
  darkMode,
  isLoading,
  updateOnboardingData,
  showNotification,
  canGoBack
}) => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateForm = () => {
    const errors = {};

    if (!isLogin && !formData.name.trim()) {
      errors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Minimum 6 caractères';
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Nettoyer l'erreur quand l'utilisateur tape
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      trackOnboardingEvent('auth_validation_error', {
        isLogin,
        errors: Object.keys(formErrors)
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';

      const requestData = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password
          };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        // Sauvegarder le token
        if (data.tokens?.accessToken) {
          localStorage.setItem('token', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }

        // Mettre à jour les données d'onboarding
        updateOnboardingData({
          userData: {
            id: data.user?.id,
            name: data.user?.name || formData.name,
            email: data.user?.email || formData.email,
            isAuthenticated: true,
            authMethod: isLogin ? 'login' : 'register'
          },
          authCompleted: true
        });

        // Analytics
        trackOnboardingEvent('auth_success', {
          method: isLogin ? 'login' : 'register',
          email: formData.email
        });

        showNotification(
          isLogin ? 'Connexion réussie !' : 'Compte créé avec succès !',
          'success'
        );

        // Passer à l'étape suivante
        onNext({
          authData: {
            method: isLogin ? 'login' : 'register',
            user: data.user
          }
        });

      } else {
        // Gestion des erreurs
        const errorMessage = data.message || data.error || 'Une erreur est survenue';
        setFormErrors({ submit: errorMessage });

        trackOnboardingEvent('auth_error', {
          method: isLogin ? 'login' : 'register',
          error: errorMessage,
          status: response.status
        });

        showNotification(errorMessage, 'error');
      }

    } catch (error) {
      console.error('Erreur authentification:', error);
      const errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      setFormErrors({ submit: errorMessage });

      trackOnboardingEvent('auth_network_error', {
        method: isLogin ? 'login' : 'register',
        error: error.message
      });

      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: formData.email, // Garder l'email
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});

    trackOnboardingEvent('auth_mode_switch', {
      fromMode: isLogin ? 'login' : 'register',
      toMode: !isLogin ? 'login' : 'register'
    });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col justify-center px-6 py-8`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-white font-bold">{isLogin ? '🔑' : '👋'}</span>
        </div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
          {isLogin ? 'Bon retour !' : 'Créons ton compte'}
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {isLogin
            ? 'Connecte-toi pour accéder à tes économies personnalisées'
            : 'Quelques secondes pour débloquer ton potentiel d\'économies'
          }
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {!isLogin && (
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Ton prénom
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Marie"
              className={`w-full px-4 py-3 rounded-xl border transition-all ${
                formErrors.name
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : darkMode
                  ? 'border-gray-700 bg-gray-900 text-white focus:border-blue-500'
                  : 'border-gray-300 bg-white focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            {formErrors.name && (
              <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
            )}
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Adresse email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="ton.email@exemple.com"
            className={`w-full px-4 py-3 rounded-xl border transition-all ${
              formErrors.email
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : darkMode
                ? 'border-gray-700 bg-gray-900 text-white focus:border-blue-500'
                : 'border-gray-300 bg-white focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
          {formErrors.email && (
            <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Minimum 6 caractères"
              className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all ${
                formErrors.password
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : darkMode
                  ? 'border-gray-700 bg-gray-900 text-white focus:border-blue-500'
                  : 'border-gray-300 bg-white focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-blue-500`}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {formErrors.password && (
            <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
          )}
        </div>

        {!isLogin && (
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Confirmer le mot de passe
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirme ton mot de passe"
              className={`w-full px-4 py-3 rounded-xl border transition-all ${
                formErrors.confirmPassword
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : darkMode
                  ? 'border-gray-700 bg-gray-900 text-white focus:border-blue-500'
                  : 'border-gray-300 bg-white focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            {formErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
            )}
          </div>
        )}

        {formErrors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{formErrors.submit}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl transition-all ${
            isSubmitting
              ? 'opacity-75 cursor-not-allowed'
              : 'hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {isLogin ? 'Connexion...' : 'Création du compte...'}
            </span>
          ) : (
            <span>{isLogin ? '🚀 Se connecter' : '✨ Créer mon compte'}</span>
          )}
        </button>
      </form>

      {/* Switch Mode */}
      <div className="text-center mb-6">
        <button
          onClick={switchMode}
          className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition-colors`}
        >
          {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>

      {/* Security & Trust */}
      <div className={`text-center space-y-2 mb-6`}>
        <div className="flex items-center justify-center space-x-4 text-xs">
          <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            🔒 Chiffrement SSL
          </span>
          <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            🇪🇺 RGPD Conforme
          </span>
          <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            🛡️ Données sécurisées
          </span>
        </div>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Tes données personnelles sont protégées et jamais partagées
        </p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4">
        {canGoBack && (
          <button
            onClick={onPrevious}
            className={`flex-1 py-3 ${darkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-black hover:bg-gray-300'} rounded-xl transition-colors`}
          >
            ← Retour
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;