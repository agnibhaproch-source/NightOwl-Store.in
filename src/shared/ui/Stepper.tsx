import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/cn';

interface Props {
  qty: number;
  onAdd: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onInc: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDec: () => void;
  name: string;
  disabled?: boolean;
  atMax?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const spring = { type: 'spring', stiffness: 520, damping: 34 } as const;

/** ADD button that morphs into a − qty + stepper. */
export function AddStepper({ qty, onAdd, onInc, onDec, name, disabled, atMax, size = 'md', className }: Props) {
  const h = size === 'sm' ? 'h-9' : 'h-10';
  return (
    <motion.div
      layout
      transition={spring}
      className={cn(
        'relative flex items-center overflow-hidden rounded-xl',
        h,
        qty > 0 ? 'bg-accent text-onaccent shadow-glow' : 'border-2 border-accent/70 bg-accent/10 text-lime',
        disabled && 'opacity-50',
        className
      )}
      style={{ borderRadius: 12 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add"
            type="button"
            disabled={disabled}
            onClick={onAdd}
            aria-label={`Add ${name} to cart`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
            className={cn('h-full px-4 text-sm font-extrabold tracking-wide', size === 'sm' && 'px-3')}
          >
            ADD
          </motion.button>
        ) : (
          <motion.div
            key="step"
            className="flex h-full items-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
          >
            <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={onDec} aria-label={`Remove one ${name}`} className="grid h-full w-9 place-items-center">
              <Minus className="h-4 w-4" strokeWidth={3} />
            </motion.button>
            <span className="relative w-6 overflow-hidden text-center text-[15px] font-extrabold tabular-nums" aria-live="polite" aria-label={`${qty} in cart`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={qty} className="block" initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.16 }}>
                  {qty}
                </motion.span>
              </AnimatePresence>
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              onClick={onInc}
              disabled={atMax}
              aria-label={`Add one more ${name}`}
              className="grid h-full w-9 place-items-center disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
