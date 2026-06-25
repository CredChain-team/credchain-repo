import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-4xl' };

export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated shadow-xl',
              WIDTHS[size],
              className
            )}
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-4">
                <div>
                  {title && <h2 className="text-lg font-bold text-content-primary">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-content-secondary">{description}</p>}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="rounded-md p-1.5 text-content-muted hover:bg-bg-sunken hover:text-content-primary transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto scroll-thin px-6 py-5">{children}</div>
            {footer && <div className="border-t border-border-subtle bg-bg-sunken px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
