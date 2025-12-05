/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        noizy: {
          dark: '#0a0a0a',
          primary: '#ff3366',
          secondary: '#00ff88',
          accent: '#ffaa00',
        }
      }
    },
  },
  plugins: [],
}
