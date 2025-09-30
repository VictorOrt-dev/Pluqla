/**
 * Composant Input unifié pour l'application Pluqla
 * Assure la cohérence des champs de saisie et l'accessibilité
 */

import React, { memo, forwardRef, useState } from 'react';
import { useThemedClasses } from '../../contexts/ThemeContext';

const INPUT_VARIANTS = {
  default: 'border-gray-300 dark:border-gray-600 focus:border-[#F14545] focus:ring-[#F14545]',
  error: 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-green-500'
};

const INPUT_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

const Input = memo(forwardRef(({
  label,
  error,
  success,
  helper,
  variant,
  size = 'md',
  fullWidth = true,
  icon,
  iconPosition = 'left',
  type = 'text',
  className = '',
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const { cx, input } = useThemedClasses();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-detect variant based on error/success
  const autoVariant = error ? 'error' : success ? 'success' : 'default';
  const finalVariant = variant || autoVariant;

  const baseClasses = 'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = INPUT_VARIANTS[finalVariant] || INPUT_VARIANTS.default;
  const sizeClasses = INPUT_SIZES[size] || INPUT_SIZES.md;
  const fullWidthClass = fullWidth ? 'w-full' : '';

  const inputClasses = cx(
    baseClasses,
    variantClasses,
    sizeClasses,
    fullWidthClass,
    icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '',
    type === 'password' ? 'pr-10' : '',
    className
  );

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const renderIcon = () => {
    if (!icon) return null;

    return (
      <div className={cx(
        'absolute inset-y-0 flex items-center pointer-events-none',
        iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'
      )}>
        {typeof icon === 'string' ? (
          <span className="text-gray-400 text-sm">{icon}</span>
        ) : (
          icon
        )}
      </div>
    );
  };

  const renderPasswordToggle = () => {
    if (type !== 'password') return null;

    return (
      <button
        type="button"
        className="absolute inset-y-0 right-0 pr-3 flex items-center"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      >
        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {showPassword ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </>
          )}
        </svg>
      </button>
    );
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          className={inputClasses}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {renderIcon()}
        {renderPasswordToggle()}
      </div>

      {(error || success || helper) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
          {helper && !error && !success && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {helper}
            </p>
          )}
        </div>
      )}
    </div>
  );
}));

Input.displayName = 'Input';

// Composant TextArea
export const TextArea = memo(forwardRef(({
  label,
  error,
  success,
  helper,
  rows = 4,
  fullWidth = true,
  className = '',
  required = false,
  ...props
}, ref) => {
  const { cx } = useThemedClasses();

  const autoVariant = error ? 'error' : success ? 'success' : 'default';
  const variantClasses = INPUT_VARIANTS[autoVariant];

  const textAreaClasses = cx(
    'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-vertical',
    variantClasses,
    'px-4 py-2 text-sm',
    fullWidth ? 'w-full' : '',
    className
  );

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        rows={rows}
        className={textAreaClasses}
        {...props}
      />

      {(error || success || helper) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
          {helper && !error && !success && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {helper}
            </p>
          )}
        </div>
      )}
    </div>
  );
}));

TextArea.displayName = 'TextArea';

// Composant Select
export const Select = memo(forwardRef(({
  label,
  error,
  success,
  helper,
  options = [],
  placeholder = 'Sélectionner...',
  fullWidth = true,
  className = '',
  required = false,
  ...props
}, ref) => {
  const { cx } = useThemedClasses();

  const autoVariant = error ? 'error' : success ? 'success' : 'default';
  const variantClasses = INPUT_VARIANTS[autoVariant];

  const selectClasses = cx(
    'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    variantClasses,
    'px-4 py-2 text-sm',
    fullWidth ? 'w-full' : '',
    className
  );

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <select
        ref={ref}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>

      {(error || success || helper) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
          {helper && !error && !success && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {helper}
            </p>
          )}
        </div>
      )}
    </div>
  );
}));

Select.displayName = 'Select';

export default Input;