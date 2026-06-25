import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-accent-500" />,
  error: <XCircle className="h-5 w-5 text-danger-500" />,
  info: <Info className="h-5 w-5 text-info-500" />,
  loading: <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current;
    const toast = { id, type, message, description: opts.description };
    setToasts((t) => [...t.slice(-2), toast]);
    if (type !== 'loading') {
      setTimeout(() => remove(id), opts.duration || (type === 'error' ? 6000 : 4000));
    }
    return id;
  }, [remove]);

  const api = {
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    loading: (m, o) => push('loading', m, o),
    dismiss: remove,
    promise: async (p, { loading = 'Working…', success = 'Done', error = 'Something went wrong' } = {}) => {
      const id = push('loading', loading);
      try {
        const res = await p;
        remove(id);
        push('success', typeof success === 'function' ? success(res) : success);
        return res;
      } catch (e) {
        remove(id);
        push('error', typeof error === 'function' ? error(e) : error);
        throw e;
      }
    },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed top-4 right-4 z-[200] flex w-[min(92vw,360px)] flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3.5 shadow-lg"
              >
                <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content-primary">{t.message}</p>
                  {t.description && <p className="mt-0.5 text-xs text-content-secondary">{t.description}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="shrink-0 text-content-muted hover:text-content-primary">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
