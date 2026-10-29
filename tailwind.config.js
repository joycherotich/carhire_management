/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0D2149', midnight: '#08162F', royal: '#1B4D89', gold: '#C8A45D',
        surface: '#F6F8FC', good: '#168568', bad: '#DC4C55',
      },
      fontFamily: { heading: ['Poppins', 'sans-serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 1px 2px rgba(13,33,73,.04), 0 8px 24px -12px rgba(13,33,73,.12)' },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { fadeUp: 'fadeUp .35s ease both', pop: 'pop .2s ease both' },
    },
  },
  plugins: [],
};
