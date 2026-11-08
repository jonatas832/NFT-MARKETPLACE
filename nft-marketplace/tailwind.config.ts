import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#2B2B2B', card: '#3B3B3B', primary: '#A259FF', 'primary-hover': '#8B3FE6',
        muted: '#CCCCCC', line: '#858584', ok: '#4ADE80', danger: '#FF6B6B',
      },
      fontFamily: { sans: ['"Work Sans"', 'system-ui', 'sans-serif'], display: ['"Space Mono"', 'monospace'] },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
} satisfies Config
