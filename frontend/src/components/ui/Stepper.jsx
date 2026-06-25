import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Stepper({ steps, current, className }) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = step.icon;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-brand-600 bg-brand-600 text-white',
                  active && 'border-brand-600 bg-bg-elevated text-brand-600 animate-pulse-ring',
                  !done && !active && 'border-border-strong bg-bg-elevated text-content-muted'
                )}
              >
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                    <Check className="h-5 w-5" />
                  </motion.span>
                ) : Icon ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">{i + 1}</span>
                )}
              </div>
              <span className={cn('hidden text-xs font-semibold sm:block', active || done ? 'text-content-primary' : 'text-content-muted')}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border-subtle">
                <motion.div
                  className="h-full bg-brand-600"
                  initial={false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
