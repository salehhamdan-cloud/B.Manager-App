
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-[6px]',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4" aria-busy="true" aria-live="polite">
      <div
        className={`${sizeClasses[size]} border-sky-500 border-t-transparent rounded-full animate-spin`}
      ></div>
      {text && <p className="mt-3 text-sky-600 font-medium text-center">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;