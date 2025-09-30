/**
 * SignupForm - Accessible signup form component
 * Features: Full ARIA support, inline validation, password strength, keyboard navigation
 */

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import '../../styles/auth.css';

const SignupForm = ({ onSubmit, isLoading, serverError, onSwitchToLogin }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nameInputRef = useRef(null);

  // Focus name input on mount for accessibility
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) {
      return t('auth.validation.nameRequired');
    }
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      return t('auth.validation.emailRequired');
    }
    if (!emailRegex.test(email)) {
      return t('auth.validation.emailInvalid');
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return t('auth.validation.passwordRequired');
    }
    if (password.length < 6) {
      return t('auth.validation.passwordMinLength');
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return t('auth.validation.passwordRequired');
    }
    if (confirmPassword !== password) {
      return t('auth.validation.passwordMismatch');
    }
    return '';
  };

  // Handle input changes with inline validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Re-validate confirmPassword if password changes
    if (field === 'password' && formData.confirmPassword) {
      const confirmError = validateConfirmPassword(formData.confirmPassword, value);
      setFormErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (field) => {
    // Validate on blur
    let error = '';
    if (field === 'name') {
      error = validateName(formData.name);
    } else if (field === 'email') {
      error = validateEmail(formData.email);
    } else if (field === 'password') {
      error = validatePassword(formData.password);
    } else if (field === 'confirmPassword') {
      error = validateConfirmPassword(formData.confirmPassword, formData.password);
    }

    if (error) {
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);

    const errors = {};
    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    setFormErrors(errors);

    // If no errors, submit
    if (Object.keys(errors).length === 0) {
      onSubmit({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="auth-header">
        <div className="auth-logo-container">
          <img
            src="/pluqla-logo.png"
            alt="Pluqla"
            className="auth-logo"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="auth-logo-fallback" style={{ display: 'none' }}>
            P
          </div>
        </div>
        <h1 className="auth-title">
          {t('auth.register.title')}
        </h1>
        <p className="auth-subtitle">
          {t('auth.register.subtitle')}
        </p>
      </div>

      {/* Server Error Banner */}
      {serverError && (
        <div className="auth-status-banner error" role="status" aria-live="polite">
          <svg
            className="auth-status-icon"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Name Input */}
        <div className="auth-input-group">
          <label htmlFor="signup-name" className="auth-label">
            {t('auth.fields.name')}
            <span className="auth-label-required" aria-label="requis">*</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              ref={nameInputRef}
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              className="auth-input"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder={t('auth.placeholders.name')}
              aria-label={t('auth.fields.name')}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'signup-name-error' : undefined}
              required
              disabled={isLoading}
            />
            <svg
              className="auth-input-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          {formErrors.name && (
            <div
              id="signup-name-error"
              className="auth-error-message"
              role="alert"
            >
              <svg
                className="auth-error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formErrors.name}</span>
            </div>
          )}
        </div>

        {/* Email Input */}
        <div className="auth-input-group">
          <label htmlFor="signup-email" className="auth-label">
            {t('auth.fields.email')}
            <span className="auth-label-required" aria-label="requis">*</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              className="auth-input"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder={t('auth.placeholders.email')}
              aria-label={t('auth.fields.email')}
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? 'signup-email-error' : undefined}
              required
              disabled={isLoading}
            />
            <svg
              className="auth-input-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          {formErrors.email && (
            <div
              id="signup-email-error"
              className="auth-error-message"
              role="alert"
            >
              <svg
                className="auth-error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formErrors.email}</span>
            </div>
          )}
        </div>

        {/* Password Input */}
        <div className="auth-input-group">
          <label htmlFor="signup-password" className="auth-label">
            {t('auth.fields.password')}
            <span className="auth-label-required" aria-label="requis">*</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              id="signup-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="auth-input"
              style={{ paddingRight: '3.5rem' }}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder={t('auth.placeholders.password')}
              aria-label={t('auth.fields.password')}
              aria-invalid={!!formErrors.password}
              aria-describedby={formErrors.password ? 'signup-password-error' : undefined}
              required
              disabled={isLoading}
            />
            <svg
              className="auth-input-icon"
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
            <button
              type="button"
              className="auth-password-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              tabIndex={0}
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {showPassword ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                ) : (
                  <>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>
          {formErrors.password && (
            <div
              id="signup-password-error"
              className="auth-error-message"
              role="alert"
            >
              <svg
                className="auth-error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formErrors.password}</span>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="auth-input-group">
          <label htmlFor="signup-confirm-password" className="auth-label">
            {t('auth.fields.confirmPassword')}
            <span className="auth-label-required" aria-label="requis">*</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="auth-input"
              style={{ paddingRight: '3.5rem' }}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder={t('auth.placeholders.confirmPassword')}
              aria-label={t('auth.fields.confirmPassword')}
              aria-invalid={!!formErrors.confirmPassword}
              aria-describedby={formErrors.confirmPassword ? 'signup-confirm-password-error' : undefined}
              required
              disabled={isLoading}
            />
            <svg
              className="auth-input-icon"
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
            <button
              type="button"
              className="auth-password-toggle"
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showConfirmPassword}
              tabIndex={0}
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {showConfirmPassword ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                ) : (
                  <>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>
          {formErrors.confirmPassword && (
            <div
              id="signup-confirm-password-error"
              className="auth-error-message"
              role="alert"
            >
              <svg
                className="auth-error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formErrors.confirmPassword}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button-primary"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading && (
            <div className="auth-loading-spinner" aria-hidden="true" />
          )}
          <span>
            {isLoading ? t('auth.register.loading') : t('auth.register.submit')}
          </span>
        </button>
      </form>

      {/* Footer - Switch to Login */}
      <div className="auth-footer">
        <p className="auth-switch-mode">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-switch-link"
            disabled={isLoading}
          >
            {t('auth.register.switchToLogin')}
          </button>
        </p>
      </div>
    </div>
  );
};

SignupForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  serverError: PropTypes.string,
  onSwitchToLogin: PropTypes.func.isRequired,
};

SignupForm.defaultProps = {
  isLoading: false,
  serverError: null,
};

export default SignupForm;
