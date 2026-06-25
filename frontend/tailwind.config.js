/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand (indigo) ramp
        brand: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC',
          400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
          800: '#3730A3', 900: '#312E81',
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
        // Legacy aliases kept so existing components don't break mid-rewrite
        credchain: { primary: '#4F46E5', accent: '#8B5CF6', light: '#EEF2FF' },
        'credchain-navy': '#0a1628',
        'credchain-blue': '#4F46E5',
        'credchain-teal': '#06b6d4',
        'credchain-green': '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '28px' },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'card-lift': '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        sm: '0 1px 2px rgba(15,23,42,.06)',
        md: '0 4px 12px rgba(15,23,42,.08)',
        lg: '0 12px 28px rgba(15,23,42,.10)',
        xl: '0 24px 48px rgba(15,23,42,.14)',
        brand: '0 8px 24px rgba(99,102,241,.28)',
        verified: '0 8px 24px rgba(16,185,129,.28)',
        glow: '0 0 0 3px rgb(99 102 241 / 0.12)',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        'grad-verified': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'grad-hero':
          'radial-gradient(1200px 600px at 70% -10%, rgba(124,58,237,.25), transparent), radial-gradient(900px 500px at 10% 10%, rgba(99,102,241,.18), transparent)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseRing: { '0%, 100%': { boxShadow: '0 0 0 0 rgb(99 102 241 / 0.25)' }, '50%': { boxShadow: '0 0 0 6px rgb(99 102 241 / 0)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
