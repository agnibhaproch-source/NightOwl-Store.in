import { useId, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '../lib/cn';
import type { Tone } from '../types';
import { toneSoft } from './tone';

export function Badge({ tone = 'violet', className, children }: { tone?: Tone | 'neutral'; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        tone === 'neutral' ? 'bg-surface2 text-muted' : toneSoft[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('shimmer rounded-xl', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted/40 border-t-violet', className)}
    />
  );
}

export function Switch({
  checked, onChange, label, description, disabled, hideLabel
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
      {!hideLabel && (
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-[15px] font-medium">{label}</span>
          {description && <span className="block text-[13px] text-muted">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="hit relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200"
        style={{ background: checked ? 'rgb(var(--accent))' : 'rgb(var(--line))' }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 35 }}
          className={cn('h-6 w-6 rounded-full shadow-md', checked ? 'ml-auto bg-onaccent' : 'bg-fg')}
        />
      </button>
    </div>
  );
}

type FieldProps = { label?: string; hint?: string; error?: string; className?: string };

export function Input({ label, hint, error, className, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="field-label">{label}</label>}
      <input id={fid} className={cn('field', error && 'border-pink')} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${fid}-h` : undefined} {...rest} />
      {(hint || error) && <p id={`${fid}-h`} className={cn('mt-1 text-[12px]', error ? 'text-pink' : 'text-muted')}>{error ?? hint}</p>}
    </div>
  );
}

export function Textarea({ label, hint, className, id, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="field-label">{label}</label>}
      <textarea id={fid} className="field resize-none py-3" rows={3} {...rest} />
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, className, id, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="field-label">{label}</label>}
      <select id={fid} className="field appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label, size = 'md', className
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-surface2/70 p-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative shrink-0 rounded-xl px-3.5 font-medium transition-colors',
              size === 'sm' ? 'h-9 text-[13px]' : 'h-10 text-sm',
              on ? 'text-bg' : 'text-muted hover:text-fg'
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-fg"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px]', on ? 'bg-bg/15' : 'bg-line/70')}>{o.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  emoji, title, body, action, className
}: { emoji: string; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex max-w-sm flex-col items-center px-6 py-14 text-center', className)}>
      <motion.div
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className="mb-4 grid h-20 w-20 place-items-center rounded-[28px] bg-surface2 text-4xl"
        aria-hidden
      >
        {emoji}
      </motion.div>
      <h3 className="text-xl font-bold">{title}</h3>
      {body && <p className="mt-1.5 text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stars({
  value, onChange, size = 20, label = 'Rating'
}: { value: number; onChange?: (v: number) => void; size?: number; label?: string }) {
  if (!onChange)
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${label}: ${value} of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} style={{ width: size, height: size }} className={n <= Math.round(value) ? 'fill-amber text-amber' : 'text-line'} />
        ))}
      </span>
    );
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          whileTap={{ scale: 0.8 }}
          animate={n <= value ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.25 }}
          onClick={() => onChange(n)}
          className="grid h-11 w-11 place-items-center"
        >
          <Star style={{ width: size, height: size }} className={n <= value ? 'fill-amber text-amber' : 'text-muted/50'} />
        </motion.button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-body text-[11px] text-muted">{children}</kbd>;
}
