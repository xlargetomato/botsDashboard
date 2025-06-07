import React from 'react';

export const Alert = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative w-full p-4 rounded-lg border mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));

Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={`font-medium mb-1 leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h5>
));

AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm ${className}`}
    {...props}
  >
    {children}
  </div>
));

AlertDescription.displayName = 'AlertDescription'; 