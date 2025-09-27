import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import LanguageSelector from '../common/LanguageSelector';
import StreakDisplay from '../common/StreakDisplay';
import LoadingSpinner from '../common/LoadingSpinner';

const Profile = ({ darkMode }) => {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Profile animation state
  React.useEffect(() => {
    // Component is ready for display
  }, []);

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
    <div className={`min-h-screen relative ${
      darkMode
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    } transition-all duration-500`}>

      {/* Glassmorphism Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-xl ${
        darkMode
          ? 'bg-gray-900/80 border-gray-700/50'
          : 'bg-white/80 border-gray-200/50'
      } border-b shadow-lg`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Back Button & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentScreen('home')}
                className={`group p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 pluqla-hover-lift ${
                  darkMode
                    ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 hover:from-gray-700 hover:to-gray-600 text-gray-300 hover:text-white'
                    : 'pluqla-card-light hover:shadow-xl text-gray-600 hover:text-gray-900'
                } shadow-lg hover:shadow-2xl`}
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="space-y-1">
                <h1 className={`pluqla-title-medium bg-gradient-to-r ${
                  darkMode
                    ? 'from-white via-gray-200 to-gray-300'
                    : 'from-gray-900 via-red-600 to-gray-700'
                } bg-clip-text text-transparent`}>
                  👤 {t('profile.title')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } font-medium`}>
                  {t('profile.subtitle')}
                </p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`}></div>
              <span className={`text-xs font-medium ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {user.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Enhanced Profile Card with Pluqla Styling */}
        <div className={`relative overflow-hidden rounded-3xl pluqla-scale-bounce ${
          darkMode
            ? 'pluqla-card-dark bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700/30'
            : 'pluqla-card-light bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/20'
        } shadow-2xl hover:shadow-3xl transition-all duration-500`}>
          <div className="relative p-8">
            {/* Profile Header */}
            <div className="flex items-center space-x-6 mb-8">
              {/* Avatar */}
              <div className="relative group">
                <div className={`w-20 h-20 rounded-3xl ${
                  darkMode
                    ? 'bg-gradient-to-br from-blue-600 to-red-700'
                    : 'bg-gradient-to-br pluqla-gradient-main'
                } flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-105`}>
                  <span className="text-white font-bold text-2xl">
                    {getInitials(user.name)}
                  </span>
                </div>

                {/* Edit Avatar Button */}
                <button className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                } flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 shadow-lg`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className={`text-2xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user.name || 'Utilisateur'}
                </h2>
                <p className={`text-base mb-3 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {user.email}
                </p>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    user.isPremium
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                      : darkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {user.isPremium ? '⭐ Premium' : '🆓 Gratuit'}
                  </span>
                  <StreakDisplay />
                </div>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl ${
                darkMode ? 'bg-gray-800/50' : 'bg-white/50'
              } backdrop-blur-sm`}>
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } mb-1`}>
                  Membre depuis
                </p>
                <p className={`text-sm font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatDate(user.createdAt)}
                </p>
              </div>

              <div className={`p-4 rounded-2xl ${
                darkMode ? 'bg-gray-800/50' : 'bg-white/50'
              } backdrop-blur-sm`}>
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } mb-1`}>
                  Dernière connexion
                </p>
                <p className={`text-sm font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatDate(user.lastLoginAt)}
                </p>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-red-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-red-500/10 to-orange-500/10 rounded-full translate-y-12 -translate-x-12 blur-2xl"></div>
          </div>
        </div>

        {/* Gamification Card */}
        <div className={`rounded-3xl ${
          darkMode
            ? 'bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-800/50'
            : 'bg-gradient-to-r from-orange-50/80 to-red-50/80 border-orange-200/50'
        } border backdrop-blur-sm shadow-xl overflow-hidden`}>
          <div className="relative p-6">
            <h3 className={`text-lg font-bold mb-6 ${
              darkMode ? 'text-orange-300' : 'text-orange-800'
            }`}>
              🏆 Progression & Récompenses
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Level */}
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${
                  darkMode
                    ? 'bg-gradient-to-br from-orange-600 to-red-700'
                    : 'bg-gradient-to-br from-orange-500 to-red-600'
                } flex items-center justify-center shadow-lg mb-2`}>
                  <span className="text-white font-bold text-lg">
                    {user.level || 1}
                  </span>
                </div>
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Niveau
                </p>
                <p className={`text-sm font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getLevelTitle(user.level)}
                </p>
              </div>

              {/* XP */}
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${
                  darkMode
                    ? 'bg-gradient-to-br from-blue-600 to-red-700'
                    : 'bg-gradient-to-br pluqla-gradient-main'
                } flex items-center justify-center shadow-lg mb-2`}>
                  <span className="text-white font-bold text-lg">
                    {user.gamificationPoints || user.xp || 0}
                  </span>
                </div>
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Points XP
                </p>
                <p className={`text-sm font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Expérience
                </p>
              </div>

              {/* Streak */}
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${
                  darkMode
                    ? 'bg-gradient-to-br from-green-600 to-emerald-700'
                    : 'bg-gradient-to-br from-green-500 to-emerald-600'
                } flex items-center justify-center shadow-lg mb-2`}>
                  <span className="text-white text-2xl">
                    🔥
                  </span>
                </div>
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Série
                </p>
                <p className={`text-sm font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user.streak || 0} jours
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Progression niveau {(user.level || 1) + 1}
                </span>
                <span className={`text-sm font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {((user.gamificationPoints || user.xp || 0) % 100)}/100
                </span>
              </div>
              <div className={`w-full h-2 rounded-full ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              } overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${((user.gamificationPoints || user.xp || 0) % 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Decorative flame */}
            <div className="absolute top-4 right-4 text-3xl opacity-20 animate-pulse">
              🔥
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Language Settings */}
          <div className={`rounded-3xl ${
            darkMode
              ? 'bg-gray-800/50 border-gray-700/50'
              : 'bg-white/50 border-gray-200/50'
          } border backdrop-blur-sm shadow-xl`}>
            <div className="p-6">
              <h3 className={`text-lg font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🌍 Langue
              </h3>
              <LanguageSelector variant="dropdown" showLabels={true} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`rounded-3xl ${
            darkMode
              ? 'bg-gray-800/50 border-gray-700/50'
              : 'bg-white/50 border-gray-200/50'
          } border backdrop-blur-sm shadow-xl`}>
            <div className="p-6">
              <h3 className={`text-lg font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ⚡ Actions Rapides
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setCurrentScreen('home')}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                    darkMode
                      ? 'bg-gray-700/50 text-white hover:bg-gray-600/70'
                      : 'bg-gray-100/50 text-gray-900 hover:bg-gray-200/70'
                  } shadow-lg hover:shadow-xl`}
                >
                  <div className="flex items-center space-x-3">
                    <span>🏠</span>
                    <span className="font-medium">Tableau de bord</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Privacy */}
        <div className={`rounded-3xl ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700/50'
            : 'bg-white/50 border-gray-200/50'
        } border backdrop-blur-sm shadow-xl`}>
          <div className="p-6">
            <h3 className={`text-lg font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              📞 Support & Confidentialité
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled
                className={`px-4 py-3 rounded-2xl transition-all duration-300 opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700/30 text-gray-400'
                    : 'bg-gray-100/30 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>📋</span>
                  <span className="text-sm font-medium">CGU</span>
                </div>
              </button>

              <button
                disabled
                className={`px-4 py-3 rounded-2xl transition-all duration-300 opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700/30 text-gray-400'
                    : 'bg-gray-100/30 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>🔒</span>
                  <span className="text-sm font-medium">Confidentialité</span>
                </div>
              </button>

              <button
                disabled
                className={`px-4 py-3 rounded-2xl transition-all duration-300 opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700/30 text-gray-400'
                    : 'bg-gray-100/30 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>💬</span>
                  <span className="text-sm font-medium">Support</span>
                </div>
              </button>

              <button
                disabled
                className={`px-4 py-3 rounded-2xl transition-all duration-300 opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700/30 text-gray-400'
                    : 'bg-gray-100/30 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>❓</span>
                  <span className="text-sm font-medium">Aide</span>
                </div>
              </button>
            </div>

            <p className={`text-xs mt-3 ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Ces fonctionnalités seront bientôt disponibles
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`rounded-3xl ${
          darkMode
            ? 'bg-red-900/20 border-red-800/50'
            : 'bg-red-50/80 border-red-200/50'
        } border backdrop-blur-sm shadow-xl`}>
          <div className="p-6">
            <h3 className={`text-lg font-bold mb-4 ${
              darkMode ? 'text-red-300' : 'text-red-800'
            }`}>
              ⚠️ Zone Sensible
            </h3>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`w-full px-6 py-4 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 ${
                isLoggingOut
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-2xl'
              }`}
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center space-x-3">
                  <LoadingSpinner size="small" />
                  <span>Déconnexion...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <span>🚪</span>
                  <span>Se déconnecter</span>
                </div>
              )}
            </button>

            <p className={`mt-3 text-sm text-center ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              Vous serez redirigé vers la page de connexion
            </p>
          </div>
        </div>

        {/* Bottom Spacer for Navigation */}
        <div className="h-20"></div>
      </div>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 right-10 w-32 h-32 rounded-full ${
          darkMode ? 'bg-red-600/5' : 'bg-red-600/3'
        } blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-40 left-10 w-40 h-40 rounded-full ${
          darkMode ? 'bg-red-800/5' : 'bg-red-800/3'
        } blur-3xl animate-pulse delay-1000`}></div>
        <div className={`absolute top-1/2 right-1/4 w-24 h-24 rounded-full ${
          darkMode ? 'bg-orange-600/5' : 'bg-orange-600/3'
        } blur-3xl animate-pulse delay-500`}></div>
      </div>
    </div>
  );
};

export default Profile;