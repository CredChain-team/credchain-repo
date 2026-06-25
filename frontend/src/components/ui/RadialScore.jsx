import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '../../lib/cn';

export function scoreBand(score, max = 1000) {
  const pct = (score / max) * 1000;
  if (pct >= 900) return { label: 'Exceptional', color: '#10B981' };
  if (pct >= 750) return { label: 'Excellent', color: '#7C3AED' };
  if (pct >= 600) return { label: 'Strong', color: '#4F46E5' };
  if (pct >= 400) return { label: 'Emerging', color: '#0EA5E9' };
  return { label: 'Building', color: '#94A3B8' };
}

export default function RadialScore({ score = 0, max = 1000, size = 200, stroke = 14, label, sublabel, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [shown, setShown] = useState(0);
  const band = scoreBand(score, max);
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, score / max);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1100);
      setShown(score * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, score]);

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={inView ? { strokeDashoffset: circ * (1 - pct) } : {}}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-4xl font-extrabold tracking-tight text-content-primary">{Math.round(shown)}</span>
        <span className="text-xs font-medium text-content-muted">{label || `/ ${max}`}</span>
        <span className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: band.color, background: `${band.color}1f` }}>
          {sublabel || band.label}
        </span>
      </div>
    </div>
  );
}
