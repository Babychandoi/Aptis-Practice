/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f5f4fe',
          100: '#eeedfd',
          200: '#dedcfb',
          300: '#c2bef8',
          400: '#9b94f2',
          500: '#756be9',
          600: '#5b52e8', // Primary Electric Violet
          700: '#483ed3',
          800: '#3d35c4',
          900: '#322c9e',
          950: '#1f1b62',
        },
        accent: {
          DEFAULT: '#bdf05a', // Lime Neon
          light: '#d2f689',
          dark: '#9cd136',
          ink: '#15161a',
        },
        dark: {
          DEFAULT: '#15161a',
          card: '#1e1f24',
          muted: '#8a8b8f',
          subtle: '#2a2b30',
        },
        surface: {
          DEFAULT: '#f5f5f2',
          paper: '#faf9f6',
          card: '#ffffff',
          muted: '#e9e9e4',
        },
        border: {
          DEFAULT: '#e8e7e1',
          subtle: '#f0efeb',
          strong: '#dcdbd5',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};

