import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/cn';

function useCountUp(target, run) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    const num = Number(target) || 0;
    let raf;
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(num * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

function format(val, fmt) {
  if (fmt === 'percent') return `${val.toFixed(0)}%`;
  if (fmt === 'compact') return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  return Math.round(val).toLocaleString();
}

export default function StatCard({ label, value, delta, icon: Icon, tone = 'brand', format: fmt = 'number', prefix, suffix, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const animated = useCountUp(value, inView);
  const toneMap = {
    brand: 'bg-brand-soft text-brand-600',
    success: 'bg-accent-500/12 text-accent-600 dark:text-accent-400',
    violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    warning: 'bg-warning-500/12 text-warning-500',
    danger: 'bg-danger-500/12 text-danger-500',
  };
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
      className={cn('rounded-lg border border-border-subtle bg-bg-elevated p-5 shadow-sm', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-content-secondary">{label}</span>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneMap[tone])}>
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="tnum text-3xl font-extrabold tracking-tight text-content-primary">
          {prefix}{format(animated, fmt)}{suffix}
        </span>
        {delta != null && (
          <span className={cn('mb-1 inline-flex items-center gap-0.5 text-xs font-semibold', delta >= 0 ? 'text-accent-500' : 'text-danger-500')}>
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
