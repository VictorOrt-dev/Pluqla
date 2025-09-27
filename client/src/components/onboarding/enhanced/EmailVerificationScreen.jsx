import React, { useState, useEffect, useCallback } from 'react';
import { trackOnboardingEvent } from '../../../utils/analytics';

const EmailVerificationScreen = ({
  onNext,
  onPrevious,
  darkMode,
  onboardingData,
  updateOnboardingData,
  showNotification,
  canGoBack
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);

  const userEmail = onboardingData.userData?.email || '';

  const requestVerificationCode = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (response.ok) {
        setHasRequestedCode(true);
        setCanResend(false);
        setResendCountdown(60);

        trackOnboardingEvent('verification_code_sent', {
          email: userEmail,
          isResend: hasRequestedCode
        });

        showNotification('Code de vérification envoyé !', 'success');
      } else {
        throw new Error('Erreur lors de l\'envoi du code');
      }
    } catch (error) {
      console.error('Erreur envoi code:', error);
      showNotification('Erreur lors de l\'envoi du code', 'error');

      trackOnboardingEvent('verification_code_error', {
        email: userEmail,
        error: error.message
      });
    }
  }, [userEmail, showNotification, hasRequestedCode]);

  useEffect(() => {
    // Auto-demander un code au chargement
    if (!hasRequestedCode && userEmail) {
      requestVerificationCode();
    }
  }, [userEmail, hasRequestedCode, requestVerificationCode]);

  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend]);

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      showNotification('Le code doit contenir 6 chiffres', 'error');
      return;
    }

    setIsVerifying(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: userEmail,
          verificationCode: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        updateOnboardingData({
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        });

        trackOnboardingEvent('email_verified', {
          email: userEmail,
          attemptsCount: 1 // TODO: track attempts
        });

        showNotification('Email vérifié avec succès !', 'success');

        // Passer à l'étape suivante
        onNext({
          emailVerificationData: {
            verified: true,
            verifiedAt: new Date().toISOString()
          }
        });
      } else {
        throw new Error(data.message || 'Code invalide');
      }
    } catch (error) {
      console.error('Erreur vérification:', error);
      showNotification(error.message || 'Code invalide', 'error');

      trackOnboardingEvent('email_verification_failed', {
        email: userEmail,
        error: error.message,
        code: verificationCode
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const skipVerification = () => {
    trackOnboardingEvent('email_verification_skipped', {
      email: userEmail
    });

    updateOnboardingData({
      emailVerificationSkipped: true,
      skippedAt: new Date().toISOString()
    });

    showNotification('Vérification reportée', 'info');
    onNext({ emailVerificationSkipped: true });
  };

  const handleCodeChange = (value) => {
    // Garder seulement les chiffres
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(numericValue);

    // Auto-vérification quand 6 chiffres sont saisis
    if (numericValue.length === 6) {
      setTimeout(() => verifyCode(), 500);
    }
  };

  const formatEmail = (email) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (username.length <= 3) return email;
    return `${username.slice(0, 2)}***@${domain}`;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col justify-center px-6 py-8`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br pluqla-gradient-main rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-white">📧</span>
        </div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
          Vérifie ton email
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
          Un code de vérification a été envoyé à<br/>
          <span className="font-medium">{formatEmail(userEmail)}</span>
        </p>
      </div>

      {/* Verification Code Input */}
      <div className="mb-8">
        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3 text-center`}>
          Code de vérification (6 chiffres)
        </label>

        <div className="flex justify-center mb-4">
          <input
            type="text"
            inputMode="numeric"
            value={verificationCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="123456"
            className={`w-48 px-4 py-4 text-center text-2xl font-mono tracking-widest rounded-xl border-2 transition-all ${
              verificationCode.length === 6
                ? 'border-green-500 bg-green-500/10'
                : darkMode
                ? 'border-gray-700 bg-gray-900 text-white focus:border-red-500'
                : 'border-gray-300 bg-white focus:border-red-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center space-x-2 mb-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all ${
                index < verificationCode.length
                  ? 'bg-red-500 scale-110'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={verifyCode}
          disabled={verificationCode.length !== 6 || isVerifying}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            verificationCode.length === 6 && !isVerifying
              ? 'pluqla-btn-primary text-white hover:scale-[1.02]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isVerifying ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Vérification...
            </span>
          ) : (
            '✅ Vérifier le code'
          )}
        </button>
      </div>

      {/* Resend Section */}
      <div className="text-center mb-8">
        {canResend ? (
          <button
            onClick={requestVerificationCode}
            className={`text-sm ${darkMode ? 'text-red-400 hover:text-blue-300' : 'text-red-600 hover:text-red-500'} transition-colors underline`}
          >
            📮 Renvoyer le code
          </button>
        ) : (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Renvoyer le code dans {resendCountdown}s
          </p>
        )}
      </div>

      {/* Help Section */}
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} mb-6`}>
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-3 text-center`}>
          Tu ne reçois pas le code ?
        </h3>
        <div className="space-y-2 text-sm">
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>📬</span>
            <span>Vérifie tes spams/courriers indésirables</span>
          </div>
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>⏰</span>
            <span>Le code peut prendre 1-2 minutes à arriver</span>
          </div>
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>🔄</span>
            <span>Assure-toi d'avoir une connexion Internet stable</span>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className={`text-center mb-6`}>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          🔒 Ce code expire dans 10 minutes pour ta sécurité
        </p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          onClick={onPrevious}
          className={`flex-1 py-3 ${darkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-black hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          ← Retour
        </button>

        <button
          onClick={skipVerification}
          className={`flex-1 py-3 ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-300 text-gray-600 hover:bg-gray-400'} rounded-xl transition-colors`}
        >
          Ignorer pour maintenant
        </button>
      </div>

      {/* Benefits of Verification */}
      <div className={`mt-6 p-4 rounded-xl ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-red-500/20`}>
        <h4 className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'} mb-2 text-center`}>
          Pourquoi vérifier ton email ?
        </h4>
        <div className="space-y-1 text-xs">
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            <span>🔔</span>
            <span>Reçois des conseils d'économies personnalisés</span>
          </div>
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            <span>🛡️</span>
            <span>Sécurise ton compte et tes données</span>
          </div>
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            <span>🎁</span>
            <span>Débloque des fonctionnalités exclusives</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationScreen;