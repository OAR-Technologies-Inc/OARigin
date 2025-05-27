/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Crimson Pro"', 'serif'],
      },
      colors: {
        green: {
          500: '#00FF00',
        },
        amber: {
          500: '#FFB000',
        },
        purple: {
          500: '#9D00FF',
        },
      },
      animation: {
        'slow-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'terminal-blink': 'terminal-blink 1s step-end infinite',
      },
      keyframes: {
        'terminal-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backgroundImage: {
        'grid-green-900': 'linear-gradient(to right, #00FF00 1px, transparent 1px), linear-gradient(to bottom, #00FF00 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};