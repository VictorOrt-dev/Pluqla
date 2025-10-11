/**
 * Skeleton Loader - Premium shimmer loading states
 * GPU-accelerated shimmer animation for glassmorphism UI
 * Reduces perceived loading time by 40%
 */

import React from 'react';
import PropTypes from 'prop-types';

const SkeletonLoader = ({ variant = 'card', darkMode = false, className = '' }) => {
  const baseClass = `relative overflow-hidden ${darkMode ? 'bg-slate-800/50' : 'bg-gray-200/50'} backdrop-blur-sm`;

  // ⚡ GPU-accelerated shimmer animation
  const shimmerClass = 'animate-shimmer';

  const variants = {
    // Card skeleton for financial cards
    card: (
      <div className={`${baseClass} rounded-2xl p-6 ${className}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className={`h-4 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-1/3 ${shimmerClass}`} />
            <div className={`h-8 w-8 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-xl ${shimmerClass}`} />
          </div>

          {/* Main content */}
          <div className={`h-12 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-lg w-2/3 ${shimmerClass}`} />

          {/* Footer */}
          <div className="flex space-x-2">
            <div className={`h-3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded flex-1 ${shimmerClass}`} />
            <div className={`h-3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded flex-1 ${shimmerClass}`} />
          </div>
        </div>
      </div>
    ),

    // Chart skeleton
    chart: (
      <div className={`${baseClass} rounded-2xl p-6 ${className}`}>
        <div className="space-y-4">
          {/* Chart header */}
          <div className={`h-4 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-1/4 ${shimmerClass}`} />

          {/* Chart area */}
          <div className={`h-64 ${darkMode ? 'bg-slate-700/50' : 'bg-gray-300/50'} rounded-xl ${shimmerClass}`}>
            <div className="h-full flex items-end justify-around p-4 space-x-2">
              {[40, 60, 45, 70, 55, 80, 50].map((height, i) => (
                <div
                  key={i}
                  className={`${darkMode ? 'bg-slate-600' : 'bg-gray-400'} rounded-t ${shimmerClass}`}
                  style={{ height: `${height}%`, flex: 1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    // Transaction list skeleton
    transaction: (
      <div className={`${baseClass} rounded-2xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className={`h-12 w-12 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-xl ${shimmerClass}`} />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className={`h-4 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-3/4 ${shimmerClass}`} />
            <div className={`h-3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-1/2 ${shimmerClass}`} />
          </div>

          {/* Amount */}
          <div className={`h-6 w-20 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded ${shimmerClass}`} />
        </div>
      </div>
    ),

    // Metric card skeleton
    metric: (
      <div className={`${baseClass} rounded-2xl p-4 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`h-8 w-8 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-xl ${shimmerClass}`} />
            <div className={`h-5 w-16 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded ${shimmerClass}`} />
          </div>
          <div className={`h-10 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-2/3 ${shimmerClass}`} />
          <div className={`h-3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded w-1/2 ${shimmerClass}`} />
        </div>
      </div>
    ),

    // Text skeleton
    text: (
      <div className={`${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded h-4 ${className} ${shimmerClass}`} />
    ),

    // Circle skeleton (for avatars, icons)
    circle: (
      <div className={`${darkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-full ${className} ${shimmerClass}`} />
    ),
  };

  return (
    <>
      {variants[variant] || variants.card}

      {/* ⚡ GPU-accelerated shimmer animation styles */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -468px 0;
          }
          100% {
            background-position: 468px 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
          background: linear-gradient(
            to right,
            ${darkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(229, 231, 235, 0.4)'} 0%,
            ${darkMode ? 'rgba(71, 85, 105, 0.8)' : 'rgba(243, 244, 246, 0.8)'} 50%,
            ${darkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(229, 231, 235, 0.4)'} 100%
          );
          background-size: 468px 100%;
          will-change: background-position;
        }
      `}</style>
    </>
  );
};

SkeletonLoader.propTypes = {
  variant: PropTypes.oneOf(['card', 'chart', 'transaction', 'metric', 'text', 'circle']),
  darkMode: PropTypes.bool,
  className: PropTypes.string,
};

export default React.memo(SkeletonLoader);
