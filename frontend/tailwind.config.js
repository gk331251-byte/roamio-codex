/* eslint-env node */
/* global module */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // Font Configuration
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      // Color Palette - Sage Green Primary & Warm Earth Tones
      colors: {
        // Primary Sage Green Palette
        sage: {
          50: '#f6f7f4',
          100: '#e9eee4',
          200: '#d4deca',
          300: '#b4c5a7',
          400: '#92a982',
          500: '#738563', // Primary sage green
          600: '#5a6b4d',
          700: '#48543f',
          800: '#3b4434',
          900: '#32392c',
          950: '#1a1e16',
        },
        
        // Secondary Earth Tone Palette
        earth: {
          // Warm Clay/Terracotta
          clay: {
            50: '#fdf7f0',
            100: '#f9eadb',
            200: '#f2d3b6',
            300: '#e8b485',
            400: '#dc8f52',
            500: '#d4722f', // Primary clay
            600: '#c55d25',
            700: '#a34722',
            800: '#833a22',
            900: '#6a311e',
          },
          
          // Warm Sand/Beige
          sand: {
            50: '#faf9f7',
            100: '#f3f1ed',
            200: '#e7e3da',
            300: '#d5cfc1',
            400: '#c0b5a1',
            500: '#a89881', // Primary sand
            600: '#947d66',
            700: '#7a6653',
            800: '#655547',
            900: '#53473c',
          },
          
          // Deep Forest Green
          forest: {
            50: '#f3f6f3',
            100: '#e3eae2',
            200: '#c8d6c6',
            300: '#a3b99f',
            400: '#789574',
            500: '#567653', // Primary forest
            600: '#425d40',
            700: '#364a34',
            800: '#2d3c2b',
            900: '#263225',
          },
        },
        
        // Neutral Palette
        neutral: {
          50: '#fafaf9',
          100: '#f4f4f3',
          200: '#e5e5e4',
          300: '#d1d1cf',
          400: '#b3b3af',
          500: '#91918c',
          600: '#737370',
          700: '#5f5f5c',
          800: '#4f4f4d',
          900: '#434341',
          950: '#262624',
        },
        
        // Status Colors (earth-tone inspired)
        success: {
          50: '#f0f9f3',
          100: '#ddf3e4',
          200: '#bce6cc',
          300: '#8dd4a8',
          400: '#5abb7c',
          500: '#369957', // Earth-friendly green
          600: '#2b7c47',
          700: '#24633b',
          800: '#205032',
          900: '#1c422a',
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Warm amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        
        error: {
          50: '#fef7f0',
          100: '#feecdc',
          200: '#fcd9bd',
          300: '#fdba8c',
          400: '#ff8a4c',
          500: '#ff5a1f', // Warm coral-red
          600: '#e53e3e',
          700: '#c53030',
          800: '#9c2a2a',
          900: '#822727',
        },
      },
      
      // Typography Scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // Spacing Scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Border Radius
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      // Box Shadow (earth-tone inspired)
      boxShadow: {
        'sage': '0 4px 6px -1px rgba(115, 133, 99, 0.1), 0 2px 4px -1px rgba(115, 133, 99, 0.06)',
        'sage-md': '0 10px 15px -3px rgba(115, 133, 99, 0.1), 0 4px 6px -2px rgba(115, 133, 99, 0.05)',
        'sage-lg': '0 20px 25px -5px rgba(115, 133, 99, 0.1), 0 10px 10px -5px rgba(115, 133, 99, 0.04)',
        'earth': '0 4px 6px -1px rgba(212, 114, 47, 0.1), 0 2px 4px -1px rgba(212, 114, 47, 0.06)',
        'inner-sage': 'inset 0 2px 4px 0 rgba(115, 133, 99, 0.06)',
      },
      
      // Animation & Transitions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
