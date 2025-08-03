import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // New brand colors
        'anti-flash-white': { 
          DEFAULT: '#f2f3f4', 
          100: '#2d3034', 
          200: '#596169', 
          300: '#89919a', 
          400: '#bdc2c7', 
          500: '#f2f3f4', 
          600: '#f4f5f6', 
          700: '#f7f7f8', 
          800: '#f9fafa', 
          900: '#fcfcfd' 
        },
        'prussian-blue': { 
          DEFAULT: '#1d2d44', 
          100: '#06090e', 
          200: '#0c121b', 
          300: '#111b29', 
          400: '#172436', 
          500: '#1d2d44', 
          600: '#36547e', 
          700: '#517bb5', 
          800: '#8ba7cd', 
          900: '#c5d3e6' 
        },
        'paynes-gray': { 
          DEFAULT: '#3e5c76', 
          100: '#0c1217', 
          200: '#19242f', 
          300: '#253746', 
          400: '#31495e', 
          500: '#3e5c76', 
          600: '#547da0', 
          700: '#7d9eba', 
          800: '#a8bed1', 
          900: '#d4dfe8' 
        },
        'silver-lake-blue': { 
          DEFAULT: '#748cab', 
          100: '#151c24', 
          200: '#2b3747', 
          300: '#40536b', 
          400: '#566e8f', 
          500: '#748cab', 
          600: '#8fa2bc', 
          700: '#abb9cd', 
          800: '#c7d1dd', 
          900: '#e3e8ee' 
        },
        'eggshell': { 
          DEFAULT: '#f0ebd8', 
          100: '#413919', 
          200: '#837133', 
          300: '#bca654', 
          400: '#d6c895', 
          500: '#f0ebd8', 
          600: '#f2eedf', 
          700: '#f6f2e7', 
          800: '#f9f7ef', 
          900: '#fcfbf7' 
        },
        // Map primary to new silver-lake-blue
        primary: {
          DEFAULT: '#748cab', // silver-lake-blue
          foreground: '#111827', // gray-900 dark text
          50: '#e3e8ee',
          100: '#c7d1dd',
          200: '#abb9cd',
          300: '#8fa2bc',
          400: '#748cab',
          500: '#566e8f',
          600: '#40536b',
          700: '#2b3747',
          800: '#151c24',
          900: '#06090e',
        },
        success: {
          DEFAULT: 'rgb(16 185 129)', // Emerald-500
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          DEFAULT: 'rgb(245 158 15)', // Amber-500
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
        'geist': ['Geist Mono', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
      },
      screens: {
        'xs': '475px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-in-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-in-out forwards',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        fadeInUp: {
          from: { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          to: { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      },
      backdropFilter: {
        'none': 'none',
        'blur-sm': 'blur(4px)',
        'blur': 'blur(8px)',
        'blur-md': 'blur(12px)',
        'blur-lg': 'blur(16px)',
        'blur-xl': 'blur(24px)',
        'blur-2xl': 'blur(40px)',
        'blur-3xl': 'blur(64px)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config