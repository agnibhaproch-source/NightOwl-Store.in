import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToasts } from '../store/toast';
import { cn } from '../lib/cn';

export function Toaster({ offsetBottom = false, top = false }: { offsetBottom?: boolean; top?: boolean }) {
  const { list, dismiss } = useToasts();
  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end',
        top ? 'safe-top top-3 sm:top-auto' : offsetBottom ? 'bottom-[150px]' : 'bottom-6'
      )}
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line/70 p-3.5 shadow-soft"
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            <span className="mt-0.5 shrink-0 text-lg leading-none" aria-hidden>
              {t.emoji ??
                (t.tone === 'success' ? <CheckCircle2 className="h-5 w-5 text-lime" /> :
                 t.tone === 'error' ? <XCircle className="h-5 w-5 text-pink" /> :
                 <Info className="h-5 w-5 text-cyan" />)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
            </div>
            {t.action && (
              <button
                className="hit shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-lime hover:bg-surface2"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="hit -mr-1 shrink-0 rounded-lg p-1 text-muted hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
