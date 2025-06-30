/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dokploy深色主题配色
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a'
        },
        foreground: {
          DEFAULT: '#ffffff',
          secondary: '#a1a1aa',
          muted: '#71717a'
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          foreground: '#ffffff'
        },
        border: '#27272a',
        input: '#18181b',
        card: '#111111',
        destructive: {
          DEFAULT: '#ef4444',
          hover: '#dc2626'
        },
        success: {
          DEFAULT: '#22c55e',
          hover: '#16a34a'
        }
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      }
    },
  },
  plugins: [],
}