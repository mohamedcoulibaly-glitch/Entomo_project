/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./www/**/*.{html,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-primary': '#005689',
        'brand-success': '#16A34A',
        'brand-warning': '#F59E0B',
        'brand-danger': '#DC2626',
      },
    },
  },
  plugins: [],
};
