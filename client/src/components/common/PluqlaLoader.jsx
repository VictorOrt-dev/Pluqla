import React from 'react';
import { motion } from 'framer-motion';

/**
 * Phase 2A PluqlaLoader Component
 * Branded loading states avec l'identité Pluqla
 *
 * Features:
 * - Spinner avec gradient rouge (Phase 2A)
 * - Pulse loader avec Pluqla logo (Phase 2A)
 * - Dots loader avec animation staggerée (Phase 2A)
 * - Progress bar avec shimmer (Phase 2A)
 * - Fullscreen overlay optionnel
 * - Sizes flexibles
 */

/**
 * Spinner Loader - Rotating ring avec gradient rouge
 */
export const PluqlaSpinner = ({
  size = 'md',
  color = 'red',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-[5px]'
  };

  const colorClasses = {
    red: 'border-gray-200 border-t-pluqla-red',
    white: 'border-white/20 border-t-white',
    current: 'border-current/20 border-t-current'
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${className}
      `}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

/**
 * Dots Loader - Three bouncing dots avec animation staggerée
 */
export const PluqlaDots = ({
  size = 'md',
  color = 'red',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colorClasses = {
    red: 'bg-pluqla-red',
    white: 'bg-white',
    current: 'bg-current'
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`
            ${sizeClasses[size]}
            ${colorClasses[color]}
            rounded-full
          `}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "reverse",
            delay: index * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

/**
 * Pulse Loader - Pulsing circle avec gradient rouge
 */
export const PluqlaPulse = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Outer pulse ring */}
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-full
          pluqla-gradient-primary
          opacity-30
          absolute inset-0
        `}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.1, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Inner circle */}
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-full
          pluqla-gradient-primary
          flex items-center justify-center
          shadow-lg
        `}
        animate={{
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Pluqla logo or icon */}
        <span className="text-white font-bold text-xl">P</span>
      </motion.div>
    </div>
  );
};

/**
 * Progress Bar - Linear progress avec shimmer effect
 */
export const PluqlaProgress = ({
  value = 0,
  max = 100,
  showPercentage = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      {/* Progress bar container */}
      <div className="pluqla-progress">
        <motion.div
          className="pluqla-progress-bar relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>

      {/* Percentage text */}
      {showPercentage && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center font-medium">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
};

/**
 * Main PluqlaLoader Component - Unified loader avec variants
 */
const PluqlaLoader = ({
  variant = 'spinner', // spinner | pulse | dots | progress
  size = 'md',
  text = '',
  fullscreen = false,
  progress = undefined,
  className = ''
}) => {
  // Render le loader approprié
  const renderLoader = () => {
    switch (variant) {
      case 'pulse':
        return <PluqlaPulse size={size} />;
      case 'dots':
        return <PluqlaDots size={size} />;
      case 'progress':
        return (
          <PluqlaProgress
            value={progress}
            showPercentage={true}
            className="w-full max-w-xs"
          />
        );
      case 'spinner':
      default:
        return <PluqlaSpinner size={size} />;
    }
  };

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {renderLoader()}
        {text && (
          <motion.p
            className="mt-6 text-gray-700 dark:text-gray-300 font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </motion.div>
    );
  }

  // Inline loader
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {renderLoader()}
      {text && (
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {text}
        </p>
      )}
    </div>
  );
};

export default PluqlaLoader;
