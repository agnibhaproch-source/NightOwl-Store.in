import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Heart } from 'lucide-react';
import type { Product } from '@/shared/types';
import { AddStepper, PackShot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { discountPct, inr } from '@/shared/lib/format';
import { services } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';
import { useUi } from '../store/ui';
import { useAddToCart } from '../hooks';
import { useStockAlerts } from '@/shared/hooks/live';
import { useNavigate } from 'react-router-dom';

export function StockBadge({ p }: { p: Product }) {
  if (p.stock <= 0) return <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">Out of stock</span>;
  if (p.stock <= p.lowStockAt) return <span className="rounded-md bg-pink/15 px-1.5 py-0.5 text-[11px] font-semibold text-pink">Only {p.stock} left</span>;
  return null;
}

export function useNotifyMe(p: Product) {
  const userId = useSession((s) => s.userId);
  const [alerts] = useStockAlerts();
  const nav = useNavigate();
  const on = !!userId && alerts.some((a) => a.productId === p.id && a.userId === userId);
  const toggle = async () => {
    if (!userId) {
      toast({ title: 'Log in to get back-in-stock alerts', emoji: '🔔', action: { label: 'Log in', onClick: () => nav('/login') } });
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    const now = await services.inventory.toggleStockAlert(p.id, userId);
    toast({ title: now ? "We'll ping you when it's back" : 'Alert removed', emoji: now ? '🔔' : '🔕' });
  };
  return { on, toggle };
}

function NotifyButton({ p }: { p: Product }) {
  const { on, toggle } = useNotifyMe(p);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        'hit inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[13px] font-bold',
        on ? 'bg-violet/20 text-violet' : 'border border-line text-fg'
      )}
    >
      {on ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {on ? 'You’ll be told' : 'Notify me'}
    </motion.button>
  );
}

export const ProductCard = memo(function ProductCard({ p, variant = 'grid' }: { p: Product; variant?: 'grid' | 'rail' }) {
  const qty = useCart((s) => s.lines[p.id] ?? 0);
  const dec = useCart((s) => s.dec);
  const fav = useSession((s) => s.favorites.includes(p.id));
  const toggleFav = useSession((s) => s.toggleFavorite);
  const open = useUi((s) => s.openProduct);
  const addToCart = useAddToCart();
  const off = discountPct(p.mrp, p.price);
  const out = p.stock <= 0;

  return (
    <article
      data-fly-src
      className={cn(
        'group relative flex flex-col rounded-card border border-line/60 bg-surface p-2.5 transition-colors hover:border-line',
        variant === 'rail' && 'w-[152px] shrink-0 xs:w-[160px]'
      )}
    >
      <button
        type="button"
        onClick={() => open(p.id)}
        className="relative block aspect-square w-full overflow-hidden rounded-[16px] text-left"
        style={{ background: `linear-gradient(160deg, ${p.color}26, ${p.color}0a)` }}
        aria-label={`View ${p.name}`}
      >
        <div data-fly-img className={cn('h-full w-full p-2 transition-transform duration-300 group-hover:scale-[1.04]', out && 'opacity-40 grayscale')}>
          <PackShot product={p} />
        </div>
        {off > 0 && (
          <span className="absolute left-0 top-0 rounded-br-xl rounded-tl-[16px] bg-violet px-2 py-1 text-[11px] font-bold leading-none text-white">
            {off}% off
          </span>
        )}
        <span className={cn('absolute bottom-2 left-2 h-3.5 w-3.5 rounded-[3px] border-2 bg-surface p-[2px]', p.veg ? 'border-lime' : 'border-pink')} aria-label={p.veg ? 'Veg' : 'Non-veg'}>
          <span className={cn('block h-full w-full rounded-full', p.veg ? 'bg-lime' : 'bg-pink')} />
        </span>
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={() => {
          const on = toggleFav(p.id);
          toast({ title: on ? 'Saved to favourites' : 'Removed from favourites', emoji: on ? '💜' : '🤍' });
        }}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${p.name} from favourites` : `Save ${p.name} to favourites`}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bg/60 backdrop-blur"
      >
        <motion.span key={String(fav)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}>
          <Heart className={cn('h-4 w-4', fav ? 'fill-pink text-pink' : 'text-fg')} />
        </motion.span>
      </motion.button>

      <div className="mt-2 flex min-h-[18px] items-center gap-1">
        <StockBadge p={p} />
        {!out && p.stock > p.lowStockAt && <span className="text-[11px] text-muted">{p.unit}</span>}
      </div>
      <h3 className="mt-1 line-clamp-2 min-h-[2.5em] font-body text-[13.5px] font-semibold leading-tight tracking-normal">{p.name}</h3>
      {(out || p.stock <= p.lowStockAt) && <p className="text-[11px] text-muted">{p.unit}</p>}
      <div className="mt-auto flex items-end justify-between gap-1 pt-2">
        <div className="price leading-tight">
          <div className="text-[15px] font-bold">{inr(p.price)}</div>
          {p.mrp > p.price && <div className="text-[11px] text-muted line-through">{inr(p.mrp)}</div>}
        </div>
        {out ? (
          <NotifyButton p={p} />
        ) : (
          <AddStepper
            size="sm"
            qty={qty}
            name={p.name}
            atMax={qty >= p.stock}
            onAdd={(e) => addToCart(p, e)}
            onInc={(e) => addToCart(p, e)}
            onDec={() => dec(p.id)}
          />
        )}
      </div>
    </article>
  );
});

export function ProductCardSkeleton({ rail }: { rail?: boolean }) {
  return (
    <div className={cn('rounded-card border border-line/60 bg-surface p-2.5', rail && 'w-[152px] shrink-0 xs:w-[160px]')}>
      <div className="shimmer aspect-square rounded-[16px]" />
      <div className="shimmer mt-3 h-3 w-1/3 rounded" />
      <div className="shimmer mt-2 h-3.5 w-5/6 rounded" />
      <div className="shimmer mt-1.5 h-3.5 w-2/3 rounded" />
      <div className="mt-4 flex items-center justify-between">
        <div className="shimmer h-4 w-10 rounded" />
        <div className="shimmer h-9 w-16 rounded-xl" />
      </div>
    </div>
  );
}
