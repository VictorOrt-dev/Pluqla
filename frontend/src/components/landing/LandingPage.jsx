import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../contexts/NavigationContext';
import LanguageSelector from '../common/LanguageSelector';

const LandingPage = () => {
  const { t } = useTranslation();
  const { setCurrentScreen } = useNavigation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: '💰',
      title: t('landing.features.savings.title'),
      description: t('landing.features.savings.description')
    },
    {
      icon: '🤖',
      title: t('landing.features.ai.title'),
      description: t('landing.features.ai.description')
    },
    {
      icon: '📊',
      title: t('landing.features.analytics.title'),
      description: t('landing.features.analytics.description')
    },
    {
      icon: '🎯',
      title: t('landing.features.goals.title'),
      description: t('landing.features.goals.description')
    }
  ];

  const stats = [
    { value: '50K+', label: t('landing.stats.users') },
    { value: '€2M+', label: t('landing.stats.saved') },
    { value: '95%', label: t('landing.stats.satisfaction') },
    { value: '24/7', label: t('landing.stats.support') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="relative z-10 px-4 py-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">+</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Clair
            </span>
          </div>
          <LanguageSelector variant="minimal" />
        </div>
      </header>

      {/* Hero Section */}
      <section className={`px-4 py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('landing.hero.title')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => setCurrentScreen('onboarding')}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {t('landing.cta.start')}
            </button>
            <button
              onClick={() => setCurrentScreen('auth')}
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
            >
              {t('landing.cta.login')}
            </button>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative mx-auto max-w-4xl">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-xl h-20 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t('landing.howItWorks.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  {t(`landing.howItWorks.step${step}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`landing.howItWorks.step${step}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.finalCta.title')}
          </h2>
          <p className="text-xl text-green-100 mb-8">
            {t('landing.finalCta.subtitle')}
          </p>
          <button
            onClick={() => setCurrentScreen('onboarding')}
            className="px-8 py-4 bg-white text-green-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {t('landing.finalCta.button')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">+</span>
            </div>
            <span className="text-xl font-bold">Clair</span>
          </div>
          <p className="text-gray-400">
            © 2024 +Clair. {t('landing.footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;