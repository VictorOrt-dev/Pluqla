import React from 'react';
import { motion } from 'framer-motion';

/**
 * Phase 2A PluqlaCard Component
 * Premium card system with Pluqla Design DNA
 *
 * Features:
 * - Glassmorphism effect with backdrop blur (Phase 2A)
 * - Premium hover lift animation (Phase 2A)
 * - Red accent highlight border (Phase 2A)
 * - Glow effect optionnel (Phase 2A)
 * - Framer Motion animations fluides
 * - Variants multiples (solid, glass, elevated)
 * - Support dark mode
 */

const PluqlaCard = ({
  children,
  className = '',
  glass = false,         // Phase 2A: Glassmorphism
  glow = false,          // Phase 2A: Glow effect
  hover = true,          // Phase 2A: Hover animations
  highlight = false,     // Phase 2A: Red border accent
  elevated = false,      // Phase 2A: Shadow élevée
  padding = 'normal',    // none | sm | normal | lg
  darkMode = false,
  onClick,
  ...props
}) => {
  // Map des paddings
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    normal: '', // Utilise le défaut de pluqla-card (p-6)
    lg: 'p-8'
  };

  // Classes de base (utilise unified-theme.css)
  const baseClasses = `
    pluqla-card
    ${glass ? 'pluqla-card-glass' : ''}
    ${darkMode ? 'pluqla-card-dark' : ''}
    ${hover ? 'pluqla-hover-lift' : ''}
    ${elevated ? 'shadow-2xl' : ''}
    ${glow ? 'hover:pluqla-shadow-glow' : ''}
    ${highlight ? 'border-2 !border-pluqla-red pluqla-shadow-premium' : ''}
    ${paddingClasses[padding] || ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Animation variants pour Framer Motion
  const hoverAnimation = hover ? {
    y: -4,
    scale: 1.01,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17
    }
  } : {};

  const tapAnimation = hover ? {
    scale: 0.99,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17
    }
  } : {};

  return (
    <motion.div
      className={baseClasses}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hoverAnimation}
      whileTap={onClick ? tapAnimation : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * PluqlaStatCard - Card optimisée pour afficher des statistiques
 */
export const PluqlaStatCard = ({
  icon: Icon,
  label,
  value,
  change,
  trend,
  color = 'red', // red | green | blue | orange
  darkMode = false,
  ...props
}) => {
  const colorClasses = {
    red: 'pluqla-gradient-primary',
    green: 'pluqla-gradient-success',
    blue: 'pluqla-gradient-info',
    orange: 'pluqla-gradient-warning'
  };

  const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';

  return (
    <PluqlaCard
      glass={true}
      hover={true}
      darkMode={darkMode}
      className="flex flex-col gap-3"
      {...props}
    >
      {/* Icon */}
      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}

      {/* Label */}
      <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>

      {/* Value */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </h3>

      {/* Change indicator */}
      {change && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          trend === 'up' ? 'text-pluqla-green' :
          trend === 'down' ? 'text-pluqla-red' :
          'text-gray-600'
        }`}>
          <span>{trendIcon}</span>
          <span>{change}</span>
        </div>
      )}
    </PluqlaCard>
  );
};

/**
 * PluqlaInfoCard - Card avec icône et description
 */
export const PluqlaInfoCard = ({
  icon: Icon,
  title,
  description,
  action,
  darkMode = false,
  ...props
}) => {
  return (
    <PluqlaCard
      glass={true}
      hover={true}
      darkMode={darkMode}
      onClick={action?.onClick}
      {...props}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-full pluqla-gradient-primary flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {description}
          </p>

          {/* Action */}
          {action && (
            <button className="mt-3 text-pluqla-red font-semibold text-sm hover:underline flex items-center gap-1">
              {action.label}
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </PluqlaCard>
  );
};

/**
 * PluqlaFeatureCard - Card pour afficher une feature avec badge NEW
 */
export const PluqlaFeatureCard = ({
  icon: Icon,
  title,
  description,
  isNew = false,
  darkMode = false,
  onClick,
  ...props
}) => {
  return (
    <PluqlaCard
      glass={true}
      hover={true}
      highlight={isNew}
      glow={isNew}
      darkMode={darkMode}
      onClick={onClick}
      className="relative"
      {...props}
    >
      {/* Badge NEW */}
      {isNew && (
        <motion.div
          className="absolute -top-2 -right-2 bg-pluqla-red text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          NEW
        </motion.div>
      )}

      {/* Icon avec gradient */}
      {Icon && (
        <div className="w-16 h-16 rounded-2xl pluqla-gradient-primary flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        {description}
      </p>
    </PluqlaCard>
  );
};

export default PluqlaCard;
