/**
 * Modern Enhanced Progress Circle Component
 *
 * Features:
 * - Smooth animated progress with spring easing
 * - Multiple size variants
 * - Custom colors and gradients
 * - Inner content display (text, icons, values)
 * - Accessibility compliant with ARIA attributes
 * - Performance optimized with CSS transforms
 * - Glow effects and modern styling
 */

import React, { useEffect, useState, useRef } from 'react';
import { useInteractionTracking } from '../common/PerformanceProfiler';

const ModernProgressCircle = ({
  progress = 0,
  size = 'lg',
  strokeWidth = 8,
  color = 'primary',
  showValue = true,
  showPercentage = true,
  children,
  animationDuration = 1000,
  glow = false,
  className = '',
  onClick,
  ...props
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef();
  const { trackInteraction } = useInteractionTracking();

  const sizeConfig = {
    xs: { radius: 30, container: 80, text: 'text-xs' },
    sm: { radius: 40, container: 100, text: 'text-sm' },
    md: { radius: 50, container: 120, text: 'text-base' },
    lg: { radius: 70, container: 160, text: 'text-lg' },
    xl: { radius: 90, container: 200, text: 'text-xl' },
    '2xl': { radius: 120, container: 260, text: 'text-2xl' }
  };

  const colorConfig = {
    primary: {
      gradient: ['#F14545', '#D73030'],
      glow: 'rgba(241, 69, 69, 0.4)',
      background: 'rgba(241, 69, 69, 0.1)'
    },
    success: {
      gradient: ['#22C55E', '#15803D'],
      glow: 'rgba(34, 197, 94, 0.4)',
      background: 'rgba(34, 197, 94, 0.1)'
    },
    warning: {
      gradient: ['#F59E0B', '#B45309'],
      glow: 'rgba(245, 158, 11, 0.4)',
      background: 'rgba(245, 158, 11, 0.1)'
    },
    info: {
      gradient: ['#3B82F6', '#1D4ED8'],
      glow: 'rgba(59, 130, 246, 0.4)',
      background: 'rgba(59, 130, 246, 0.1)'
    },
    gray: {
      gradient: ['#6B7280', '#374151'],
      glow: 'rgba(107, 114, 128, 0.4)',
      background: 'rgba(107, 114, 128, 0.1)'
    }
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];

  // Calculate circle properties
  const radius = config.radius;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Animate progress change
  useEffect(() => {
    setIsAnimating(true);

    const startValue = animatedProgress;
    const endValue = Math.min(Math.max(progress, 0), 100);
    const duration = animationDuration;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const ratio = Math.min(elapsed / duration, 1);

      // Spring easing function
      const easeOutBack = (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const easedRatio = easeOutBack(ratio);
      const currentValue = startValue + (endValue - startValue) * easedRatio;

      setAnimatedProgress(currentValue);

      if (ratio < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress, animationDuration]);

  const handleClick = (e) => {
    if (onClick) {
      const startTime = Date.now();
      trackInteraction(`progress-circle-${color}-click`, startTime);
      onClick(e);
    }
  };

  const svgSize = config.container;
  const center = svgSize / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: svgSize, height: svgSize }}
      onClick={handleClick}
      role={onClick ? 'button' : 'progressbar'}
      tabIndex={onClick ? 0 : undefined}
      aria-valuenow={Math.round(animatedProgress)}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={`Progress: ${Math.round(animatedProgress)}%`}
      {...props}
    >
      {/* Background glow effect */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-lg animate-pulse"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            opacity: animatedProgress > 0 ? 0.6 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
        />
      )}

      {/* SVG Progress Circle */}
      <svg
        width={svgSize}
        height={svgSize}
        className={`transform ${isAnimating ? 'animate-pulse' : ''}`}
        style={{ filter: glow ? `drop-shadow(0 0 8px ${colors.glow})` : 'none' }}
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.background}
          strokeWidth={strokeWidth}
          className="opacity-20"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${color})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: `stroke-dashoffset ${animationDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
            filter: glow ? `url(#glow-${color})` : 'none'
          }}
          className="drop-shadow-sm"
        />

        {/* Inner glow circle for enhanced effect */}
        {glow && animatedProgress > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2}
            fill="none"
            stroke={colors.gradient[0]}
            strokeWidth="1"
            className="opacity-30 animate-pulse"
            style={{
              filter: `drop-shadow(0 0 4px ${colors.glow})`
            }}
          />
        )}
      </svg>

      {/* Content overlay */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${config.text}`}>
        {children ? (
          children
        ) : (
          <>
            {showValue && (
              <div className="font-bold text-gray-900 dark:text-white leading-none">
                {Math.round(animatedProgress)}
                {showPercentage && <span className="text-xs opacity-75">%</span>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Animated dot at progress end */}
      {animatedProgress > 0 && (
        <div
          className="absolute w-3 h-3 rounded-full shadow-lg transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
            top: center - radius - 6,
            left: center - 6,
            transform: `rotate(${(animatedProgress / 100) * 360 - 90}deg)`,
            transformOrigin: `6px ${radius + 6}px`,
            boxShadow: glow ? `0 0 8px ${colors.glow}` : '0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
      )}
    </div>
  );
};

// Enhanced variants for specific use cases
export const SavingsProgressCircle = ({
  savedAmount = 0,
  goalAmount = 1000,
  currency = '€',
  size = 'xl',
  ...props
}) => {
  const percentage = goalAmount > 0 ? (savedAmount / goalAmount) * 100 : 0;

  return (
    <ModernProgressCircle
      progress={percentage}
      size={size}
      color="primary"
      glow
      showValue={false}
      {...props}
    >
      <div className="text-center">
        <div className="font-bold text-lg text-gray-900 dark:text-white">
          {savedAmount.toLocaleString()}{currency}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          sur {goalAmount.toLocaleString()}{currency}
        </div>
        <div className="text-xs font-medium text-pluqla-red-cherry mt-1">
          {Math.round(percentage)}%
        </div>
      </div>
    </ModernProgressCircle>
  );
};

export const LevelProgressCircle = ({
  currentXP = 0,
  xpToNext = 100,
  level = 1,
  size = 'lg',
  ...props
}) => {
  const percentage = xpToNext > 0 ? (currentXP / xpToNext) * 100 : 0;

  return (
    <ModernProgressCircle
      progress={percentage}
      size={size}
      color="success"
      showValue={false}
      {...props}
    >
      <div className="text-center">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Niveau
        </div>
        <div className="font-bold text-xl text-gray-900 dark:text-white">
          {level}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {currentXP}/{xpToNext} XP
        </div>
      </div>
    </ModernProgressCircle>
  );
};

export const StreakProgressCircle = ({
  currentStreak = 0,
  maxStreak = 30,
  size = 'md',
  ...props
}) => {
  const percentage = maxStreak > 0 ? (currentStreak / maxStreak) * 100 : 0;

  return (
    <ModernProgressCircle
      progress={percentage}
      size={size}
      color="warning"
      glow={currentStreak > 0}
      showValue={false}
      {...props}
    >
      <div className="text-center">
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          🔥
        </div>
        <div className="font-bold text-sm text-gray-900 dark:text-white">
          {currentStreak}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          jours
        </div>
      </div>
    </ModernProgressCircle>
  );
};

export default ModernProgressCircle;