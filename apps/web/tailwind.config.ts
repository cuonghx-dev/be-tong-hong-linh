import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e11d2e', // đỏ thương hiệu (giống MISA)
          foreground: '#ffffff',
        },
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
} satisfies Config
