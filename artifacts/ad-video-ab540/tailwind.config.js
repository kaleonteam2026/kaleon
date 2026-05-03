/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#0F172A",
        offwhite: "#F4F4F5",
        amber: "#FEF3C7",
        amberText: "#78350F",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        brutalist: "6px 6px 0 0 #0F172A",
      }
    },
  },
  plugins: [],
}