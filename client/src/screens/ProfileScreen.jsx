import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
// Languages utils handled directly in component
import './ActivityScreen.css';

const ProfileScreen = ({ userData, setUserData, darkMode, showNotification }) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { navigateToHome } = useNavigation();
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: userData.name || '',
    email: userData.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Gestion de la langue
  const [currentLang, setCurrentLang] = useState('fr');
  const [supportedLanguages, setSupportedLanguages] = useState([]);

  useEffect(() => {
    // Get current language from localStorage or default to 'fr'
    const lang = localStorage.getItem('language') || 'fr';
    const langs = ['fr', 'en', 'es']; // Hardcoded supported languages
    setCurrentLang(lang);
    setSupportedLanguages(langs);
  }, []);

  const sections = [
    {
      id: 'profile',
      name: 'Mon Profil',
      icon: '👤',
      description: 'Informations personnelles'
    },
    {
      id: 'activity',
      name: 'Activité',
      icon: '📊',
      description: 'Historique et statistiques'
    },
    {
      id: 'settings',
      name: 'Paramètres',
      icon: '⚙️',
      description: 'Préférences et configuration'
    }
  ];

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification?.('Session expirée, reconnectez-vous', 'error');
        logout();
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          currentPassword: editData.currentPassword,
          newPassword: editData.newPassword || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(prev => ({ ...prev, ...data.user }));
        setIsEditing(false);
        setEditData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        showNotification?.('Profil mis à jour avec succès ! 🎉', 'success');
      } else {
        const error = await response.json();
        showNotification?.(error.message || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      console.error('Erreur profil:', error);
      showNotification?.('Erreur de connexion', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      showNotification?.('Déconnexion en cours...', 'info');
      await logout();
      showNotification?.('À bientôt ! 👋', 'success');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      showNotification?.('Erreur lors de la déconnexion', 'error');
    }
  };

  const handleLanguageChange = (lang) => {
    try {
      // Try to change language using react-i18next
      if (window.i18n?.changeLanguage) {
        window.i18n.changeLanguage(lang);
      }
      setCurrentLang(lang);
      localStorage.setItem('language', lang);
      showNotification?.(`Langue changée vers ${lang.toUpperCase()} 🌍`, 'success');
    } catch (error) {
      console.error('Erreur changement langue:', error);
      showNotification?.('Erreur lors du changement de langue', 'error');
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Photo de profil et informations de base */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                  {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {userData.name || 'Utilisateur'}
                  </h3>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {userData.email || 'email@example.com'}
                  </p>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      Niveau {userData.level || 1}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      {userData.streak || 0} jours
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isEditing
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isEditing ? '❌' : '✏️'}
                </button>
              </div>

              {isEditing && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Nom
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                        darkMode
                          ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                          : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                        darkMode
                          ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                          : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      value={editData.currentPassword}
                      onChange={(e) => setEditData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                        darkMode
                          ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                          : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Nouveau mot de passe (optionnel)
                    </label>
                    <input
                      type="password"
                      value={editData.newPassword}
                      onChange={(e) => setEditData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                        darkMode
                          ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                          : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                      }`}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-200"
                    >
                      💾 Sauvegarder
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-200"
                    >
                      ❌ Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            {/* Statistiques rapides */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                📊 Mes Statistiques
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="text-2xl font-bold text-red-500">
                    {userData.totalSavings || '0'}€
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Économies totales
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="text-2xl font-bold text-red-600">
                    {userData.streak || 0}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Jours consécutifs
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="text-2xl font-bold text-red-500">
                    {userData.level || 1}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Niveau actuel
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="text-2xl font-bold text-red-500">
                    {userData.transactions?.length || 0}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Transactions
                  </div>
                </div>
              </div>
            </div>

            {/* Historique récent */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🕐 Activité Récente
              </h3>

              <div className="space-y-3">
                {userData.recentActivity?.slice(0, 5).map((activity, index) => (
                  <div key={index} className={`p-3 rounded-lg flex justify-between items-center ${
                    darkMode ? 'bg-gray-800/50' : 'bg-white'
                  }`}>
                    <div>
                      <div className={`font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {activity.description || 'Économie réalisée'}
                      </div>
                      <div className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {activity.date || 'Aujourd\'hui'}
                      </div>
                    </div>
                    <div className="text-red-500 font-semibold">
                      +{activity.amount || '5'}€
                    </div>
                  </div>
                )) || (
                  <div className={`text-center py-8 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="text-4xl mb-2">📈</div>
                    <p>Commencez à économiser pour voir votre activité !</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            {/* Paramètres de langue */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🌍 Langue
              </h3>

              <div className="space-y-3">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                      currentLang === lang
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        : darkMode
                        ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">
                        {lang === 'fr' ? '🇫🇷' : lang === 'en' ? '🇺🇸' : '🇪🇸'}
                      </span>
                      <span className="font-medium">
                        {lang === 'fr' ? 'Français' : lang === 'en' ? 'English' : 'Español'}
                      </span>
                      {currentLang === lang && (
                        <span className="ml-auto">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🔔 Notifications
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Rappels quotidiens
                    </div>
                    <div className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Recevoir des rappels pour économiser
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-gray-300 rounded-full p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full transition-transform"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Nouvelles offres
                    </div>
                    <div className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Être notifié des nouvelles promotions
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-red-500 rounded-full p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full transform translate-x-6 transition-transform"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions dangereuses */}
            <div className={`glass-effect p-6 rounded-2xl border-2 border-red-500/20 ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className="text-lg font-semibold mb-4 text-red-500">
                ⚠️ Zone Dangereuse
              </h3>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>🚪</span>
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen relative ${
      darkMode
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-red-50/20'
    } transition-all duration-500`}>

      {/* Glassmorphism Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-xl ${
        darkMode
          ? 'bg-gray-900/80 border-gray-700/50'
          : 'bg-white/80 border-gray-200/50'
      } border-b shadow-lg`}>

        {/* Header Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Back Button & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToHome}
                className={`group p-2.5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  darkMode
                    ? 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white'
                    : 'bg-gray-100/80 hover:bg-gray-200/90 text-gray-600 hover:text-gray-800'
                } shadow-lg hover:shadow-xl`}
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="space-y-1">
                <h1 className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${
                  darkMode
                    ? 'from-white via-gray-200 to-gray-300'
                    : 'from-gray-900 via-gray-800 to-gray-700'
                } bg-clip-text text-transparent`}>
                  👤 {t('profile.title', 'Mon Profil')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } font-medium`}>
                  {t('profile.subtitle', 'Gérez votre compte et préférences')}
                </p>
              </div>
            </div>
          </div>

          {/* Section Filter Navigation */}
          <div className="mt-6">
            <div className="space-y-3">
              {/* Sections Header */}
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Sections
                </h2>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode
                    ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                    : 'bg-red-100/80 text-red-700 border border-red-200/60'
                }`}>
                  {sections.find(section => section.id === activeSection)?.name}
                </div>
              </div>

              {/* Scrollable Section Pills */}
              <div className="relative">
                <div className={`p-2 rounded-2xl ${
                  darkMode
                    ? 'bg-gray-800/60 border border-gray-700/50'
                    : 'bg-gray-100/60 border border-gray-200/50'
                } backdrop-blur-sm shadow-inner`}>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                    {sections.map((section, index) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`group relative flex items-center space-x-2 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 min-w-fit transform hover:scale-105 ${
                          activeSection === section.id
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 scale-105'
                            : darkMode
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-gray-600/30'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-white/70 border border-gray-200/50'
                        } shadow-md hover:shadow-lg`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <span className="text-lg">{section.icon}</span>
                        <span className="text-sm">
                          <span className="whitespace-nowrap">{section.name}</span>
                        </span>

                        {/* Active Indicator */}
                        {activeSection === section.id && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-lg animate-scale-in"></div>
                        )}

                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient fade edges for scroll indication */}
                <div className={`absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r ${
                  darkMode
                    ? 'from-gray-800/80 to-transparent'
                    : 'from-gray-100/80 to-transparent'
                } pointer-events-none rounded-l-2xl`}></div>
                <div className={`absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l ${
                  darkMode
                    ? 'from-gray-800/80 to-transparent'
                    : 'from-gray-100/80 to-transparent'
                } pointer-events-none rounded-r-2xl`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Section Content */}
        <div className="animate-slide-up">
          {renderSectionContent()}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 right-10 w-32 h-32 rounded-full ${
          darkMode ? 'bg-red-600/5' : 'bg-red-600/3'
        } blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-20 left-10 w-40 h-40 rounded-full ${
          darkMode ? 'bg-red-600/5' : 'bg-red-600/3'
        } blur-3xl animate-pulse delay-1000`}></div>
      </div>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(ProfileScreen);