/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
      colors: {
        brand: {
          slate: '#0F172A',
          offwhite: '#F4F4F5',
          white: '#FFFFFF',
          amber: '#FEF3C7',
          amberText: '#78350F',
        }
      },
      boxShadow: {
        brutal: '6px 6px 0 0 #0F172A',
      }
    },
  },
  plugins: [],
}
