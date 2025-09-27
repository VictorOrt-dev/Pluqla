import React from 'react';

/**
 * Skeleton Card Component
 * Provides branded loading states with smooth animations
 *
 * Features:
 * - Consistent Pluqla theme integration
 * - Multiple skeleton types for different content
 * - Smooth pulse animations
 * - Mobile-responsive design
 * - Dark/light mode support
 * - ARIA live regions for accessibility
 */

const SkeletonCard = ({
  type = 'default',
  darkMode = false,
  className = '',
  animate = true,
  ...props
}) => {
  // Base skeleton classes with Pluqla theme
  const baseClasses = `
    ${darkMode ? 'pluqla-card-dark' : 'pluqla-card-light'}
    p-6 ${className}
  `;

  // Skeleton element base classes
  const skeletonElementClasses = `
    ${animate ? 'animate-pulse' : ''}
    ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}
    rounded
  `;

  // Different skeleton layouts based on type
  const renderSkeletonContent = () => {
    switch (type) {
      case 'financial':
        return (
          <>
            {/* Header with icon and title */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`${skeletonElementClasses} w-10 h-10 rounded-lg`}></div>
                <div>
                  <div className={`${skeletonElementClasses} h-5 w-24 mb-2`}></div>
                  <div className={`${skeletonElementClasses} h-3 w-16`}></div>
                </div>
              </div>
              <div className={`${skeletonElementClasses} h-8 w-20`}></div>
            </div>

            {/* Content area */}
            <div className="space-y-3">
              <div className={`${skeletonElementClasses} h-4 w-full`}></div>
              <div className={`${skeletonElementClasses} h-4 w-3/4`}></div>
            </div>

            {/* Progress bar area */}
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <div className={`${skeletonElementClasses} h-3 w-16`}></div>
                <div className={`${skeletonElementClasses} h-3 w-8`}></div>
              </div>
              <div className={`${skeletonElementClasses} h-2 w-full rounded-full`}></div>
            </div>
          </>
        );

      case 'transaction':
        return (
          <>
            {/* Transaction list items */}
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center space-x-4 mb-4 last:mb-0">
                <div className={`${skeletonElementClasses} w-12 h-12 rounded-lg`}></div>
                <div className="flex-1">
                  <div className={`${skeletonElementClasses} h-4 w-32 mb-2`}></div>
                  <div className={`${skeletonElementClasses} h-3 w-24`}></div>
                </div>
                <div className="text-right">
                  <div className={`${skeletonElementClasses} h-4 w-16 mb-1`}></div>
                  <div className={`${skeletonElementClasses} h-3 w-12`}></div>
                </div>
              </div>
            ))}
          </>
        );

      case 'chart':
        return (
          <>
            {/* Chart header */}
            <div className="flex items-center justify-between mb-6">
              <div className={`${skeletonElementClasses} h-6 w-32`}></div>
              <div className={`${skeletonElementClasses} h-4 w-20`}></div>
            </div>

            {/* Mock chart area */}
            <div className="relative h-48 mb-4">
              <div className={`${skeletonElementClasses} absolute bottom-0 left-0 h-16 w-8`}></div>
              <div className={`${skeletonElementClasses} absolute bottom-0 left-12 h-24 w-8`}></div>
              <div className={`${skeletonElementClasses} absolute bottom-0 left-24 h-32 w-8`}></div>
              <div className={`${skeletonElementClasses} absolute bottom-0 left-36 h-20 w-8`}></div>
              <div className={`${skeletonElementClasses} absolute bottom-0 left-48 h-40 w-8`}></div>
            </div>

            {/* Chart legend */}
            <div className="flex items-center space-x-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <div className={`${skeletonElementClasses} w-3 h-3 rounded-full`}></div>
                  <div className={`${skeletonElementClasses} h-3 w-16`}></div>
                </div>
              ))}
            </div>
          </>
        );

      case 'profile':
        return (
          <>
            {/* Profile header */}
            <div className="flex items-center space-x-4 mb-6">
              <div className={`${skeletonElementClasses} w-16 h-16 rounded-full`}></div>
              <div>
                <div className={`${skeletonElementClasses} h-5 w-24 mb-2`}></div>
                <div className={`${skeletonElementClasses} h-4 w-32`}></div>
              </div>
            </div>

            {/* Profile details */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className={`${skeletonElementClasses} h-4 w-24`}></div>
                  <div className={`${skeletonElementClasses} h-4 w-32`}></div>
                </div>
              ))}
            </div>
          </>
        );

      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-3">
                <div className={`${skeletonElementClasses} h-12 w-full rounded-lg`}></div>
                <div className={`${skeletonElementClasses} h-4 w-full`}></div>
                <div className={`${skeletonElementClasses} h-3 w-3/4`}></div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <>
            {/* Default skeleton layout */}
            <div className="flex items-start space-x-4 mb-4">
              <div className={`${skeletonElementClasses} w-12 h-12 rounded-lg`}></div>
              <div className="flex-1">
                <div className={`${skeletonElementClasses} h-5 w-3/4 mb-2`}></div>
                <div className={`${skeletonElementClasses} h-4 w-1/2 mb-2`}></div>
                <div className={`${skeletonElementClasses} h-3 w-2/3`}></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`${skeletonElementClasses} h-4 w-full`}></div>
              <div className={`${skeletonElementClasses} h-4 w-5/6`}></div>
              <div className={`${skeletonElementClasses} h-4 w-4/5`}></div>
            </div>
          </>
        );
    }
  };

  return (
    <div
      className={baseClasses}
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours..."
      {...props}
    >
      {renderSkeletonContent()}
    </div>
  );
};

// Pre-configured skeleton variants for common use cases
export const SkeletonFinancialCard = (props) => (
  <SkeletonCard type="financial" {...props} />
);

export const SkeletonTransactionList = (props) => (
  <SkeletonCard type="transaction" {...props} />
);

export const SkeletonChart = (props) => (
  <SkeletonCard type="chart" {...props} />
);

export const SkeletonProfile = (props) => (
  <SkeletonCard type="profile" {...props} />
);

export const SkeletonGrid = (props) => (
  <SkeletonCard type="grid" {...props} />
);

// Skeleton list component for multiple loading items
export const SkeletonList = ({ count = 3, type = 'default', spacing = 'space-y-4', ...props }) => (
  <div className={spacing}>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={index} type={type} {...props} />
    ))}
  </div>
);

// Page-level skeleton for full page loading states
export const SkeletonPage = ({ darkMode = false }) => (
  <div className="min-h-screen p-4">
    {/* Header skeleton */}
    <div className={`${darkMode ? 'pluqla-card-dark' : 'pluqla-card-light'} p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className={`animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-8 w-32 rounded`}></div>
        <div className={`animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-10 w-10 rounded-full`}></div>
      </div>
    </div>

    {/* Main content skeletons */}
    <div className="space-y-6">
      <SkeletonFinancialCard darkMode={darkMode} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonChart darkMode={darkMode} />
        <SkeletonTransactionList darkMode={darkMode} />
      </div>
      <SkeletonGrid darkMode={darkMode} />
    </div>
  </div>
);

export default SkeletonCard;