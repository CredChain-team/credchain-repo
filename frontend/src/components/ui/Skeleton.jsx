import { cn } from '../../lib/cn';

export default function Skeleton({ variant = 'rect', w, h, lines = 3, className, style }) {
  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-3.5 rounded"
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }
  const shape = variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-lg' : 'rounded-md';
  return (
    <div
      className={cn('skeleton', shape, className)}
      style={{ width: w, height: h || (variant === 'card' ? 140 : 16), ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" w={40} h={40} />
        <div className="flex-1">
          <Skeleton variant="text" lines={2} />
        </div>
      </div>
      <Skeleton className="mt-4" h={80} />
    </div>
  );
}
