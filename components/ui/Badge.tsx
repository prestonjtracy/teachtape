import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          {
            'bg-brand-primary/10 text-brand-primary': variant === 'default',
            'bg-green-100 text-green-800': variant === 'success',
            'bg-yellow-100 text-yellow-800': variant === 'warning',
            'bg-red-100 text-red-800': variant === 'error',
            'bg-gray-100 text-gray-800': variant === 'secondary',
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';