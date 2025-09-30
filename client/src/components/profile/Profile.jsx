import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import LanguageSelector from '../common/LanguageSelector';
import StreakDisplay from '../common/StreakDisplay';
import LoadingSpinner from '../common/LoadingSpinner';

const Profile = ({ darkMode }) => {
  const { t, i18n } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Profile animation state
  React.useEffect(() => {
    // Component is ready for display
  }, []);

  // Listen for language changes
  React.useEffect(() => {
    const handleLanguageChange = (event) => {
      console.log('[Profile] Language changed to:', event.detail?.language || i18n.language);
      // Force re-render by updating state if needed
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [i18n.language]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    const confirmed = window.confirm(t('profile.logout.confirmMessage'));
    if (!confirmed) return;

    setIsLoggingOut(true);

    try {
      const result = await logout();
      if (result.success) {
        setCurrentScreen('onboarding');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      alert(t('profile.logout.error'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('common.notAvailable');

    try {
      return new Date(dateString).toLocaleDateString(
        t('common.locale'),
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );
    } catch (error) {
      return t('common.notAvailable');
    }
  };

  const getLevelTitle = (level) => {
    if (!level) return "Débutant";
    if (level <= 2) return "Débutant";
    if (level <= 5) return "Apprenti";
    if (level <= 10) return "Avancé";
    if (level <= 20) return "Expert";
    return "Maître";
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Chargement du profil..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className={`max-w-md p-6 rounded-2xl border ${
          darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{t('profile.userNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${
      darkMode
        ? 'pluqla-bg-dark'
        : 'bg-gradient-to-b from-[#FAFAFA] via-[#F9F9F9] to-[#F5F5F5]'
    }`}
    style={!darkMode ? {
      backgroundImage: `
        linear-gradient(135deg, rgba(241, 69, 69, 0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 25% 25%, rgba(241, 69, 69, 0.03) 0%, transparent 60%),
        radial-gradient(ellipse at 75% 75%, rgba(241, 69, 69, 0.02) 0%, transparent 60%)
      `
    } : {}}>

      {/* Header matching HomeScreen */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        darkMode
          ? 'bg-gradient-to-b from-[#121212] to-[#1a0b0b] border-b-2 border-[#F14545]/30'
          : 'bg-gradient-to-b from-[#FAFAFA]/95 to-[#F5F5F5]/95 border-b-2 border-[#F14545]/20 shadow-sm'
      } backdrop-blur-xl`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => setCurrentScreen('home')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
                darkMode
                  ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
                  : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title with brand colors and debug info */}
            <div className="flex items-center gap-3">
              <h1 className={`text-xl font-bold ${
                darkMode
                  ? 'text-white drop-shadow-[0_0_4px_rgba(241,69,69,0.4)]'
                  : 'text-[#F14545] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
              } transition-colors duration-200`}>
                {t('profile.title')}
              </h1>
              <div className={`px-2 py-1 rounded-md text-xs font-mono ${
                darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
              } border border-yellow-500/30`}>
                {i18n.language}
              </div>
            </div>

            {/* Debug Language Indicator */}
            <div className={`flex items-center space-x-2 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            } px-2 py-1 rounded-lg`}>
              <span className="text-xs font-mono text-[#F14545]">
                {i18n.language || 'fr'}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                user.status === 'active' ? 'bg-green-500' : 'bg-[#F14545]'
              } animate-pulse`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4 pb-20 pt-6">

        {/* User Profile Card */}
        <div className={`rounded-2xl shadow-lg p-6 mb-6 overflow-hidden transition-all duration-300 hover:scale-105 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 hover:border-[#F14545]/50'
            : 'bg-gradient-to-br from-white/98 to-[#FAFAFA]/95 border border-gray-200 hover:border-[#F14545]/40'
        } backdrop-blur-sm hover:shadow-xl`}>

          {/* Profile Header */}
          <div className="flex items-center space-x-4 mb-6">
            {/* Avatar with Pluqla Cherry Red gradient */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F14545] to-[#D73030] flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-xl">
                  {getInitials(user.name)}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-[#121212]'
              }`}>
                {user.name || 'Utilisateur'}
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {user.email}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  user.isPremium
                    ? 'bg-gradient-to-r from-[#F14545] to-[#D73030] text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                }`}>
                  {user.isPremium ? '⭐ Premium' : '🆓 Gratuit'}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">🔥</span>
                  <StreakDisplay />
                </div>
              </div>
            </div>

            {/* Level Badge */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F14545] to-[#D73030] flex items-center justify-center shadow-lg mb-1">
                <span className="text-white font-bold text-sm">
                  {user.level || 1}
                </span>
              </div>
              <p className={`text-xs font-medium ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getLevelTitle(user.level)}
              </p>
            </div>
          </div>

          {/* User Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/70'
            } backdrop-blur-sm`}>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              } mb-1`}>
                Membre depuis
              </p>
              <p className={`text-sm font-semibold ${
                darkMode ? 'text-white' : 'text-[#121212]'
              }`}>
                {formatDate(user.createdAt)}
              </p>
            </div>

            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/70'
            } backdrop-blur-sm`}>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              } mb-1`}>
                Dernière connexion
              </p>
              <p className={`text-sm font-semibold ${
                darkMode ? 'text-white' : 'text-[#121212]'
              }`}>
                {formatDate(user.lastLoginAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          {/* Edit Profile Card */}
          <div className={`rounded-2xl shadow-lg p-4 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 hover:border-[#F14545]/50'
              : 'bg-gradient-to-br from-white/98 to-[#FAFAFA]/95 border border-gray-200 hover:border-[#F14545]/40'
          } backdrop-blur-sm hover:shadow-xl`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-lg">✏️</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-[#121212]'
                }`}>
                  Éditer le profil
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Modifier vos informations
                </p>
              </div>
            </div>
          </div>

          {/* Language Settings Card */}
          <div className={`rounded-2xl shadow-lg p-4 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 hover:border-[#F14545]/50'
              : 'bg-gradient-to-br from-white/98 to-[#FAFAFA]/95 border border-gray-200 hover:border-[#F14545]/40'
          } backdrop-blur-sm hover:shadow-xl`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-lg">🌍</span>
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-[#121212]'
                }`}>
                  Langue
                </h3>
                <div className="mt-1">
                  <LanguageSelector variant="dropdown" showLabels={true} darkMode={darkMode} />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className={`rounded-2xl shadow-lg p-4 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 hover:border-[#F14545]/50'
              : 'bg-gradient-to-br from-white/98 to-[#FAFAFA]/95 border border-gray-200 hover:border-[#F14545]/40'
          } backdrop-blur-sm hover:shadow-xl`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-lg">🔔</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-[#121212]'
                }`}>
                  Notifications
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Gérer les alertes
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings Card */}
          <div className={`rounded-2xl shadow-lg p-4 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 hover:border-[#F14545]/50'
              : 'bg-gradient-to-br from-white/98 to-[#FAFAFA]/95 border border-gray-200 hover:border-[#F14545]/40'
          } backdrop-blur-sm hover:shadow-xl`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-lg">🔒</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-[#121212]'
                }`}>
                  Sécurité
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Mot de passe et sécurité
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Card */}
        <div className={`rounded-2xl shadow-lg p-4 overflow-hidden transition-all duration-300 hover:scale-105 ${
          darkMode
            ? 'bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-700/50 hover:border-red-600/70'
            : 'bg-gradient-to-br from-red-50/80 to-red-100/80 border border-red-200/50 hover:border-red-300/70'
        } backdrop-blur-sm hover:shadow-xl`}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full text-left transition-all duration-300 ${
              isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-red-800/50' : 'bg-red-200/50'
                }`}>
                  <span className="text-lg">🚪</span>
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${
                    darkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                  </h3>
                  <p className={`text-sm ${
                    darkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    Retour à la page de connexion
                  </p>
                </div>
              </div>
              {isLoggingOut && (
                <LoadingSpinner size="small" />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;