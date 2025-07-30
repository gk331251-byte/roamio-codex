import React from 'react';
import { motion } from 'framer-motion';

/**
 * Modern Button Component - Design System Foundation
 * Features sage green primary, warm earth tone accents, and Inter font
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  as: Component = 'button',
  ...props
}) => {
  // Variant classes
  const variants = {
    primary: 'bg-sage-500 hover:bg-sage-600 focus:ring-sage-500 text-white shadow-sage',
    secondary: 'bg-white hover:bg-sage-50 focus:ring-sage-500 text-sage-700 border border-sage-200 shadow-sage',
    outline: 'border border-sage-500 text-sage-600 hover:bg-sage-50 focus:ring-sage-500',
    ghost: 'text-sage-600 hover:bg-sage-100 focus:ring-sage-500',
    earth: 'bg-earth-clay-500 hover:bg-earth-clay-600 focus:ring-earth-clay-500 text-white shadow-earth',
    sand: 'bg-earth-sand-500 hover:bg-earth-sand-600 focus:ring-earth-sand-500 text-white',
    forest: 'bg-earth-forest-500 hover:bg-earth-forest-600 focus:ring-earth-forest-500 text-white',
    success: 'bg-success-500 hover:bg-success-600 focus:ring-success-500 text-white',
    warning: 'bg-warning-500 hover:bg-warning-600 focus:ring-warning-500 text-white',
    error: 'bg-error-500 hover:bg-error-600 focus:ring-error-500 text-white',
  };

  // Size classes
  const sizes = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
    xl: 'px-10 py-4 text-xl',
  };

  // Base classes
  const baseClasses = `
    font-medium font-sans
    rounded-lg
    border border-transparent
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    inline-flex items-center justify-center
    ${fullWidth ? 'w-full' : ''}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  const LoadingSpinner = () => (
    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
  );

  const MotionComponent = motion(Component);

  return (
    <MotionComponent
      type={Component === 'button' ? type : undefined}
      disabled={disabled || loading}
      onClick={onClick}
      className={baseClasses}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {leftIcon && !loading && (
        <span className="mr-2 -ml-1">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && (
        <span className="ml-2 -mr-1">{rightIcon}</span>
      )}
    </MotionComponent>
  );
};

export default Button;