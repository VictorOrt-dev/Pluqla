import React from 'react';

const LoadingSpinner = ({ darkMode = false, size = 'md', message = 'Chargement...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-solid ${
          darkMode
            ? 'border-gray-600 border-t-blue-400'
            : 'border-gray-300 border-t-blue-500'
        }`}
      />
      {message && (
        <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;