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
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        dark: {
          DEFAULT: '#1e293b',
          light:   '#64748b',
          muted:   '#94a3b8',
        },
        accent: {
          green:  '#10b981',
          red:    '#ef4444',
          yellow: '#f59e0b',
          blue:   '#3b82f6',
        },
      },
      boxShadow: {
        'card':       '0 1px 8px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08)',
        'soft':       '0 1px 6px rgba(0,0,0,0.04)',
        'blue':       '0 4px 14px rgba(37,99,235,0.22)',
        'glass':      '0 8px 32px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
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
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        shake:   {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};
