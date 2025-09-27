import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import './LandingPage.css';

const LandingPage = () => {
  const { navigateTo } = useNavigation();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Memoize floating elements for performance
  const floatingElements = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 25,
      duration: Math.random() * 12 + 18,
      delay: Math.random() * 6,
      opacity: Math.random() * 0.3 + 0.1
    })), []
  );

  useEffect(() => {
    // Staggered entrance animation
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    const timer2 = setTimeout(() => setIsLoaded(true), 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleLoginClick = useCallback(() => {
    localStorage.setItem('authMode', 'login');
    navigateTo('login');
  }, [navigateTo]);

  const handleSignupClick = useCallback(() => {
    localStorage.setItem('authMode', 'register');
    navigateTo('login');
  }, [navigateTo]);

  return (
    <div className="pluqla-landing">
      {/* Premium gradient background with animated mesh */}
      <div className="pluqla-landing__background">
        <div className="pluqla-landing__gradient"></div>
        <div className="pluqla-landing__mesh"></div>
      </div>

      {/* Floating background elements */}
      <div className="pluqla-landing__floating-container">
        {floatingElements.map((element) => (
          <div
            key={element.id}
            className="pluqla-landing__floating-element"
            style={{
              '--x': `${element.x}%`,
              '--y': `${element.y}%`,
              '--size': `${element.size}px`,
              '--duration': `${element.duration}s`,
              '--delay': `${element.delay}s`,
              '--opacity': element.opacity,
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <main className="pluqla-landing__content">

        {/* Brand section */}
        <section className={`pluqla-landing__brand ${
          isVisible ? 'pluqla-landing__brand--visible' : ''
        }`}>

          {/* Logo with premium effects */}
          <div className="pluqla-landing__logo-container">
            <div className="pluqla-landing__logo-glow"></div>
            <div className="pluqla-landing__logo-backdrop">
              <div className="pluqla-landing__logo">
                <img
                  src="/pluqla-logo.png"
                  alt="Pluqla"
                  className="pluqla-landing__logo-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="pluqla-landing__logo-fallback">🐱</div>
              </div>
            </div>
          </div>

          {/* Typography hierarchy */}
          <div className="pluqla-landing__text">
            <h1 className="pluqla-landing__title">
              Pluqla
            </h1>
            <h2 className="pluqla-landing__subtitle">
              Économise smarter
            </h2>
            <p className="pluqla-landing__description">
              Investis plus facilement, track tes progrès et atteins tes objectifs financiers
            </p>
          </div>
        </section>

        {/* CTA Buttons Section */}
        <section className={`pluqla-landing__cta ${
          isLoaded ? 'pluqla-landing__cta--visible' : ''
        }`}>

          {/* Primary CTA - Create Account */}
          <button
            onClick={handleSignupClick}
            className="pluqla-landing__btn pluqla-landing__btn--primary"
            aria-label="Créer un nouveau compte Pluqla"
          >
            <span className="pluqla-landing__btn-text">Créer mon compte</span>
            <div className="pluqla-landing__btn-shimmer"></div>
            <div className="pluqla-landing__btn-ripple"></div>
          </button>

          {/* Secondary CTA - Sign In */}
          <button
            onClick={handleLoginClick}
            className="pluqla-landing__btn pluqla-landing__btn--secondary"
            aria-label="Se connecter à mon compte existant"
          >
            <span className="pluqla-landing__btn-text">J'ai déjà un compte</span>
            <div className="pluqla-landing__btn-border"></div>
          </button>
        </section>

        {/* Feature highlights */}
        <section className={`pluqla-landing__features ${
          isLoaded ? 'pluqla-landing__features--visible' : ''
        }`}>
          <div className="pluqla-landing__feature">
            <div className="pluqla-landing__feature-dot pluqla-landing__feature-dot--success"></div>
            <span className="pluqla-landing__feature-text">Gratuit</span>
          </div>
          <div className="pluqla-landing__feature">
            <div className="pluqla-landing__feature-dot pluqla-landing__feature-dot--info"></div>
            <span className="pluqla-landing__feature-text">Sécurisé</span>
          </div>
          <div className="pluqla-landing__feature">
            <div className="pluqla-landing__feature-dot pluqla-landing__feature-dot--accent"></div>
            <span className="pluqla-landing__feature-text">Simple</span>
          </div>
        </section>
      </main>

      {/* Accessibility and performance optimization */}
      <div className="pluqla-landing__accessibility" aria-live="polite" aria-atomic="true">
        <span className="sr-only">
          {isLoaded ? 'Page de connexion Pluqla chargée' : 'Chargement de la page de connexion'}
        </span>
      </div>
    </div>
  );
};

export default LandingPage;