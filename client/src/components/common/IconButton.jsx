/**
 * Accessible Icon Button Component
 *
 * Icon button with built-in accessibility features:
 * - Tooltip support
 * - ARIA labels
 * - Keyboard navigation
 * - Focus indicators
 */

import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from './Tooltip';
import { handleKeyboardActivation } from '../../utils/accessibility';

const IconButton = ({
  icon,
  label,
  onClick,
  tooltip,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ariaLabel,
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg'
  };

  const variantClasses = {
    default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    primary: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    success: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    ghost: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
  };

  const button = (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => handleKeyboardActivation(e, onClick)}
      disabled={disabled || loading}
      aria-label={ariaLabel || label}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={`
        relative inline-flex items-center justify-center
        rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}

      {/* Screen reader only text */}
      <span className="sr-only">{label}</span>
    </button>
  );

  // Wrap with tooltip if provided
  if (tooltip && !disabled) {
    return (
      <Tooltip content={tooltip} delay={300}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

IconButton.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  tooltip: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'primary', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string
};

export default IconButton;
