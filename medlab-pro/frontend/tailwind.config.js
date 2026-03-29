/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1B4F8A', light: '#2D6CC0', dark: '#0D3264' },
        secondary: { DEFAULT: '#0D7377', light: '#14A0A5', dark: '#085456' },
        success:   '#1A7A4A',
        warning:   '#E67E22',
        danger:    '#E74C3C',
        info:      '#3498DB',
      },
    },
  },
  plugins: [],
};
