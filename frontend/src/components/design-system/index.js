// Design System Foundation
// Comprehensive component library with sage green primary, warm earth tone accents, and Inter font

// Color Tokens - Semantic naming for consistent usage
export const colors = {
  // Primary Brand Colors
  primary: {
    50: 'sage-50',
    100: 'sage-100', 
    200: 'sage-200',
    300: 'sage-300',
    400: 'sage-400',
    500: 'sage-500', // Main brand color
    600: 'sage-600',
    700: 'sage-700',
    800: 'sage-800',
    900: 'sage-900',
  },
  
  // Secondary Earth Tones
  secondary: {
    clay: {
      50: 'earth-clay-50',
      500: 'earth-clay-500',
      600: 'earth-clay-600',
    },
    sand: {
      50: 'earth-sand-50',
      500: 'earth-sand-500',
      600: 'earth-sand-600',
    },
    forest: {
      50: 'earth-forest-50',
      500: 'earth-forest-500',
      600: 'earth-forest-600',
    },
  },
  
  // Neutral Palette
  neutral: {
    50: 'neutral-50',
    100: 'neutral-100',
    200: 'neutral-200',
    300: 'neutral-300',
    400: 'neutral-400',
    500: 'neutral-500',
    600: 'neutral-600',
    700: 'neutral-700',
    800: 'neutral-800',
    900: 'neutral-900',
  },
  
  // Status Colors
  success: 'success-500',
  warning: 'warning-500',
  error: 'error-500',
}

// Typography Tokens
export const typography = {
  fontFamily: 'font-sans', // Inter
  fontSize: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
  },
  fontWeight: {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }
}

// Spacing Tokens
export const spacing = {
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4', 
  lg: 'p-6',
  xl: 'p-8',
  '2xl': 'p-12',
}

// Shadow Tokens
export const shadows = {
  sm: 'shadow-sage',
  md: 'shadow-sage-md',
  lg: 'shadow-sage-lg',
  earth: 'shadow-earth',
}

// Border Radius Tokens
export const borderRadius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
}

// Component Variants - Pre-built class combinations
export const variants = {
  // Button Variants
  button: {
    primary: `bg-${colors.primary[500]} hover:bg-${colors.primary[600]} text-white ${typography.fontWeight.medium} ${borderRadius.lg} transition-colors duration-200`,
    secondary: `bg-${colors.secondary.clay[50]} hover:bg-${colors.secondary.clay[500]} text-${colors.primary[700]} border border-${colors.primary[200]} ${typography.fontWeight.medium} ${borderRadius.lg} transition-colors duration-200`,
    outline: `border border-${colors.primary[500]} text-${colors.primary[600]} hover:bg-${colors.primary[50]} ${typography.fontWeight.medium} ${borderRadius.lg} transition-colors duration-200`,
    ghost: `text-${colors.primary[600]} hover:bg-${colors.primary[50]} ${typography.fontWeight.medium} ${borderRadius.lg} transition-colors duration-200`,
    earth: `bg-${colors.secondary.clay[500]} hover:bg-${colors.secondary.clay[600]} text-white ${typography.fontWeight.medium} ${borderRadius.lg} transition-colors duration-200`,
  },
  
  // Card Variants
  card: {
    default: `bg-white ${borderRadius.xl} ${shadows.md} border border-${colors.neutral[200]}`,
    elevated: `bg-white ${borderRadius.xl} ${shadows.lg} border border-${colors.neutral[100]}`,
    sage: `bg-${colors.primary[50]} ${borderRadius.xl} ${shadows.sm} border border-${colors.primary[200]}`,
    earth: `bg-${colors.secondary.sand[50]} ${borderRadius.xl} ${shadows.earth} border border-${colors.secondary.clay[200]}`,
  },
  
  // Input Variants
  input: {
    default: `border border-${colors.neutral[300]} focus:border-${colors.primary[500]} focus:ring-${colors.primary[500]} ${borderRadius.lg} transition-colors duration-200`,
    error: `border border-${colors.error} focus:border-${colors.error} focus:ring-${colors.error} ${borderRadius.lg}`,
    success: `border border-${colors.success} focus:border-${colors.success} focus:ring-${colors.success} ${borderRadius.lg}`,
  },
  
  // Text Variants
  text: {
    heading: `${typography.fontWeight.bold} text-${colors.neutral[900]} ${typography.fontFamily}`,
    subheading: `${typography.fontWeight.semibold} text-${colors.neutral[800]} ${typography.fontFamily}`,
    body: `${typography.fontWeight.normal} text-${colors.neutral[700]} ${typography.fontFamily}`,
    caption: `${typography.fontSize.sm} ${typography.fontWeight.medium} text-${colors.neutral[600]} ${typography.fontFamily}`,
    muted: `${typography.fontSize.sm} text-${colors.neutral[500]} ${typography.fontFamily}`,
  },
  
  // Badge Variants
  badge: {
    primary: `bg-${colors.primary[100]} text-${colors.primary[800]} ${typography.fontSize.xs} ${typography.fontWeight.medium} px-2 py-1 ${borderRadius.full}`,
    secondary: `bg-${colors.secondary.clay[100]} text-${colors.secondary.clay[800]} ${typography.fontSize.xs} ${typography.fontWeight.medium} px-2 py-1 ${borderRadius.full}`,
    success: `bg-${colors.success}-100 text-${colors.success}-800 ${typography.fontSize.xs} ${typography.fontWeight.medium} px-2 py-1 ${borderRadius.full}`,
    warning: `bg-${colors.warning}-100 text-${colors.warning}-800 ${typography.fontSize.xs} ${typography.fontWeight.medium} px-2 py-1 ${borderRadius.full}`,
    error: `bg-${colors.error}-100 text-${colors.error}-800 ${typography.fontSize.xs} ${typography.fontWeight.medium} px-2 py-1 ${borderRadius.full}`,
  }
}