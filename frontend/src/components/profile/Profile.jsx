import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import LanguageSelector from '../common/LanguageSelector';
import LoadingSpinner from '../common/LoadingSpinner';

const Profile = ({ darkMode }) => {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-red-700 dark:text-red-300">{t('profile.userNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          {t('profile.title')}
        </h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('profile.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">

          {/* User Info Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              {t('profile.userInfo.title')}
            </h2>

            <div className="space-y-4">
              {/* Avatar placeholder */}
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.name || t('common.notAvailable')}
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.email}
                  </p>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.userInfo.email')}
                  </label>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.email}
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.userInfo.status')}
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {t(`profile.userInfo.statuses.${user.status}`)}
                  </span>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.userInfo.memberSince')}
                  </label>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(user.createdAt)}
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.userInfo.lastLogin')}
                  </label>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(user.lastLoginAt)}
                  </p>
                </div>

                {user.emailVerified !== undefined && (
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      {t('profile.userInfo.emailVerified')}
                    </label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {user.emailVerified ? t('common.yes') : t('common.no')}
                    </span>
                  </div>
                )}

                {user.gamificationPoints !== undefined && (
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      {t('profile.userInfo.points')}
                    </label>
                    <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.gamificationPoints || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gamification Card */}
          {user.level && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                {t('profile.gamification.title')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.gamification.level')}
                  </label>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.level}
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('profile.gamification.points')}
                  </label>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.gamificationPoints || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">

          {/* Language Settings */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              {t('profile.settings.language.title')}
            </h3>
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {t('profile.settings.language.select')}
              </label>
              <LanguageSelector variant="dropdown" showLabels={true} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              {t('profile.actions.title')}
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setCurrentScreen('home')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span>🏠</span>
                  <span>{t('profile.actions.backToHome')}</span>
                </div>
              </button>

              <button
                disabled
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span>🔔</span>
                  <span>{t('profile.actions.notifications')} ({t('common.comingSoon')})</span>
                </div>
              </button>

              <button
                disabled
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span>🔒</span>
                  <span>{t('profile.actions.security')} ({t('common.comingSoon')})</span>
                </div>
              </button>

              <button
                disabled
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed ${
                  darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span>⚙️</span>
                  <span>{t('profile.actions.preferences')} ({t('common.comingSoon')})</span>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className={`${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} rounded-lg border p-6`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-red-300' : 'text-red-800'} mb-4`}>
              {t('profile.dangerZone.title')}
            </h3>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isLoggingOut
                  ? 'bg-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="small" />
                  <span>{t('profile.logout.inProgress')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🚪</span>
                  <span>{t('profile.logout.button')}</span>
                </div>
              )}
            </button>

            <p className={`mt-2 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              {t('profile.logout.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;