import React from 'react';
import { motion } from 'framer-motion';

/**
 * Modern Badge Component - Design System Foundation
 * Features sage green primary, warm earth tone accents, and Inter font
 */
const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  dot = false,
  removable = false,
  onRemove,
  className = '',
  as: Component = 'span',
  ...props
}) => {
  // Variant classes
  const variants = {
    primary: 'bg-sage-100 text-sage-800 border-sage-200',
    secondary: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    sage: 'bg-sage-500 text-white',
    earth: 'bg-earth-clay-100 text-earth-clay-800 border-earth-clay-200',
    sand: 'bg-earth-sand-100 text-earth-sand-800 border-earth-sand-200',
    forest: 'bg-earth-forest-100 text-earth-forest-800 border-earth-forest-200',
    success: 'bg-success-100 text-success-800 border-success-200',
    warning: 'bg-warning-100 text-warning-800 border-warning-200',
    error: 'bg-error-100 text-error-800 border-error-200',
    outline: 'bg-transparent text-sage-600 border-sage-300',
    glass: 'bg-white/80 backdrop-blur-sm text-neutral-700 border-white/40',
  };

  // Size classes
  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
    xl: 'px-5 py-2 text-base',
  };

  // Icon size classes
  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  };

  // Base classes
  const baseClasses = `
    inline-flex items-center
    font-medium font-sans
    rounded-full
    border
    transition-all duration-200
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  const RemoveButton = () => (
    <motion.button
      type="button"
      onClick={onRemove}
      className="ml-1.5 -mr-1 flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </motion.button>
  );

  const DotIndicator = () => (
    <span className={`inline-block rounded-full bg-current mr-1.5 ${
      size === 'xs' ? 'h-1.5 w-1.5' : 
      size === 'sm' ? 'h-2 w-2' : 
      'h-2.5 w-2.5'
    }`} />
  );

  const MotionComponent = motion(Component);

  return (
    <MotionComponent
      className={baseClasses}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    >
      {dot && <DotIndicator />}
      {icon && !dot && (
        <span className={`${iconSizes[size]} mr-1.5 flex-shrink-0`}>
          {icon}
        </span>
      )}
      <span>{children}</span>
      {removable && <RemoveButton />}
    </MotionComponent>
  );
};

export default Badge;