import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Font toàn cục — Noto Sans (fallback Open Sans / system).
        sans: ['"Noto Sans"', '"Open Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Cỡ chữ nền (spec Thu chi tiền): base = 13px.
        base: ['13px', { lineHeight: '1.5' }],
      },
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
