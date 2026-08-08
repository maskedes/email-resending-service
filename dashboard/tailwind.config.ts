import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Jungle Opal Morning palette ──
        // #3C9245 #FCB404 #F783A3 #F94315 #E4E3DB
        brand: {
          50:  '#eef7ef',
          100: '#d4eed6',
          200: '#a8dcad',
          300: '#6ec279',
          400: '#4da85c',
          500: '#3C9245',
          600: '#307a38',
          700: '#26602c',
          800: '#1e4d23',
          900: '#163b1b',
          950: '#0c2410',
          DEFAULT: '#3C9245',
          hover: '#307a38',
        },
        accent: {
          DEFAULT: '#FCB404',
          dark: '#c48f03',
          light: '#fdd44d',
        },
        // Deep canvas — dark green-black base
        canvas: {
          DEFAULT: '#060a05',
          raised: '#0d140c',
          border: '#1e2d1f',
        },
        // Semantic status colors from Jungle Opal Morning
        success: {
          DEFAULT: '#3C9245',
          soft: 'rgba(60, 146, 69, 0.14)',
          border: 'rgba(60, 146, 69, 0.35)',
        },
        warning: {
          DEFAULT: '#FCB404',
          soft: 'rgba(252, 180, 4, 0.14)',
          border: 'rgba(252, 180, 4, 0.35)',
        },
        danger: {
          DEFAULT: '#F94315',
          soft: 'rgba(249, 67, 21, 0.14)',
          border: 'rgba(249, 67, 21, 0.35)',
        },
        info: {
          DEFAULT: '#F783A3',
          soft: 'rgba(247, 131, 163, 0.14)',
          border: 'rgba(247, 131, 163, 0.35)',
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(60, 146, 69, 0.18)',
        'glow-lg': '0 10px 44px rgba(60, 146, 69, 0.28)',
        'accent-glow': '0 0 20px rgba(252, 180, 4, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
