import { useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Logo } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useSession } from '../store/session';

const SLIDES = [
  {
    art: ['🍜', '🌙', '🥤'],
    tone: 'var(--violet)',
    title: 'Hungry at 1 AM?',
    body: 'Maggi, chips, cold drinks and chocolate, stocked every night from 9 PM to 2 AM.'
  },
  {
    art: ['📦', '⚡', '🏃'],
    tone: 'var(--cyan)',
    title: 'At your door in minutes',
    body: 'Pick your hostel, block and room. We pack it and walk it over in about 15 minutes.'
  },
  {
    art: ['🔔', '🦉', '📱'],
    tone: 'var(--lime)',
    title: 'Scan, pay, relax',
    body: 'Pay upfront with any UPI app and track every step live until it lands at your door.'
  }
];

export default function Welcome() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const nav = useNavigate();
  const finish = useSession((s) => s.finishOnboarding);
  const userId = useSession((s) => s.userId);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i]!;

  const go = (n: number) => {
    if (n < 0 || n >= SLIDES.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const done = (to: string) => {
    finish();
    nav(to, { replace: true });
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(i + 1);
    if (info.offset.x > 60) go(i - 1);
  };

  return (
    <main id="main" className="safe-top safe-bottom relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6">
      <div className="flex h-16 items-center justify-between">
        <Logo size={30} />
        {!last && (
          <button onClick={() => done(userId ? '/' : '/login')} className="hit rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-fg">
            Skip
          </button>
        )}
      </div>

      <div className="relative flex flex-1 flex-col justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={i}
            custom={dir}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={onDragEnd}
            initial={{ x: dir * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="cursor-grab active:cursor-grabbing"
            aria-live="polite"
          >
            <div className="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center">
              <motion.div
                className="absolute inset-6 rounded-full"
                style={{ background: `radial-gradient(closest-side, rgb(${s.tone} / .45), transparent)` }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-10 rounded-full border border-line/70" />
              <div className="absolute inset-20 rounded-full border border-dashed border-line/70" />
              {s.art.map((e, k) => {
                const pos = [
                  'left-2 top-10 text-6xl',
                  'text-[120px]',
                  'bottom-8 right-2 text-6xl'
                ][k];
                return (
                  <motion.span
                    key={k}
                    aria-hidden
                    className={cn('absolute select-none leading-none drop-shadow-2xl', k === 1 && 'relative', pos)}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0, y: [0, k === 1 ? -8 : 6, 0] }}
                    transition={{
                      scale: { type: 'spring', stiffness: 260, damping: 14, delay: 0.08 * k },
                      rotate: { type: 'spring', stiffness: 260, damping: 14, delay: 0.08 * k },
                      y: { duration: 3 + k, repeat: Infinity, ease: 'easeInOut' }
                    }}
                  >
                    {e}
                  </motion.span>
                );
              })}
            </div>
            <h1 className="mt-8 text-center font-display text-[40px] font-extrabold leading-none tracking-tight">{s.title}</h1>
            <p className="mx-auto mt-3 max-w-xs text-center text-[16px] text-muted">{s.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Onboarding step">
        {SLIDES.map((_, k) => (
          <button key={k} role="tab" aria-selected={k === i} aria-label={`Step ${k + 1}`} onClick={() => go(k)} className="grid h-8 place-items-center px-1">
            <motion.span animate={{ width: k === i ? 28 : 8 }} className={cn('block h-2 rounded-full', k === i ? 'bg-accent' : 'bg-line')} />
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {last ? (
          <>
            <Button variant="primary" size="lg" block onClick={() => done(userId ? '/' : '/login')}>
              {userId ? 'Start ordering' : 'Log in with phone'}
            </Button>
            {!userId && (
              <Button variant="ghost" size="lg" block onClick={() => done('/')}>
                Just browse for now
              </Button>
            )}
          </>
        ) : (
          <Button variant="primary" size="lg" block onClick={() => go(i + 1)}>
            Next
          </Button>
        )}
      </div>
    </main>
  );
}
