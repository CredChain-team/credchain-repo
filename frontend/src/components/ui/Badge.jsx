import { cn } from '../../lib/cn';

const TONES = {
  neutral: { soft: 'bg-bg-sunken text-content-secondary', solid: 'bg-slate-600 text-white', outline: 'border border-border-strong text-content-secondary' },
  brand: { soft: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300', solid: 'bg-brand-600 text-white', outline: 'border border-brand-300 text-brand-600' },
  success: { soft: 'bg-accent-500/12 text-accent-600 dark:text-accent-400', solid: 'bg-accent-500 text-white', outline: 'border border-accent-500/40 text-accent-600' },
  warning: { soft: 'bg-warning-500/12 text-warning-500', solid: 'bg-warning-500 text-white', outline: 'border border-warning-500/40 text-warning-500' },
  danger: { soft: 'bg-danger-500/12 text-danger-500', solid: 'bg-danger-500 text-white', outline: 'border border-danger-500/40 text-danger-500' },
  violet: { soft: 'bg-violet-500/12 text-violet-600 dark:text-violet-400', solid: 'bg-violet-600 text-white', outline: 'border border-violet-500/40 text-violet-600' },
  info: { soft: 'bg-info-500/12 text-info-500', solid: 'bg-info-500 text-white', outline: 'border border-info-500/40 text-info-500' },
};

const SIZES = { sm: 'text-[11px] px-2 py-0.5 gap-1', md: 'text-xs px-2.5 py-1 gap-1.5' };

export default function Badge({ tone = 'neutral', variant = 'soft', size = 'md', icon, dot = false, className, children }) {
  const toneSet = TONES[tone] || TONES.neutral;
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
        toneSet[variant],
        SIZES[size],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {icon && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      {children}
    </span>
  );
}
