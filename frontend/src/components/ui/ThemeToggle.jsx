import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { cn } from '../../lib/cn';

export default function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-content-secondary transition-colors hover:text-content-primary',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {dark ? <Moon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> : <Sun className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
