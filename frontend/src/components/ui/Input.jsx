import { forwardRef, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

const fieldBase =
  'w-full rounded-md border bg-bg-elevated px-3.5 text-sm text-content-primary placeholder:text-content-muted ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

function Wrapper({ id, label, hint, error, required, children }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-content-primary">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, hint, error, leftIcon, rightIcon, required, className, id, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted [&>svg]:h-4 [&>svg]:w-4">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            fieldBase,
            'h-11',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error ? 'border-danger-500 focus:ring-danger-500/50' : 'border-border-subtle',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted [&>svg]:h-4 [&>svg]:w-4">
            {rightIcon}
          </span>
        )}
      </div>
    </Wrapper>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, className, id, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={cn(fieldBase, 'py-2.5 resize-y', error ? 'border-danger-500' : 'border-border-subtle', className)}
        {...props}
      />
    </Wrapper>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required, className, id, children, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={fieldId}
        className={cn(fieldBase, 'h-11 pr-9 appearance-none cursor-pointer', error ? 'border-danger-500' : 'border-border-subtle', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394A3B8' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
        }}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
});

export function Switch({ checked, onChange, label, className }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-border-strong'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm', checked ? 'left-[22px]' : 'left-0.5')}
        />
      </button>
      {label && <span className="text-sm text-content-primary">{label}</span>}
    </label>
  );
}
