import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../common/LanguageSelector';

const WelcomeScreen = ({
  onNext,
  darkMode,
  onStartOnboarding
}) => {
  const { t } = useTranslation();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (animationPhase < 3) {
        setAnimationPhase(animationPhase + 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [animationPhase]);

  const handleStart = () => {
    setHasStarted(true);
    onStartOnboarding();
    setTimeout(() => onNext(), 500);
  };

  const socialProofData = [
    { name: 'Marie', age: 24, savings: 450, city: 'Paris' },
    { name: 'Thomas', age: 29, savings: 680, city: 'Lyon' },
    { name: 'Lisa', age: 22, savings: 380, city: 'Marseille' },
    { name: 'Alex', age: 27, savings: 520, city: 'Toulouse' }
  ];

  const features = [
    {
      icon: '🤖',
      title: t('onboarding.welcome.features.ai_personalized'),
      desc: t('onboarding.welcome.features.ai_description'),
      highlight: true
    },
    {
      icon: '💰',
      title: t('onboarding.welcome.features.savings_potential'),
      desc: t('onboarding.welcome.features.savings_description'),
      highlight: true
    },
    {
      icon: '⚡',
      title: t('onboarding.welcome.features.immediate_results'),
      desc: t('onboarding.welcome.features.immediate_description'),
      highlight: false
    },
    {
      icon: '🎯',
      title: t('onboarding.welcome.features.gamification'),
      desc: t('onboarding.welcome.features.gamification_description'),
      highlight: false
    }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col justify-center items-center px-6 relative overflow-hidden`}>
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector
          variant="minimal"
          darkMode={darkMode}
          className="bg-white/10 backdrop-blur-md rounded-lg"
        />
      </div>
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 ${darkMode ? 'bg-blue-500' : 'bg-blue-300'} rounded-full opacity-20 animate-pulse`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Logo avec Animation */}
      <div className="relative z-10 mb-8">
        <div className={`inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-[40px] shadow-2xl animate-float transition-transform duration-1000 ${
          animationPhase >= 1 ? 'scale-100' : 'scale-0'
        }`}>
          <span className="text-6xl font-bold text-white">+C</span>
        </div>

        {/* Cercles d'animation autour du logo */}
        {animationPhase >= 2 && (
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2">
              <div className="w-4 h-4 bg-pink-500 rounded-full animate-pulse" />
            </div>
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Titre et Slogan */}
      <div className={`text-center mb-8 transition-all duration-1000 ${
        animationPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <h1 className={`text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'} bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent`}>
          {t('onboarding.welcome.title')}
        </h1>
        <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
          {t('onboarding.welcome.subtitle')}
        </p>
      </div>

      {/* Stats Sociales Animées */}
      <div className={`mb-8 transition-all duration-1000 delay-500 ${
        animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-2xl backdrop-blur-sm`}>
          <div className="text-center mb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="flex -space-x-2">
                {socialProofData.slice(0, 3).map((user, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                  >
                    {user.name[0]}
                  </div>
                ))}
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                +12,847 {t('onboarding.welcome.stats.users')}
              </span>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('onboarding.welcome.stats.saved')} : <span className="font-bold text-green-500">8.2M{t('common.currency')}</span>
            </p>
          </div>

          {/* Témoignage Rotatif */}
          <div className="text-center">
            <p className={`text-sm italic ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              "{t('onboarding.welcome.testimonial', { amount: socialProofData[animationPhase % socialProofData.length]?.savings })}"
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              - {socialProofData[animationPhase % socialProofData.length]?.name}, {socialProofData[animationPhase % socialProofData.length]?.age} ans, {socialProofData[animationPhase % socialProofData.length]?.city}
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className={`grid grid-cols-2 gap-3 mb-8 w-full max-w-sm transition-all duration-1000 delay-700 ${
        animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl transition-all hover:scale-105 ${
              feature.highlight
                ? `bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20`
                : darkMode ? 'bg-gray-900' : 'bg-gray-100'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className={`font-semibold text-xs mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>
                {feature.title}
              </h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={handleStart}
          disabled={hasStarted}
          className={`w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl shadow-xl transition-all duration-300 ${
            hasStarted ? 'scale-95 opacity-75' : 'hover:scale-105 active:scale-95'
          } ${animationPhase >= 3 ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
        >
          {hasStarted ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t('common.loading')}
            </span>
          ) : (
            <>
              {t('onboarding.welcome.start_button')}
            </>
          )}
        </button>

        <div className="text-center">
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('onboarding.welcome.benefits')}
          </p>
        </div>
      </div>

      {/* Indicateur de défilement (si applicable) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className={`w-6 h-10 border-2 ${darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-full flex justify-center`}>
          <div className={`w-1 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-full mt-2 animate-pulse`} />
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;