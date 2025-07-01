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
        // 深色主题配色 - 黑色底色，白色点缀
        background: {
          DEFAULT: '#000000', // 纯黑背景
          secondary: '#18181b', // 侧边栏背景色
          tertiary: '#1a1a1a'
        },
        foreground: {
          DEFAULT: '#ffffff', // 纯白文字
          secondary: '#d1d5db',
          muted: '#9ca3af'
        },
        primary: {
          DEFAULT: '#ffffff', // 白色主色
          hover: '#f3f4f6',
          foreground: '#000000'
        },
        border: 'transparent', // 完全透明，去掉所有边框
        input: '#1f2937',
        card: '#18181b', // 使用相同的背景色
        destructive: {
          DEFAULT: '#ef4444',
          hover: '#dc2626'
        },
        success: {
          DEFAULT: '#10b981',
          hover: '#059669'
        }
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      },
      boxShadow: {
        '2xl': '0 25px 50px -12px rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}