/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030712',
          900: '#0b0f19',
          800: '#1f2937',
          700: '#374151',
        },
        brand: {
          cyan: '#06b6d4',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.4)',
        'glow-brand': '0 0 20px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
