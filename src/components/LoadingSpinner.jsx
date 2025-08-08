import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = 'cyan', text = '' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  const colorClasses = {
    cyan: 'border-cyan-400',
    blue: 'border-blue-400',
    green: 'border-green-400',
    purple: 'border-purple-400',
    white: 'border-white'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`
        animate-spin rounded-full border-b-2 
        ${sizeClasses[size]} 
        ${colorClasses[color]}
      `} />
      {text && (
        <p className="mt-4 text-gray-400 text-sm">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;