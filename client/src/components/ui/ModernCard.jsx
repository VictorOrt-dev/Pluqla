/**
 * Modern Enhanced Card Component
 *
 * Features:
 * - Multiple variants (default, glass, elevated, bordered)
 * - Hover effects and animations
 * - Flexible padding and radius options
 * - Loading states with skeleton
 * - Clickable cards with interaction feedback
 * - Accessibility compliant
 */

import React from 'react';
import { useInteractionTracking } from '../common/PerformanceProfiler';

const ModernCard = ({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  shadow = 'md',
  hover = true,
  clickable = false,
  isLoading = false,
  onClick,
  className = '',
  header,
  footer,
  ...props
}) => {
  const { trackInteraction } = useInteractionTracking();

  const handleClick = (e) => {
    if (!clickable || !onClick) return;

    const startTime = Date.now();
    trackInteraction(`card-${variant}-click`, startTime);
    onClick(e);
  };

  const baseClasses = [
    'transition-all',
    'duration-300',
    'ease-out',
    'relative',
    'overflow-hidden'
  ];

  const variantClasses = {
    default: [
      'bg-white',
      'dark:bg-gray-800',
      'border',
      'border-gray-200',
      'dark:border-gray-700'
    ],
    glass: [
      'bg-white/10',
      'dark:bg-gray-900/10',
      'backdrop-blur-lg',
      'border',
      'border-white/20',
      'dark:border-gray-700/30'
    ],
    elevated: [
      'bg-white',
      'dark:bg-gray-800',
      'border-0'
    ],
    bordered: [
      'bg-white',
      'dark:bg-gray-800',
      'border-2',
      'border-gray-200',
      'dark:border-gray-700'
    ],
    gradient: [
      'bg-gradient-to-br',
      'from-white',
      'to-gray-50',
      'dark:from-gray-800',
      'dark:to-gray-900',
      'border',
      'border-gray-200',
      'dark:border-gray-700'
    ]
  };

  const paddingClasses = {
    none: '',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    pluqla: 'shadow-lg shadow-pluqla-red-cherry/20'
  };

  const hoverClasses = hover ? [
    'hover:transform',
    'hover:-translate-y-1',
    'hover:shadow-xl',
    clickable ? 'cursor-pointer' : '',
    'hover:shadow-pluqla-red-cherry/10'
  ] : [];

  const clickableClasses = clickable ? [
    'cursor-pointer',
    'select-none',
    'active:scale-98',
    'active:shadow-md'
  ] : [];

  const allClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    ...hoverClasses,
    ...clickableClasses,
    paddingClasses[padding],
    radiusClasses[radius],
    shadowClasses[shadow],
    className
  ].filter(Boolean).join(' ');

  if (isLoading) {
    return (
      <div className={allClasses} {...props}>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div
      className={allClasses}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      } : undefined}
      {...props}
    >
      {/* Header */}
      {header && (
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}

      {/* Hover glow effect for glass variant */}
      {variant === 'glass' && hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-pluqla-red-cherry/5 via-transparent to-pluqla-red-bright/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  );
};

// Skeleton loader component
const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
    </div>
  </div>
);

// Enhanced card variants for specific use cases
export const StatCard = ({ title, value, change, trend, icon, ...props }) => (
  <ModernCard variant="elevated" shadow="lg" hover className="group" {...props}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {change && (
          <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {trend === 'up' && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {change}
          </div>
        )}
      </div>
      {icon && (
        <div className="p-3 bg-pluqla-red-cherry/10 rounded-lg group-hover:bg-pluqla-red-cherry/20 transition-colors duration-200">
          <div className="w-6 h-6 text-pluqla-red-cherry">
            {icon}
          </div>
        </div>
      )}
    </div>
  </ModernCard>
);

export const FeatureCard = ({ title, description, icon, action, ...props }) => (
  <ModernCard
    variant="default"
    shadow="md"
    hover
    clickable={!!action}
    onClick={action}
    className="group"
    {...props}
  >
    <div className="text-center">
      {icon && (
        <div className="w-12 h-12 mx-auto mb-4 p-3 bg-pluqla-red-cherry/10 rounded-lg group-hover:bg-pluqla-red-cherry/20 transition-colors duration-200">
          <div className="w-6 h-6 text-pluqla-red-cherry mx-auto">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {description}
        </p>
      )}
    </div>
  </ModernCard>
);

export const NotificationCard = ({ type = 'info', title, message, onClose, ...props }) => {
  const typeClasses = {
    success: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20',
    warning: 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    error: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20',
    info: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
  };

  const iconClasses = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <ModernCard
      variant="default"
      className={`${typeClasses[type]} animate-slide-down`}
      {...props}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${iconClasses[type]}`}>
          {type === 'success' && (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'warning' && (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'error' && (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'info' && (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </ModernCard>
  );
};

export default ModernCard;