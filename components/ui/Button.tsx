import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, asChild, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-brand',
      {
        // Variants
        'bg-brand-primary text-white hover:bg-brand-accent shadow-brand-sm': variant === 'primary',
        'bg-brand-secondary text-white hover:bg-brand-secondary/90 shadow-brand-sm': variant === 'secondary',
        'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white': variant === 'outline',
        'hover:bg-background-subtle text-neutral-text': variant === 'ghost',
        'text-brand-primary underline-offset-4 hover:underline': variant === 'link',
        
        // Sizes
        'h-8 px-3 text-sm': size === 'sm',
        'h-10 px-4 py-2': size === 'md',
        'h-12 px-6 text-lg': size === 'lg',
      },
      className
    );

    if (asChild) {
      return React.cloneElement(children as React.ReactElement, {
        className: cn(classes, (children as React.ReactElement).props.className)
      });
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';