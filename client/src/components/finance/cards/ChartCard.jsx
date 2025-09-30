import React from 'react';

const ChartCard = ({
  title,
  subtitle,
  children,
  onClick,
  darkMode = false,
  size = 'default', // 'small', 'default', 'large'
  className = ''
}) => {
  const sizeClasses = {
    small: 'p-4',
    default: 'p-6',
    large: 'p-8'
  };

  const titleSizeClasses = {
    small: 'text-lg',
    default: 'text-xl',
    large: 'text-2xl'
  };

  return (
    <div
      onClick={onClick}
      className={`
        dashboard-chart-card group ${sizeClasses[size]} rounded-2xl border
        transition-all duration-300 hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''}
        ${darkMode
          ? 'bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 hover:bg-white backdrop-blur-xl shadow-lg hover:shadow-xl'
        }
        ${className}
      `}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `Navigate to ${title} details` : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h3 className={`
            ${titleSizeClasses[size]} font-bold truncate
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}>
            {title}
          </h3>
          {subtitle && (
            <p className={`
              text-sm mt-1 truncate
              ${darkMode ? 'text-gray-400' : 'text-gray-600'}
            `}>
              {subtitle}
            </p>
          )}
        </div>

        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;