/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      colors: {
        vvz: {
          green: '#2E7D32',
          'green-dark': '#1B5E20',
          'green-light': '#4CAF50',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
