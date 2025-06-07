import React from 'react';

export const Button = React.forwardRef(({ 
  className = "", 
  variant = "default", 
  size = "default", 
  disabled = false, 
  children, 
  ...props 
}, ref) => {
  const variants = {
    default: "bg-blue-500 text-white hover:bg-blue-600",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
    secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300",
    ghost: "text-gray-700 hover:bg-gray-100",
    link: "text-blue-500 underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-6 text-lg",
    icon: "h-10 w-10",
  };

  const variantClasses = variants[variant] || variants.default;
  const sizeClasses = sizes[size] || sizes.default;
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button"; 