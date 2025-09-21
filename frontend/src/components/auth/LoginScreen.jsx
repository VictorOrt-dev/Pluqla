import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';

const LoginScreen = ({ darkMode = false }) => {
  const { t } = useTranslation();
  const { login, error, isLoading, clearError } = useAuth();
  const { setCurrentScreen } = useNavigation();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
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

    if (!isLoginMode && !formData.name.trim()) {
      errors.name = t('auth.validation.nameRequired');
    }

    if (!formData.email.trim()) {
      errors.email = t('auth.validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      errors.email = t('auth.validation.emailInvalid');
    }

    if (!formData.password) {
      errors.password = t('auth.validation.passwordRequired');
    } else if (!validatePassword(formData.password)) {
      errors.password = t('auth.validation.passwordMinLength');
    }

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordMismatch');
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
    // Nettoyer l'erreur d'auth si elle existe
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isLoginMode) {
        // Connexion
        const result = await login(formData.email, formData.password);
        if (result.success) {
          // Rediriger vers l'app principale
          setCurrentScreen('home');
        }
      } else {
        // Inscription - à implémenter avec l'API register
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Auto-login après inscription réussie
          const loginResult = await login(formData.email, formData.password);
          if (loginResult.success) {
            // Sauvegarder le fait que c'est un nouvel utilisateur pour démarrer l'onboarding au bon endroit
            localStorage.setItem('isNewUser', 'true');
            // Rediriger vers l'onboarding pour les nouveaux utilisateurs
            setCurrentScreen('onboarding');
          }
        } else {
          setFormErrors({ submit: data.message || t('auth.errors.registerError') });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setFormErrors({ submit: t('auth.errors.networkError') });
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({
      name: '',
      email: formData.email, // Garder l'email
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    clearError();
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'} flex flex-col justify-center px-6 py-8 relative overflow-hidden`}>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/4 -left-20 w-72 h-72 ${darkMode ? 'bg-blue-500/10' : 'bg-blue-200/30'} rounded-full blur-3xl`}></div>
        <div className={`absolute bottom-1/4 -right-20 w-72 h-72 ${darkMode ? 'bg-purple-500/10' : 'bg-purple-200/30'} rounded-full blur-3xl`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${darkMode ? 'bg-indigo-500/5' : 'bg-indigo-200/20'} rounded-full blur-3xl`}></div>
      </div>

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector variant="minimal" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto w-full">
        {/* Header avec animation */}
        <div className="text-center mb-8">
          <div className="relative mb-8">
            <div className={`w-24 h-24 ${darkMode ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300`}>
              <div className="relative">
                <span className="text-4xl text-white font-bold">+</span>
                <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-3xl blur opacity-50 -z-10 animate-pulse`}></div>
              </div>
            </div>
            <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'} rounded-full blur-2xl -z-10`}></div>
          </div>

          <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
            +Clair
          </h1>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-2`}>
            {isLoginMode ? t('auth.login.title') : t('auth.register.title')}
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-sm mx-auto leading-relaxed`}>
            {isLoginMode ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>
        </div>

        {/* Formulaire avec design moderne */}
        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-white/50'} backdrop-blur-xl border rounded-3xl p-8 shadow-2xl`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLoginMode && (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('auth.fields.name')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>👤</span>
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('auth.placeholders.name')}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all duration-300 ${
                      formErrors.name
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                        : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                    } focus:outline-none focus:ring-4 backdrop-blur-sm`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-red-500 text-sm flex items-center mt-2">
                    <span className="mr-1">⚠️</span>
                    {formErrors.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {t('auth.fields.email')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>✉️</span>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('auth.placeholders.email')}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all duration-300 ${
                    formErrors.email
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                      : darkMode
                      ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                      : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                  } focus:outline-none focus:ring-4 backdrop-blur-sm`}
                />
              </div>
              {formErrors.email && (
                <p className="text-red-500 text-sm flex items-center mt-2">
                  <span className="mr-1">⚠️</span>
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {t('auth.fields.password')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🔒</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('auth.placeholders.password')}
                  className={`w-full pl-12 pr-12 py-4 rounded-2xl border transition-all duration-300 ${
                    formErrors.password
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                      : darkMode
                      ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                      : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                  } focus:outline-none focus:ring-4 backdrop-blur-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'} transition-colors`}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-sm flex items-center mt-2">
                  <span className="mr-1">⚠️</span>
                  {formErrors.password}
                </p>
              )}
            </div>

            {!isLoginMode && (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('auth.fields.confirmPassword')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🔒</span>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder={t('auth.placeholders.confirmPassword')}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all duration-300 ${
                      formErrors.confirmPassword
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                        : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                    } focus:outline-none focus:ring-4 backdrop-blur-sm`}
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-red-500 text-sm flex items-center mt-2">
                    <span className="mr-1">⚠️</span>
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {(formErrors.submit || error) && (
              <div className={`${darkMode ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-200'} border rounded-2xl p-4`}>
                <p className={`${darkMode ? 'text-red-400' : 'text-red-600'} text-sm flex items-center`}>
                  <span className="mr-2">❌</span>
                  {formErrors.submit || error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl transition-all duration-300 ${
                isLoading
                  ? 'opacity-75 cursor-not-allowed'
                  : 'hover:from-blue-600 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              } transform`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  {isLoginMode ? t('auth.login.loading') : t('auth.register.loading')}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">{isLoginMode ? '🚀' : '✨'}</span>
                  {isLoginMode ? t('auth.login.submit') : t('auth.register.submit')}
                </span>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="text-center mt-6">
            <button
              onClick={switchMode}
              className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition-colors font-medium`}
            >
              {isLoginMode ? t('auth.login.switchToRegister') : t('auth.register.switchToLogin')}
            </button>
          </div>
        </div>

        {/* Security & Trust */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center space-x-6">
            <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🔒</span>
              <span className="text-xs font-medium">{t('auth.security.ssl')}</span>
            </div>
            <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🇪🇺</span>
              <span className="text-xs font-medium">{t('auth.security.gdpr')}</span>
            </div>
            <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🛡️</span>
              <span className="text-xs font-medium">{t('auth.security.secure')}</span>
            </div>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} max-w-sm mx-auto leading-relaxed`}>
            {t('auth.security.dataProtection')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;