import React from 'react';

/**
 * Modern Typography Components - Design System Foundation
 * Features sage green primary, warm earth tone accents, and Inter font
 */

// Heading Component
const Heading = ({
  children,
  level = 1,
  variant = 'default',
  className = '',
  ...props
}) => {
  const Tag = `h${level}`;
  
  // Level-specific classes
  const levelClasses = {
    1: 'text-4xl lg:text-5xl font-bold leading-tight',
    2: 'text-3xl lg:text-4xl font-bold leading-tight',
    3: 'text-2xl lg:text-3xl font-semibold leading-snug',
    4: 'text-xl lg:text-2xl font-semibold leading-snug',
    5: 'text-lg lg:text-xl font-semibold leading-normal',
    6: 'text-base lg:text-lg font-semibold leading-normal',
  };

  // Variant classes
  const variants = {
    default: 'text-neutral-900',
    sage: 'text-sage-700',
    earth: 'text-earth-clay-700',
    forest: 'text-earth-forest-700',
    muted: 'text-neutral-600',
    light: 'text-neutral-500',
  };

  const classes = `
    font-sans
    ${levelClasses[level]}
    ${variants[variant]}
    ${className}
  `;

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
};

// Text/Paragraph Component
const Text = ({
  children,
  variant = 'body',
  size = 'base',
  weight = 'normal',
  className = '',
  as: Component = 'p',
  ...props
}) => {
  // Variant classes
  const variants = {
    body: 'text-neutral-700 leading-relaxed',
    caption: 'text-neutral-600 leading-normal',
    muted: 'text-neutral-500 leading-normal',
    sage: 'text-sage-600 leading-relaxed',
    earth: 'text-earth-clay-600 leading-relaxed',
    forest: 'text-earth-forest-600 leading-relaxed',
    success: 'text-success-600 leading-relaxed',
    warning: 'text-warning-600 leading-relaxed',
    error: 'text-error-600 leading-relaxed',
  };

  // Size classes
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Weight classes
  const weights = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const classes = `
    font-sans
    ${variants[variant]}
    ${sizes[size]}
    ${weights[weight]}
    ${className}
  `;

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Label Component
const Label = ({
  children,
  variant = 'default',
  size = 'sm',
  required = false,
  className = '',
  ...props
}) => {
  // Variant classes
  const variants = {
    default: 'text-neutral-700',
    sage: 'text-sage-700',
    earth: 'text-earth-clay-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    error: 'text-error-700',
  };

  // Size classes
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
  };

  const classes = `
    font-sans font-medium
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  return (
    <label className={classes} {...props}>
      {children}
      {required && <span className="text-error-500 ml-1">*</span>}
    </label>
  );
};

// Link Component
const Link = ({
  children,
  variant = 'default',
  underline = 'hover',
  className = '',
  ...props
}) => {
  // Variant classes
  const variants = {
    default: 'text-sage-600 hover:text-sage-700',
    earth: 'text-earth-clay-600 hover:text-earth-clay-700',
    forest: 'text-earth-forest-600 hover:text-earth-forest-700',
    muted: 'text-neutral-500 hover:text-neutral-700',
  };

  // Underline classes
  const underlines = {
    none: '',
    always: 'underline',
    hover: 'hover:underline',
  };

  const classes = `
    font-sans font-medium
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-sm
    ${variants[variant]}
    ${underlines[underline]}
    ${className}
  `;

  return (
    <a className={classes} {...props}>
      {children}
    </a>
  );
};

// Code Component
const Code = ({
  children,
  variant = 'default',  
  className = '',
  ...props
}) => {
  // Variant classes
  const variants = {
    default: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    sage: 'bg-sage-100 text-sage-800 border border-sage-200',
    earth: 'bg-earth-sand-100 text-earth-sand-800 border border-earth-sand-200',
  };

  const classes = `
    font-mono text-sm
    px-2 py-1
    rounded-md
    ${variants[variant]}
    ${className}
  `;

  return (
    <code className={classes} {...props}>
      {children}
    </code>
  );
};

// Export all components
export { Heading, Text, Label, Link, Code };
export default { Heading, Text, Label, Link, Code };