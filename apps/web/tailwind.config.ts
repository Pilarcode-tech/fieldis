import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#f9fafb',
        },
        border: '#e3e6ed',
        accent: {
          DEFAULT: '#2563eb',
          green: '#16a34a',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          muted: '#9ca3af',
        },
        danger: '#dc2626',
        warning: '#d97706',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        'dm-mono': ['DM Mono', 'monospace'],
      },
      backgroundColor: {
        base: '#f4f5f7',
      },
    },
  },
  plugins: [],
}

export default config
