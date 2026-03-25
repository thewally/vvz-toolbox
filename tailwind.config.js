/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        vvz: {
          green: '#2E7D32',
          'green-dark': '#1B5E20',
          'green-light': '#4CAF50',
        },
      },
    },
  },
  plugins: [],
}
