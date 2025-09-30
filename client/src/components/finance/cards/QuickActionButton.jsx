import React from 'react';

const QuickActionButton = ({
  children,
  onClick,
  variant = 'primary', // 'primary', 'secondary', 'ghost'
  size = 'default', // 'small', 'default', 'large'
  icon: Icon,
  iconPosition = 'left', // 'left', 'right', 'only'
  darkMode = false,
  disabled = false,
  className = '',
  ariaLabel
}) => {
  const baseClasses = `
    dashboard-action-btn relative overflow-hidden
    inline-flex items-center justify-center gap-2
    font-medium transition-all duration-200
    backdrop-blur-sm hover:scale-105 focus:scale-105
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `;

  const sizeClasses = {
    small: 'px-3 py-1.5 text-xs rounded-lg',
    default: 'px-4 py-2 text-sm rounded-xl',
    large: 'px-6 py-3 text-base rounded-xl'
  };

  const iconSizeClasses = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  const variantClasses = {
    primary: darkMode
      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 focus:ring-white/30'
      : 'bg-[#F14545] hover:bg-[#E13E3E] text-white border border-[#F14545] focus:ring-[#F14545]/30 shadow-sm',
    secondary: darkMode
      ? 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-600 focus:ring-gray-500/30'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-gray-500/30',
    ghost: darkMode
      ? 'bg-transparent hover:bg-white/10 text-gray-300 border border-transparent focus:ring-white/30'
      : 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent focus:ring-gray-500/30'
  };

  const renderIcon = () => {
    if (!Icon) return null;
    return <Icon className={iconSizeClasses[size]} aria-hidden="true" />;
  };

  const renderContent = () => {
    if (iconPosition === 'only') {
      return renderIcon();
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        {children && <span className="truncate">{children}</span>}
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-label={ariaLabel || children}
      type="button"
    >
      {renderContent()}
    </button>
  );
};

export default QuickActionButton;