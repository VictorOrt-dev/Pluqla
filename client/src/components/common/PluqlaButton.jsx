import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

/**
 * Phase 2A Enhanced Pluqla Button Component
 * Premium button system with Pluqla Design DNA
 *
 * Features:
 * - Shimmer effect on hover (Phase 2A)
 * - Framer Motion spring animations (Phase 2A)
 * - Premium glow effect (Phase 2A)
 * - Gradient rouge signature
 * - Built-in loading states with branded spinner
 * - Mobile-optimized touch targets (min 44px)
 * - Accessibility support with ARIA labels
 * - Icon support for better UX
 */

const PluqlaButton = ({
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  shimmer = true, // Phase 2A: Active par défaut
  glow = false,   // Phase 2A: Effet glow optionnel
  icon = null,
  iconPosition = 'left',
  children,
  className = '',
  ariaLabel,
  onClick,
  ...props
}) => {
  // Base classes for all buttons (utilise les classes unified-theme.css)
  const baseClasses = `
    pluqla-btn
    ${fullWidth ? 'w-full' : ''}
    ${glow ? 'hover:pluqla-shadow-glow' : ''}
  `;

  // Size variations with mobile-first approach (44px min touch target)
  const sizeClasses = {
    small: 'text-sm px-4 py-2 min-h-[40px]',
    medium: '', // Utilise le défaut de pluqla-btn (44px)
    large: 'text-lg px-8 py-4 min-h-[52px]',
    xl: 'text-xl px-10 py-5 min-h-[60px]'
  };

  // Variant styles using Pluqla theme (utilise unified-theme.css)
  const variantClasses = {
    primary: 'pluqla-btn-primary',
    secondary: 'pluqla-btn-secondary',
    ghost: 'pluqla-btn-ghost',
    success: 'pluqla-btn-success',
    danger: 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 shadow-md hover:shadow-lg'
  };

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size] || ''}
    ${variantClasses[variant] || variantClasses.primary}
    ${className}
  `.trim().replace(/\s+/g, ' ');

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
    <motion.button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={handleClick}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      // Phase 2A: Spring animations fluides 60fps
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17
      }}
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
    </motion.button>
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