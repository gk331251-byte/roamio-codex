import React from 'react';
import { motion } from 'framer-motion';

/**
 * Modern Card Component - Design System Foundation
 * Features sage green primary, warm earth tone accents, and Inter font
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  hover = false,
  className = '',
  onClick,
  ...props
}) => {
  // Variant classes
  const variants = {
    default: 'bg-white border border-neutral-200',
    elevated: 'bg-white border border-neutral-100',
    sage: 'bg-sage-50 border border-sage-200',
    earth: 'bg-earth-sand-50 border border-earth-clay-200',
    forest: 'bg-earth-forest-50 border border-earth-forest-200',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20',
  };

  // Padding classes
  const paddings = {
    none: '',
    xs: 'p-3',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  // Shadow classes
  const shadows = {
    none: '',
    sm: 'shadow-sage',
    md: 'shadow-sage-md',
    lg: 'shadow-sage-lg',
    earth: 'shadow-earth',
  };

  // Base classes
  const baseClasses = `
    rounded-xl
    transition-all duration-200 ease-in-out
    ${variants[variant]}
    ${paddings[padding]}
    ${shadows[shadow]}
    ${hover ? 'hover:shadow-sage-lg hover:-translate-y-1 cursor-pointer' : ''}
    ${className}
  `;

  const CardComponent = onClick ? motion.div : 'div';

  return (
    <CardComponent
      className={baseClasses}
      onClick={onClick}
      whileHover={hover && onClick ? { y: -4, boxShadow: "0 20px 25px -5px rgba(115, 133, 99, 0.15)" } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

// Card Header Component
const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

// Card Body Component
const CardBody = ({ children, className = '', ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

// Card Footer Component
const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`mt-6 pt-4 border-t border-neutral-200 ${className}`} {...props}>
    {children}
  </div>
);

// Card Title Component
const CardTitle = ({ children, level = 2, className = '', ...props }) => {
  const Tag = `h${level}`;
  const levelClasses = {
    1: 'text-2xl font-bold',
    2: 'text-xl font-semibold',
    3: 'text-lg font-semibold',
    4: 'text-base font-semibold',
    5: 'text-sm font-semibold',
    6: 'text-xs font-semibold',
  };

  return (
    <Tag className={`text-neutral-900 font-sans ${levelClasses[level]} ${className}`} {...props}>
      {children}
    </Tag>
  );
};

// Card Description Component
const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-neutral-600 font-sans leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

// Export all components
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Description = CardDescription;

export default Card;