import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#0a1609',
          card:    '#0f1e0e',
          input:   '#142013',
          elevated:'#192a18',
        },
        border: {
          subtle: '#1c321b',
          muted:  '#2a4a29',
        },
        accent: {
          DEFAULT: '#D6FF62',
          hover:   '#c2ef50',
          dim:     '#a8d140',
        },
        muted: '#5a7a59',
      },
    },
  },
  plugins: [],
}

export default config
