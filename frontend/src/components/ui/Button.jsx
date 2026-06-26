import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand',
  secondary: 'bg-bg-sunken text-content-primary border border-border-subtle hover:border-border-strong',
  outline: 'border border-border-strong text-content-primary hover:bg-bg-sunken',
  ghost: 'text-content-secondary hover:bg-bg-sunken hover:text-content-primary',
  danger: 'bg-danger-500 text-white hover:bg-danger-600',
  success: 'bg-accent-500 text-white hover:bg-accent-600 hover:shadow-verified',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-7 text-base gap-2 rounded-xl',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth, className, children, disabled, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  );
});

export default Button;
