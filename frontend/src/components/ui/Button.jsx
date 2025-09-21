/**
 * Composant Button unifié pour l'application +Clair
 * Assure la cohérence visuelle et l'accessibilité
 */

import React, { memo, forwardRef } from 'react';
import { useThemedClasses } from '../../contexts/ThemeContext';

const BUTTON_VARIANTS = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
  secondary: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500',
  success: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
  danger: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
  outline: 'bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500'
};

const BUTTON_SIZES = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
};

const Button = memo(forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const { cx } = useThemedClasses();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variantClasses = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeClasses = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const fullWidthClass = fullWidth ? 'w-full' : '';

  const buttonClasses = cx(
    baseClasses,
    variantClasses,
    sizeClasses,
    fullWidthClass,
    className
  );

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null;

    return (
      <span className={cx(
        'flex items-center',
        position === 'left' && children ? 'mr-2' : '',
        position === 'right' && children ? 'ml-2' : ''
      )}>
        {typeof icon === 'string' ? (
          <span className="text-base">{icon}</span>
        ) : (
          icon
        )}
      </span>
    );
  };

  const renderLoader = () => {
    if (!loading) return null;

    return (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && renderLoader()}
      {renderIcon('left')}
      {children}
      {renderIcon('right')}
    </button>
  );
}));

Button.displayName = 'Button';

export default Button;

// Composants spécialisés pour plus de facilité
export const PrimaryButton = memo((props) => (
  <Button variant="primary" {...props} />
));

export const SecondaryButton = memo((props) => (
  <Button variant="secondary" {...props} />
));

export const DangerButton = memo((props) => (
  <Button variant="danger" {...props} />
));

export const GhostButton = memo((props) => (
  <Button variant="ghost" {...props} />
));

export const OutlineButton = memo((props) => (
  <Button variant="outline" {...props} />
));

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
DangerButton.displayName = 'DangerButton';
GhostButton.displayName = 'GhostButton';
OutlineButton.displayName = 'OutlineButton';