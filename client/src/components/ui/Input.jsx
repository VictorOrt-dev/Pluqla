/**
 * Composant Input unifié pour l'application Pluqla
 * Assure la cohérence des champs de saisie et l'accessibilité
 */

import React, { memo, forwardRef, useState } from 'react';
import { useThemedClasses } from '../../contexts/ThemeContext';

const INPUT_VARIANTS = {
  default: 'border-gray-300 dark:border-gray-600 focus:border-red-500 focus:ring-blue-500',
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
        <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          {showPassword ? '🙈' : '👁️'}
        </span>
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
              <span className="mr-1">⚠️</span>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <span className="mr-1">✅</span>
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
              <span className="mr-1">⚠️</span>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <span className="mr-1">✅</span>
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
              <span className="mr-1">⚠️</span>
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <span className="mr-1">✅</span>
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