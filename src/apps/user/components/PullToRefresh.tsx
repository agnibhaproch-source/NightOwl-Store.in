import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { services } from '@/shared/services';
import { toast } from '@/shared/store/toast';

const THRESHOLD = 72;

/** Touch pull-to-refresh. Only engages when the page is scrolled to the very top. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 270]);
  const opacity = useTransform(y, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || busy || document.documentElement.style.overflow === 'hidden') return;
      start.current = e.touches[0]!.clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const d = e.touches[0]!.clientY - start.current;
      if (d <= 0 || window.scrollY > 0) {
        y.set(0);
        return;
      }
      y.set(Math.min(THRESHOLD * 1.5, d * 0.5));
    };
    const onEnd = async () => {
      if (start.current == null) return;
      start.current = null;
      if (y.get() >= THRESHOLD) {
        setBusy(true);
        animate(y, THRESHOLD * 0.8, { duration: 0.15 });
        navigator.vibrate?.(10);
        await services.system.refresh();
        setBusy(false);
        toast({ title: 'Fresh as a new packet', emoji: '✨', duration: 1800 });
      }
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 34 });
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [busy, y]);

  return (
    <>
      <motion.div style={{ y, opacity }} className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center md:hidden" aria-hidden>
        <div className="-mt-12 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface shadow-soft">
          <motion.span style={{ rotate }} className={busy ? 'animate-spin' : ''}>
            <RefreshCw className="h-5 w-5 text-violet" />
          </motion.span>
        </div>
      </motion.div>
      {children}
    </>
  );
}
