/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: '#0B0F19',
          card: '#111827',
          cardLight: '#FFFFFF',
          accent: '#3B82F6',
          emerald: '#10B981',
          gold: '#F59E0B',
          purple: '#8B5CF6',
        }
      }
    },
  },
  plugins: [],
}
