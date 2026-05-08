/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary – purple scale (reverse-engineered from compiled CSS)
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb', // The requested blue
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
        },
        // Surface – cool-grey / lavender tones
        surface: {
          50:  '#f8f8fc',
          100: '#f0f0f8',
          200: '#e8e8f0',
          300: '#d8d8e4',
        },
        // Dark text tokens
        dark: {
          DEFAULT: '#2d3047',
          light:   '#6b6b80',
          muted:   '#9b9bb4',
        },
        // Accent colours
        accent: {
          green:  '#00b894',
          red:    '#ff6b6b',
          yellow: '#fdcb6e',
          blue:   '#74b9ff',
        },
      },
      boxShadow: {
        'card':       '0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        'soft':       '0 2px 10px rgba(0,0,0,0.04)',
        'blue':       '0 8px 24px rgba(37,99,235,0.20)',
      },
      animation: {
        fadeIn:  'fadeIn 0.3s ease-out forwards',
        slideIn: 'slideIn 0.3s ease-out forwards',
        slideUp: 'slideUp 0.3s ease-out forwards',
        scaleIn: 'scaleIn 0.2s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
        shake:   'shake 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shake: {
          '0%, 100%':                     { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%':      { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%':           { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};
