/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm gold / champagne — concert hall elegance
        primary: {
          50: '#faf8f1',
          100: '#f3efe0',
          200: '#e6ddc0',
          300: '#d4c595',
          400: '#c4ab6e',
          500: '#b89a54',
          600: '#a37f44',
          700: '#876339',
          800: '#705134',
          900: '#60442f',
        },
        // Deep burgundy / wine red — richness & warmth
        accent: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0da',
          300: '#f4a9bc',
          400: '#ec7a98',
          500: '#df4f79',
          600: '#c92e62',
          700: '#a82150',
          800: '#8d1e47',
          900: '#791c41',
        },
        // Midnight navy & deep stage charcoal for backgrounds
        navy: {
          800: '#1a1f36',
          900: '#0f1225',
          950: '#080a15',
        },
        editorial: {
          charcoal: '#121211',
          stage: '#1A1917',
          ivory: '#FAF7F2',
          brass: '#C5A059',
          slate: '#4A6070',
          crimson: '#8E2A2A',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"EB Garamond"', '"Shippori Mincho"', '"Noto Serif JP"', 'Georgia', 'serif'],
        sans: ['Inter', '"Noto Sans JP"', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"EB Garamond"', '"Shippori Mincho"', '"Noto Serif JP"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0f1225 0%, #151828 55%, #1a1917 100%)',
      },
    },
  },
  plugins: [],
};
