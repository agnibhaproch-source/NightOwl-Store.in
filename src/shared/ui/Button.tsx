import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'violet';
type Size = 'sm' | 'md' | 'lg';

const V: Record<Variant, string> = {
  primary: 'bg-accent text-onaccent hover:brightness-105 shadow-glow',
  secondary: 'bg-surface2 text-fg hover:bg-line/60 border border-line/70',
  ghost: 'text-fg hover:bg-surface2',
  danger: 'bg-pink text-white hover:brightness-110',
  outline: 'border border-line text-fg hover:bg-surface2',
  violet: 'bg-violet text-white shadow-violet hover:brightness-110'
};

const S: Record<Size, string> = {
  sm: 'hit h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-[18px] gap-2.5'
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, block, className, children, disabled, type = 'button', ...rest },
  ref
) {
  const off = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={off ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={off}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,filter,opacity,box-shadow] duration-150',
        V[variant],
        S[size],
        block && 'w-full',
        off && 'cursor-not-allowed opacity-50 shadow-none',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </motion.button>
  );
});

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  children: ReactNode;
  badge?: number;
  variant?: 'ghost' | 'secondary';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, badge, className, variant = 'ghost', type = 'button', ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={badge ? `${label}, ${badge} new` : label}
      title={label}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-fg transition-colors',
        variant === 'ghost' ? 'hover:bg-surface2' : 'border border-line/70 bg-surface2 hover:bg-line/60',
        className
      )}
      {...rest}
    >
      {children}
      {!!badge && (
        <motion.span
          key={badge}
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-white"
        >
          {badge > 9 ? '9+' : badge}
        </motion.span>
      )}
    </motion.button>
  );
});
