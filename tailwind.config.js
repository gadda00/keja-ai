/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF7EC',
          100: '#F5EBD0',
          200: '#EAD8A0',
          300: '#DFC470',
          400: '#D4B04A',
          500: '#C6A34F',
          600: '#A88727',
          700: '#8A6B26',
          800: '#6B521D',
          900: '#4D3B15',
        },
        ink: {
          DEFAULT: '#191612',
          soft: '#2A2620',
          muted: '#6B6459',
          faint: '#8F887C',
        },
        cream: {
          DEFAULT: '#FBF9F4',
          deep: '#F5F1E6',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #5C471A 0%, #8A6B26 40%, #7A6122 60%, #5C471A 100%)',
        'gold-shimmer': 'linear-gradient(120deg, #6B521D, #8A6B26, #B08F35, #8A6B26, #6B521D)',
      },
      boxShadow: {
        'gold-sm': '0 2px 12px rgba(138, 107, 38, 0.22)',
        'gold-md': '0 6px 24px rgba(138, 107, 38, 0.26)',
        'gold-lg': '0 12px 40px rgba(138, 107, 38, 0.32)',
        card: '0 1px 3px rgba(25, 22, 18, 0.06), 0 8px 24px rgba(25, 22, 18, 0.07)',
        'card-hover': '0 4px 8px rgba(25, 22, 18, 0.08), 0 20px 44px rgba(25, 22, 18, 0.13)',
      },
      letterSpacing: {
        wide2: '0.18em',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
        fadeUp: 'fadeUp 0.6s ease-out both',
        float: 'float 5s ease-in-out infinite',
        typing: 'typing 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
