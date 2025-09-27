/**
 * Modern Enhanced Button Component
 *
 * Features:
 * - Multiple variants with modern styling
 * - Loading states with spinner
 * - Icon support
 * - Accessibility compliant
 * - Smooth animations and hover effects
 * - Size variants
 */

import React from 'react';
import { useInteractionTracking } from '../common/PerformanceProfiler';

const ModernButton = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onClick,
  className = '',
  type = 'button',
  ...props
}) => {
  const { trackInteraction } = useInteractionTracking();

  const handleClick = (e) => {
    if (disabled || isLoading) return;

    const startTime = Date.now();
    trackInteraction(`button-${variant}-click`, startTime);

    if (onClick) {
      onClick(e);
    }
  };

  const baseClasses = [
    'pluqla-btn',
    'relative',
    'font-medium',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:transform-none',
    'group'
  ];

  const variantClasses = {
    primary: [
      'bg-gradient-to-r',
      'from-pluqla-red-cherry',
      'to-pluqla-red-deep',
      'text-white',
      'shadow-pluqla-fun',
      'hover:shadow-lg',
      'hover:shadow-pluqla-red-bright/30',
      'hover:-translate-y-0.5',
      'focus:ring-pluqla-red-bright',
      'active:scale-95'
    ],
    secondary: [
      'bg-white',
      'border-2',
      'border-pluqla-red-cherry',
      'text-pluqla-red-cherry',
      'hover:bg-pluqla-red-cherry',
      'hover:text-white',
      'hover:-translate-y-0.5',
      'focus:ring-pluqla-red-bright',
      'active:scale-95',
      'shadow-sm',
      'hover:shadow-md'
    ],
    outline: [
      'bg-transparent',
      'border-2',
      'border-gray-300',
      'text-gray-700',
      'hover:border-pluqla-red-cherry',
      'hover:text-pluqla-red-cherry',
      'focus:ring-pluqla-red-bright',
      'active:scale-95'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-700',
      'hover:bg-gray-100',
      'hover:text-pluqla-red-cherry',
      'focus:ring-gray-300',
      'active:scale-95'
    ],
    success: [
      'bg-gradient-to-r',
      'from-green-500',
      'to-green-600',
      'text-white',
      'shadow-lg',
      'shadow-green-500/30',
      'hover:shadow-xl',
      'hover:shadow-green-500/40',
      'hover:-translate-y-0.5',
      'focus:ring-green-400',
      'active:scale-95'
    ],
    danger: [
      'bg-gradient-to-r',
      'from-red-500',
      'to-red-600',
      'text-white',
      'shadow-lg',
      'shadow-red-500/30',
      'hover:shadow-xl',
      'hover:shadow-red-500/40',
      'hover:-translate-y-0.5',
      'focus:ring-red-400',
      'active:scale-95'
    ]
  };

  const sizeClasses = {
    xs: ['px-2', 'py-1', 'text-xs', 'rounded'],
    sm: ['px-3', 'py-1.5', 'text-sm', 'rounded-md'],
    md: ['px-4', 'py-2', 'text-sm', 'rounded-lg'],
    lg: ['px-6', 'py-3', 'text-base', 'rounded-lg'],
    xl: ['px-8', 'py-4', 'text-lg', 'rounded-xl']
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const allClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
    className
  ].join(' ');

  const iconSize = iconSizeClasses[size];

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={allClasses}
      {...props}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSize}`} />
        </div>
      )}

      {/* Content wrapper with opacity for loading state */}
      <div className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
        {leftIcon && !isLoading && (
          <span className={`${iconSize} flex-shrink-0`}>
            {leftIcon}
          </span>
        )}

        <span className="truncate">
          {children}
        </span>

        {rightIcon && !isLoading && (
          <span className={`${iconSize} flex-shrink-0`}>
            {rightIcon}
          </span>
        )}
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    </button>
  );
};

// Icon components for common actions
export const ChevronRightIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const ChevronLeftIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export const PlusIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

export const CheckIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const XIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const LoadingIcon = ({ className = '' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="m12 2 0 4m0 12 0 4m10-10-4 0m-12 0-4 0m8.485-8.485 2.828 2.828m-12.728 0 2.828-2.828m9.9 9.9 2.828 2.828m-12.728 0 2.828-2.828" />
  </svg>
);

export default ModernButton;