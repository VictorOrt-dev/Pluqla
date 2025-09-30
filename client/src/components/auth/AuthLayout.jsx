/**
 * AuthLayout - Shared layout component for authentication pages
 * Provides consistent structure, branding, and security badges
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';
import '../../styles/auth.css';

const AuthLayout = ({ children }) => {
  const { t } = useTranslation();

  return (
    <div className="auth-container">
      {/* Language Selector */}
      <div className="auth-language-selector">
        <LanguageSelector variant="minimal" />
      </div>

      {/* Main Content */}
      <div className="auth-content-wrapper">
        {children}

        {/* Security & Trust Indicators */}
        <div className="auth-security-section">
          <div className="auth-security-badges">
            <div className="auth-security-badge">
              <svg
                className="auth-security-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>{t('auth.security.ssl')}</span>
            </div>
            <div className="auth-security-badge">
              <svg
                className="auth-security-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>{t('auth.security.gdpr')}</span>
            </div>
            <div className="auth-security-badge">
              <svg
                className="auth-security-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span>{t('auth.security.secure')}</span>
            </div>
          </div>
          <p className="auth-security-text">
            {t('auth.security.dataProtection')}
          </p>
        </div>
      </div>
    </div>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthLayout;
