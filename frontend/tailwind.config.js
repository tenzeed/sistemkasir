/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // NOTE: this token is named "warung" for historical reasons, but it
        // now holds the app's INDIGO primary color (previously green).
        // Renaming it would mean touching every component file, so the
        // values were swapped in place instead — think of "warung" here as
        // "primary brand color", not literally "green".
        warung: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        marigold: {
          50: '#fef8ec',
          100: '#fcecc7',
          200: '#f9d78c',
          300: '#f6be51',
          400: '#f2a93b',
          500: '#e88f1f',
          600: '#c96e15',
          700: '#a34f14',
          800: '#853e17',
          900: '#6f3417',
        },
        chili: {
          50: '#fdf2f1',
          100: '#fbe1de',
          200: '#f8c7c1',
          300: '#f0a196',
          400: '#e4715f',
          500: '#d24f3a',
          600: '#c1432e',
          700: '#9f3324',
          800: '#832c22',
          900: '#6e2921',
        },
        // Neutral scale — a true cool slate gray (previously had a faint
        // green cast to match the old green primary). This is used for
        // almost all body text and borders app-wide, so keeping it
        // perfectly neutral matters as much as the primary color swap.
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(30,27,75,0.05), 0 8px 24px -12px rgba(30,27,75,0.14)',
        pop: '0 12px 32px -8px rgba(30,27,75,0.30)',
        glow: '0 0 0 4px rgba(79,70,229,0.16)',
      },
      backgroundImage: {
        'warung-hero': 'radial-gradient(120% 120% at 100% 0%, #4338ca 0%, #312e81 55%, #1e1b4b 100%)',
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
