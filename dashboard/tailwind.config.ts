import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // True dark neutral theme with white micro-highlights
        brand: {
          50:  '#f8fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#f8fafc',
          600: '#e2e8f0',
          700: '#cbd5e1',
          800: '#94a3b8',
          900: '#64748b',
          950: '#334155',
          DEFAULT: '#f8fafc',
          hover: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#cbd5e1',
          dark: '#94a3b8',
          light: '#f8fafc',
        },
        canvas: {
          DEFAULT: '#000000',
          raised: '#0b0d10',
          border: '#1f2937',
        },
        success: {
          DEFAULT: '#f8fafc',
          soft: 'rgba(248, 250, 252, 0.12)',
          border: 'rgba(248, 250, 252, 0.25)',
        },
        warning: {
          DEFAULT: '#cbd5e1',
          soft: 'rgba(203, 213, 225, 0.12)',
          border: 'rgba(203, 213, 225, 0.25)',
        },
        danger: {
          DEFAULT: '#f87171',
          soft: 'rgba(248, 113, 113, 0.12)',
          border: 'rgba(248, 113, 113, 0.25)',
        },
        info: {
          DEFAULT: '#e2e8f0',
          soft: 'rgba(226, 232, 240, 0.12)',
          border: 'rgba(226, 232, 240, 0.25)',
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(148, 163, 184, 0.18)',
        'glow-lg': '0 10px 44px rgba(148, 163, 184, 0.24)',
        'accent-glow': '0 0 20px rgba(203, 213, 225, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
