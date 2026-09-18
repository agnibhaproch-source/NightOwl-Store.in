import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { PackShot } from '@/shared/ui';
import { useUi, type Flyer } from '../store/ui';
import { useCatalog } from '../hooks';

function target() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'));
  const el = els.find((e) => e.getClientRects().length > 0);
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function Fly({ f }: { f: Flyer }) {
  const land = useUi((s) => s.land);
  const { byId } = useCatalog();
  const p = byId.get(f.productId);
  const t = target();
  const midY = Math.min(f.y, t.y) - 120;
  if (!p) return null;
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[95] h-14 w-14 will-change-transform"
      initial={{ x: f.x - 28, y: f.y - 28, scale: 1, opacity: 1 }}
      animate={{ x: [f.x - 28, (f.x + t.x) / 2 - 28, t.x - 28], y: [f.y - 28, midY, t.y - 28], scale: [1, 0.9, 0.3], opacity: [1, 1, 0.6] }}
      transition={{ duration: 0.7, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
      onAnimationComplete={() => land(f.id)}
    >
      <div className="h-full w-full rounded-2xl bg-surface p-1.5 shadow-glow">
        <PackShot product={p} />
      </div>
    </motion.div>
  );
}

export function FlyLayer() {
  const flyers = useUi((s) => s.flyers);
  return createPortal(
    <AnimatePresence>{flyers.map((f) => <Fly key={f.id} f={f} />)}</AnimatePresence>,
    document.body
  );
}
