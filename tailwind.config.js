/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        surface2: c('surface-2'),
        line: c('line'),
        fg: c('fg'),
        muted: c('muted'),
        violet: c('violet'),
        cyan: c('cyan'),
        lime: c('lime'),
        pink: c('pink'),
        amber: c('amber'),
        accent: c('accent'),
        onaccent: c('on-accent')
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Onest', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      borderRadius: { sheet: '28px', card: '22px', field: '14px' },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        glow: '0 0 0 1px rgb(var(--accent) / .35), 0 8px 30px -6px rgb(var(--accent) / .45)',
        violet: '0 10px 40px -12px rgb(var(--violet) / .6)'
      },
      screens: { xs: '380px' }
    }
  },
  plugins: []
};
