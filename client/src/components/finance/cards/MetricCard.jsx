import React from 'react';

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  trend,
  trendDirection = 'positive',
  onClick,
  darkMode = false,
  size = 'default' // 'small', 'default', 'large'
}) => {
  const iconColorClasses = {
    blue: darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-500',
    green: darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-500',
    red: darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500',
    purple: darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-500',
    orange: darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-500',
    indigo: darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-500'
  };

  const trendColorClasses = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500'
  };

  const sizeClasses = {
    small: 'p-4',
    default: 'p-6',
    large: 'p-8'
  };

  const titleSizeClasses = {
    small: 'text-xl',
    default: 'text-2xl',
    large: 'text-3xl'
  };

  const iconSizeClasses = {
    small: 'w-5 h-5',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return (
    <div
      onClick={onClick}
      className={`
        dashboard-metric-card group ${sizeClasses[size]} rounded-2xl border
        transition-all duration-300 hover:scale-105
        ${onClick ? 'cursor-pointer' : ''}
        ${darkMode
          ? 'bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 hover:bg-white backdrop-blur-xl shadow-lg hover:shadow-xl'
        }
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
      {/* Header with icon and trend */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColorClasses[iconColor]}`}>
          <Icon className={iconSizeClasses[size]} />
        </div>
        {trend && (
          <span
            className={`
              performance-indicator ${trendDirection}
              text-xs font-medium flex items-center gap-1
              ${trendColorClasses[trendDirection]}
            `}
            aria-label={`Trend: ${trend} ${trendDirection}`}
          >
            {trendDirection === 'positive' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V8M17 17H8" />
              </svg>
            )}
            {trendDirection === 'negative' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v9M7 7h9" />
              </svg>
            )}
            {trend}
          </span>
        )}
      </div>

      {/* Value */}
      <h3 className={`
        ${titleSizeClasses[size]} font-black mb-1
        ${darkMode ? 'text-white' : 'text-gray-900'}
      `}>
        {value}
      </h3>

      {/* Title and subtitle */}
      <div>
        <p className={`
          text-sm font-medium
          ${darkMode ? 'text-gray-400' : 'text-gray-600'}
        `}>
          {title}
        </p>
        {subtitle && (
          <p className={`
            text-xs mt-1
            ${darkMode ? 'text-gray-500' : 'text-gray-500'}
          `}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Click indicator */}
      {onClick && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default MetricCard;