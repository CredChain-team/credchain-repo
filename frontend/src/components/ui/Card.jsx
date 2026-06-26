import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

const PAD = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

const Card = forwardRef(function Card(
  { interactive = false, selected = false, padding = 'md', className, children, as, ...props },
  ref
) {
  const Comp = interactive ? motion.div : as || 'div';
  const motionProps = interactive ? { whileHover: { y: -3 }, transition: { duration: 0.2 } } : {};
  return (
    <Comp
      ref={ref}
      {...motionProps}
      className={cn(
        // Solid, elevated "box": white in light mode, dark-grey in dark mode,
        // soft shadow + generous radius (depth, not just a thin outline).
        'rounded-xl bg-bg-elevated shadow-card border border-border-subtle',
        interactive && 'cursor-pointer hover:shadow-card-hover transition-shadow',
        selected && 'ring-2 ring-brand-500 border-brand-300',
        PAD[padding],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default Card;
