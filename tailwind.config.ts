import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#fbf5ef',
          100: '#f3e4d3',
          200: '#e5c6a3',
          300: '#d5a26e',
          400: '#c6813f',
          500: '#a8632a',
          600: '#8a4d22',
          700: '#6d3b1c',
          800: '#4f2b16',
          900: '#341b0d',
          950: '#1f0f07',
        },
      },
    },
  },
  plugins: [],
};

export default config;
