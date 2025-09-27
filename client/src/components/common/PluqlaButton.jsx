import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Unified Pluqla Button Component
 * Provides consistent branding and UX across the entire application
 *
 * Features:
 * - Primary/Secondary variants with Pluqla theme
 * - Built-in loading states with branded spinner
 * - Mobile-optimized touch targets (min 48px)
 * - Accessibility support with ARIA labels
 * - Consistent hover/focus states
 * - Icon support for better UX
 */

const PluqlaButton = ({
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  children,
  className = '',
  ariaLabel,
  onClick,
  ...props
}) => {
  // Base classes for all buttons
  const baseClasses = `
    relative inline-flex items-center justify-center
    font-semibold rounded-xl
    transition-all duration-300
    focus:outline-none focus:ring-4 focus:ring-red-500/20
    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
    ${fullWidth ? 'w-full' : ''}
  `;

  // Size variations with mobile-first approach
  const sizeClasses = {
    small: 'px-4 py-2 text-sm min-h-[40px]',
    medium: 'px-6 py-3 text-base min-h-[48px]', // 48px min for touch targets
    large: 'px-8 py-4 text-lg min-h-[56px]'
  };

  // Variant styles using Pluqla theme
  const variantClasses = {
    primary: `
      pluqla-btn-primary text-white
      hover:pluqla-hover-lift hover:shadow-lg
      active:scale-95 active:shadow-sm
    `,
    secondary: `
      pluqla-btn-secondary
      hover:bg-red-500 hover:text-white hover:border-red-500
      hover:shadow-md hover:-translate-y-0.5
      active:scale-95
    `,
    outline: `
      bg-transparent border-2 border-red-500 text-red-500
      hover:bg-red-500 hover:text-white
      hover:shadow-md hover:-translate-y-0.5
      active:scale-95
    `,
    ghost: `
      bg-transparent text-red-500
      hover:bg-red-50 dark:hover:bg-red-900/20
      hover:text-red-600 dark:hover:text-red-400
      active:scale-95
    `,
    danger: `
      bg-red-600 text-white border-2 border-red-600
      hover:bg-red-700 hover:border-red-700
      hover:shadow-lg hover:-translate-y-0.5
      active:scale-95
    `
  };

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  // Handle click with loading protection
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  // Render icon with proper spacing
  const renderIcon = () => {
    if (!icon || loading) return null;

    return (
      <span className={`flex-shrink-0 ${
        iconPosition === 'left' ? 'mr-2' : 'ml-2'
      }`}>
        {typeof icon === 'string' ? (
          <span className="text-lg">{icon}</span>
        ) : (
          icon
        )}
      </span>
    );
  };

  // Render loading state
  const renderLoading = () => {
    if (!loading) return null;

    return (
      <span className="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner size="sm" color="currentColor" />
      </span>
    );
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={handleClick}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      {...props}
    >
      {/* Loading overlay */}
      {renderLoading()}

      {/* Button content */}
      <span className={`flex items-center justify-center ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {iconPosition === 'left' && renderIcon()}
        <span className="flex-1">{children}</span>
        {iconPosition === 'right' && renderIcon()}
      </span>
    </button>
  );
};

// Pre-configured button variations for common use cases
export const PrimaryButton = (props) => <PluqlaButton variant="primary" {...props} />;
export const SecondaryButton = (props) => <PluqlaButton variant="secondary" {...props} />;
export const OutlineButton = (props) => <PluqlaButton variant="outline" {...props} />;
export const GhostButton = (props) => <PluqlaButton variant="ghost" {...props} />;
export const DangerButton = (props) => <PluqlaButton variant="danger" {...props} />;

// Icon button for compact spaces
export const IconButton = ({ icon, ariaLabel, size = 'medium', ...props }) => (
  <PluqlaButton
    variant="ghost"
    size={size}
    className="!px-2 !min-w-[48px] aspect-square"
    ariaLabel={ariaLabel}
    {...props}
  >
    {icon}
  </PluqlaButton>
);

export default PluqlaButton;