import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Modern Input Component - Design System Foundation  
 * Features sage green primary, warm earth tone accents, and Inter font
 */
const Input = forwardRef(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  fullWidth = true,
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  // Variant classes
  const variants = {
    default: `
      border-neutral-300 
      focus:border-sage-500 
      focus:ring-sage-500/20
      ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''}
    `,
    sage: `
      border-sage-200 
      bg-sage-50 
      focus:border-sage-500 
      focus:ring-sage-500/20
      focus:bg-white
    `,
    earth: `
      border-earth-sand-300 
      bg-earth-sand-50 
      focus:border-earth-clay-500 
      focus:ring-earth-clay-500/20
      focus:bg-white
    `,
  };

  // Size classes
  const sizes = {
    sm: leftIcon || rightIcon ? 'py-2 pl-10 pr-4 text-sm' : 'py-2 px-3 text-sm',
    md: leftIcon || rightIcon ? 'py-2.5 pl-12 pr-4 text-base' : 'py-2.5 px-4 text-base',
    lg: leftIcon || rightIcon ? 'py-3 pl-14 pr-4 text-lg' : 'py-3 px-5 text-lg',
  };

  // Icon size classes
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6',
  };

  // Icon position classes
  const iconPositions = {
    sm: 'left-3',
    md: 'left-4',
    lg: 'left-5',
  };

  // Base input classes
  const inputClasses = `
    font-sans
    w-full
    rounded-lg
    border
    transition-all duration-200
    focus:outline-none focus:ring-2
    disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60
    placeholder:text-neutral-400
    ${variants[variant]}
    ${leftIcon || rightIcon ? sizes[size] : sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 font-sans mb-2">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className={`absolute ${iconPositions[size]} top-1/2 transform -translate-y-1/2 text-neutral-400`}>
            <div className={iconSizes[size]}>{leftIcon}</div>
          </div>
        )}
        
        <motion.input
          ref={ref}
          type={type}
          disabled={disabled}
          required={required}
          className={inputClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          animate={{
            boxShadow: focused 
              ? error 
                ? '0 0 0 3px rgba(255, 90, 31, 0.1)' 
                : '0 0 0 3px rgba(115, 133, 99, 0.1)'
              : '0 0 0 0px transparent'
          }}
          transition={{ duration: 0.2 }}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-400">
            <div className={iconSizes[size]}>{rightIcon}</div>
          </div>
        )}
      </div>

      {(error || hint) && (
        <motion.div 
          className="mt-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error && (
            <p className="text-sm text-error-500 font-sans font-medium flex items-center">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {hint && !error && (
            <p className="text-sm text-neutral-500 font-sans">{hint}</p>
          )}
        </motion.div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;