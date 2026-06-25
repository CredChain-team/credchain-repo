import { cn } from '../../lib/cn';

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg' };

const GRADIENTS = [
  'from-brand-500 to-violet-500', 'from-accent-500 to-info-500', 'from-violet-500 to-danger-500',
  'from-info-500 to-brand-500', 'from-warning-500 to-danger-500', 'from-accent-400 to-brand-500',
];

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function hashIndex(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % GRADIENTS.length;
}

export default function Avatar({ src, name = '', size = 'md', ring = false, className }) {
  const base = cn(
    'inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 overflow-hidden',
    SIZES[size],
    ring && 'ring-2 ring-bg-elevated shadow-sm',
    className
  );
  if (src) return <img src={src} alt={name} className={cn(base, 'object-cover')} />;
  return <span className={cn(base, 'bg-gradient-to-br', GRADIENTS[hashIndex(name)])}>{initials(name)}</span>;
}
