/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand (blue) ramp
        brand: {
          50: '#EFF5FF', 100: '#DBE8FE', 200: '#BFD7FE', 300: '#93BBFD',
          400: '#609AFA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
          800: '#1E40AF', 900: '#1E3A8A',
        },
        accent: { 400: '#34D399', 500: '#10B981', 600: '#059669' },
        violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
        warning: { 400: '#FBBF24', 500: '#F59E0B' },
        danger: { 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48' },
        info: { 400: '#38BDF8', 500: '#0EA5E9' },
        // Semantic, theme-aware tokens (driven by CSS vars in index.css)
        bg: {
          base: 'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          sunken: 'var(--bg-sunken)',
          'brand-soft': 'var(--bg-brand-soft)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Legacy aliases kept so older components don't break
        credchain: { primary: '#2563EB', accent: '#3B82F6', light: '#EFF5FF' },
        'credchain-navy': '#08090D',
        'credchain-blue': '#2563EB',
        'credchain-teal': '#0EA5E9',
        'credchain-green': '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '10px', md: '14px', lg: '18px', xl: '22px', '2xl': '28px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow-color) / 0.05), 0 8px 24px rgb(var(--shadow-color) / 0.07)',
        'card-hover': '0 2px 4px rgb(var(--shadow-color) / 0.06), 0 14px 32px rgb(var(--shadow-color) / 0.12)',
        'card-lift': '0 18px 40px rgb(var(--shadow-color) / 0.16)',
        sm: '0 1px 2px rgb(var(--shadow-color) / 0.06)',
        md: '0 4px 14px rgb(var(--shadow-color) / 0.08)',
        lg: '0 12px 30px rgb(var(--shadow-color) / 0.12)',
        xl: '0 24px 50px rgb(var(--shadow-color) / 0.16)',
        brand: '0 10px 28px rgba(37, 99, 235, 0.32)',
        verified: '0 10px 28px rgba(16, 185, 129, 0.30)',
        glow: '0 0 0 4px rgb(37 99 235 / 0.14)',
        'glow-blue': '0 0 0 3px rgb(37 99 235 / 0.15), 0 0 20px rgb(37 99 235 / 0.08)',
        'glow-green': '0 0 0 3px rgb(16 185 129 / 0.15)',
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
        overlay: '0 20px 60px -15px rgb(0 0 0 / 0.35)',
      },
      fontSize: { '2xs': ['0.625rem', { lineHeight: '0.95rem' }] },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        'grad-brand-deep': 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)',
        'grad-verified': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'grad-hero':
          'radial-gradient(1200px 600px at 75% -10%, rgba(37,99,235,.22), transparent), radial-gradient(900px 500px at 5% 5%, rgba(59,130,246,.16), transparent)',
        'dot-grid': 'radial-gradient(circle, rgba(37,99,235,0.10) 1px, transparent 1px)',
      },
      backgroundSize: { 'dot-grid': '20px 20px' },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseRing: { '0%, 100%': { boxShadow: '0 0 0 0 rgb(37 99 235 / 0.28)' }, '50%': { boxShadow: '0 0 0 7px rgb(37 99 235 / 0)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        countUp: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'count-up': 'countUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
