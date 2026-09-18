import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { mulberry32 } from '@/shared/lib/format';

const COLORS = ['rgb(var(--lime))', 'rgb(var(--violet))', 'rgb(var(--cyan))', 'rgb(var(--pink))', 'rgb(var(--amber))'];

/** One-shot burst of confetti from the centre of its parent. Transforms only. */
export function Confetti({ count = 26, seed = 1, spread = 160 }: { count?: number; seed?: number; spread?: number }) {
  const bits = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.4;
      const d = spread * (0.5 + r() * 0.6);
      return {
        x: Math.cos(a) * d,
        y: Math.sin(a) * d - 30,
        rot: r() * 540 - 270,
        c: COLORS[i % COLORS.length]!,
        w: 5 + r() * 5,
        round: r() > 0.6
      };
    });
  }, [count, seed, spread]);
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: b.w, height: b.round ? b.w : b.w * 1.8, background: b.c, borderRadius: b.round ? 99 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 60], opacity: [1, 1, 0], rotate: b.rot, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1], times: [0, 0.6, 1] }}
        />
      ))}
    </div>
  );
}
