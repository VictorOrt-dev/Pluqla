import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';
import authService from '../../services/authService';

const LoginScreen = ({ darkMode = false }) => {
  const { t } = useTranslation();
  const { login, error, isLoading, clearError } = useAuth();
  const { setCurrentScreen } = useNavigation();

  const [isLoginMode, setIsLoginMode] = useState(() => {
    const authMode = localStorage.getItem('authMode');
    const loginMode = authMode === 'register' ? false : true;
    return loginMode;
  });
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
          // Nettoyer le authMode
          localStorage.removeItem('authMode');
          // Rediriger vers l'app principale (suite à action utilisateur)
          setCurrentScreen('home', true, true); // Marquer comme manuel car suite à action user
        }
      } else {
        // Inscription - utiliser authService pour cohérence
        const registerResult = await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword // Send for backend compatibility
        });


        if (registerResult.success) {
          // Auto-login après inscription réussie
          const loginResult = await login(formData.email, formData.password);
          if (loginResult.success) {
            // Nettoyer le authMode
            localStorage.removeItem('authMode');
            // Sauvegarder le fait que c'est un nouvel utilisateur pour démarrer l'onboarding au bon endroit
            localStorage.setItem('isNewUser', 'true');
            // Rediriger vers l'onboarding pour les nouveaux utilisateurs (suite à action utilisateur)
            setCurrentScreen('onboarding', true, true); // Marquer comme manuel car suite à action user
          }
        } else {
          console.error('❌ Erreur inscription:', registerResult.message);
          setFormErrors({ submit: registerResult.message || t('auth.errors.registerError') });
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
    // Nettoyer l'authMode quand l'utilisateur change de mode manuellement
    localStorage.removeItem('authMode');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'pluqla-bg-dark' : 'pluqla-bg-light'} flex flex-col justify-center px-4 py-6 relative overflow-hidden`}>

      {/* Background Elements Mobile */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/4 -left-10 w-32 h-32 ${darkMode ? 'bg-red-500/10' : 'bg-red-200/20'} rounded-full blur-2xl`}></div>
        <div className={`absolute bottom-1/4 -right-10 w-32 h-32 ${darkMode ? 'bg-red-700/10' : 'bg-red-300/20'} rounded-full blur-2xl`}></div>
      </div>

      {/* Language Selector Mobile */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector variant="minimal" />
      </div>

      {/* Content Mobile-First */}
      <div className="relative z-10 max-w-sm mx-auto w-full px-2">
        {/* Header Mobile */}
        <div className="text-center mb-6">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl pluqla-mascot-breathe" style={{ background: 'var(--pluqla-gradient-main)', boxShadow: 'var(--pluqla-shadow-card)' }}>
              <img
                src="/pluqla-logo.png"
                alt="Pluqla"
                className="w-8 h-8 object-contain opacity-90"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="text-2xl text-white font-bold hidden">🐱</span>
            </div>
          </div>

          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Pluqla
          </h1>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-1`}>
            {isLoginMode ? t('auth.login.title') : t('auth.register.title')}
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
            {isLoginMode ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>
        </div>

        {/* Formulaire Mobile */}
        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-white/50'} backdrop-blur-xl border rounded-2xl p-6 shadow-xl`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('auth.fields.name')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>👤</span>
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('auth.placeholders.name')}
                    className={`w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl border transition-all duration-300 text-base ${
                      formErrors.name
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20'
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
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>✉️</span>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('auth.placeholders.email')}
                  className={`w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl border transition-all duration-300 text-base ${
                    formErrors.email
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                      : darkMode
                      ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20'
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
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🔒</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('auth.placeholders.password')}
                  className={`w-full pl-10 pr-10 py-3 min-h-[48px] rounded-xl border transition-all duration-300 text-base ${
                    formErrors.password
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                      : darkMode
                      ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20'
                  } focus:outline-none focus:ring-4 backdrop-blur-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center min-h-[48px] min-w-[48px] justify-center ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'} transition-colors`}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🔒</span>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder={t('auth.placeholders.confirmPassword')}
                    className={`w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl border transition-all duration-300 text-base ${
                      formErrors.confirmPassword
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20 focus:ring-red-500/20'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 bg-gray-50/50 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20'
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
              <div className={`${darkMode ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-200'} border rounded-xl p-3`}>
                <p className={`${darkMode ? 'text-red-400' : 'text-red-600'} text-sm flex items-center`}>
                  <span className="mr-2">❌</span>
                  {formErrors.submit || error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 pluqla-btn-primary text-white font-semibold rounded-xl transition-all duration-300 min-h-[48px] ${
                isLoading
                  ? 'opacity-75 cursor-not-allowed'
                  : 'pluqla-hover-lift active:scale-95 shadow-lg hover:shadow-xl'
              } transform`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
          <div className="text-center mt-4">
            <button
              onClick={switchMode}
              className={`text-sm ${darkMode ? 'text-red-400 hover:text-blue-300' : 'text-red-600 hover:text-red-500'} transition-colors font-medium`}
            >
              {isLoginMode ? t('auth.login.switchToRegister') : t('auth.register.switchToLogin')}
            </button>
          </div>
        </div>

        {/* Security & Trust Mobile */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🔒</span>
              <span className="font-medium">{t('auth.security.ssl')}</span>
            </div>
            <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🇪🇺</span>
              <span className="font-medium">{t('auth.security.gdpr')}</span>
            </div>
            <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>🛡️</span>
              <span className="font-medium">{t('auth.security.secure')}</span>
            </div>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} leading-relaxed`}>
            {t('auth.security.dataProtection')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;