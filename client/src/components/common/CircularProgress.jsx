import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const CircularProgress = ({
  amount = 0,
  percentage = 0,
  size = 192,
  goal = 1000,
  darkMode = false,
  animated = true,
  clickable = true
}) => {
  const { setCurrentScreen } = useNavigation();
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedAmount, setAnimatedAmount] = useState(0);

  // Calculate circle properties for perfect alignment
  const strokeWidth = size * 0.08; // 8% of size for proportional stroke
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  // Smooth animation effect
  useEffect(() => {
    if (!animated) {
      setAnimatedPercentage(percentage);
      setAnimatedAmount(amount);
      return;
    }

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const startPercentage = animatedPercentage;
    const startAmount = animatedAmount;
    const percentageDiff = percentage - startPercentage;
    const amountDiff = amount - startAmount;

    const animate = () => {
      if (currentStep <= steps) {
        // Cubic bezier easing function for smooth animation
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        setAnimatedPercentage(startPercentage + (percentageDiff * eased));
        setAnimatedAmount(startAmount + (amountDiff * eased));

        currentStep++;
        setTimeout(animate, stepDuration);
      }
    };

    animate();
  }, [percentage, amount, animated]);

  const handleClick = () => {
    if (clickable) {
      setCurrentScreen('finance');
    }
  };

  const handleKeyDown = (e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`relative mx-auto transform transition-all duration-300 ${
        clickable ? 'cursor-pointer hover:scale-105 group' : ''
      }`}
      style={{ width: size, height: size }}
      onClick={clickable ? handleClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      aria-label={clickable ? "Accéder à Finance" : undefined}
    >
      {/* Enhanced glow for light mode visibility */}
      <div
        className={`absolute inset-0 rounded-full blur-xl animate-pulse group-hover:opacity-30 transition-opacity ${
          darkMode ? 'opacity-20' : 'opacity-30'
        }`}
        style={{
          background: 'linear-gradient(135deg, #F14545 0%, #FF6B6B 50%, #D73030 100%)',
          transform: 'scale(0.8)'
        }}
      />

      {/* Enhanced shadow with light mode optimization */}
      <div
        className="absolute rounded-full"
        style={{
          top: size * 0.05,
          left: size * 0.05,
          right: size * 0.05,
          bottom: size * 0.05,
          boxShadow: darkMode
            ? `0 ${size * 0.05}px ${size * 0.15}px rgba(241, 69, 69, 0.2)`
            : `0 ${size * 0.03}px ${size * 0.12}px rgba(241, 69, 69, 0.25), 0 ${size * 0.08}px ${size * 0.25}px rgba(241, 69, 69, 0.1)`
        }}
      />

      {/* SVG Circle with perfect alignment */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 relative z-10"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={darkMode ? '#374151' : '#E5E7EB'}
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />

        {/* Progress circle with smooth animation */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#pluqla-progress-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out filter drop-shadow-lg"
          style={{
            transitionProperty: 'stroke-dashoffset',
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        />

        <defs>
          {/* Enhanced Pluqla gradient */}
          <linearGradient
            id="pluqla-progress-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#F14545" stopOpacity="1" />
            <stop offset="40%" stopColor="#FF6B6B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D73030" stopOpacity="1" />
          </linearGradient>

          {/* Glow effect filter */}
          <filter id="progress-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Main amount with enhanced readability */}
        <div className={`font-bold transition-all duration-300 ${
          darkMode
            ? 'text-white group-hover:text-[#FF6B6B]'
            : 'text-[#121212] group-hover:text-[#F14545] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
        }`}
        style={{ fontSize: size * 0.18 }}>
          {Math.round(animatedAmount)}€
        </div>

        {/* Secondary text */}
        <div
          className={`font-medium ${darkMode ? 'text-gray-400' : 'text-[#9CA3AF]'}`}
          style={{ fontSize: size * 0.065 }}
        >
          économisés
        </div>

        {/* Progress percentage */}
        <div
          className={`font-semibold mt-1 ${
            darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
          }`}
          style={{ fontSize: size * 0.055 }}
        >
          {Math.round(animatedPercentage)}% de {goal}€
        </div>

        {/* Hover call-to-action */}
        {clickable && (
          <div
            className={`font-medium mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
              darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
            }`}
            style={{ fontSize: size * 0.045 }}
          >
            📊 Voir le détail
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularProgress;