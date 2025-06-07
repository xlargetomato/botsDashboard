import React from 'react';

export const Spinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-3",
    xl: "h-16 w-16 border-4"
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className={`animate-spin rounded-full ${sizeClass} border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent ${className}`}></div>
  );
}; 