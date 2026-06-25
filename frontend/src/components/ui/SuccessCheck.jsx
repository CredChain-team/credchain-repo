import { motion } from 'framer-motion';

export function SuccessCheck({ size = 72 }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.span
        className="absolute rounded-full bg-accent-500/20"
        style={{ width: size * 1.4, height: size * 1.4 }}
        initial={{ scale: 0.6, opacity: 0.8 }}
        animate={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <div className="flex items-center justify-center rounded-full bg-grad-verified shadow-verified" style={{ width: size, height: size }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  );
}

const COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#34D399', '#0EA5E9', '#F59E0B'];

export function ConfettiBurst({ fire, count = 28 }) {
  if (!fire) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 120 + (i % 5) * 26;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 60,
              opacity: 0,
              scale: 0.4,
              rotate: 360,
            }}
            transition={{ duration: 1.1 + (i % 4) * 0.15, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
