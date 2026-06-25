import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-none rounded-xl bg-bg-sunken p-1', className)}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
              active ? 'text-brand-700 dark:text-white' : 'text-content-secondary hover:text-content-primary'
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-bg-elevated shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{t.icon}</span>}
              {t.label}
              {t.count != null && (
                <span className="relative z-10 rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-brand-600">{t.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
