/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf7f3',
          100: '#dcefe8',
          200: '#b9dfd2',
          300: '#88c7b4',
          400: '#55a58f',
          500: '#33836e',
          600: '#216b59',
          700: '#185648',
          800: '#0d493d',
          900: '#063f35',
        },
      },
    },
  },
  plugins: [],
};
