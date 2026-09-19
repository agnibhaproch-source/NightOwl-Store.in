import { AnimatePresence, motion } from 'framer-motion';
import { Bike, ChevronRight, Clock, PackageCheck, Timer, Wallet } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUserOrders } from '@/shared/hooks/live';
import { useNow } from '@/shared/hooks/misc';
import { MIN } from '@/shared/lib/time';
import { isPaid, type Order } from '@/shared/types';
import { useCart, cartCount } from '../store/cart';
import { useCurrentUser } from '../hooks';

const SHOW_ON = ['/', '/search', '/orders', '/profile', '/favorites'];
const PAY_WINDOW = 15 * MIN;

function describe(o: Order, now: number) {
  if (!isPaid(o)) return { icon: Wallet, title: 'Finish your payment', sub: 'Waiting for payment confirmation', to: '/checkout', tone: 'bg-amber' };
  const left = Math.max(0, Math.ceil(((o.paidAt ?? o.createdAt) + o.etaMinutes * MIN - now) / MIN));
  const eta = left > 0 ? `Arriving in ~${left} min` : 'Almost there';
  switch (o.status) {
    case 'placed': return { icon: Clock, title: 'Order placed', sub: 'Waiting for the store to accept', to: `/orders/${o.id}`, tone: 'bg-accent' };
    case 'accepted': return { icon: PackageCheck, title: 'Store accepted your order', sub: o.rider ? `${o.rider.name} will deliver · ${eta}` : eta, to: `/orders/${o.id}`, tone: 'bg-accent' };
    case 'packing': return { icon: Timer, title: 'Packing your order', sub: o.rider ? `${o.rider.name} will deliver · ${eta}` : eta, to: `/orders/${o.id}`, tone: 'bg-accent' };
    default: return { icon: Bike, title: o.arrivedAt ? `${o.rider?.name ?? 'Your rider'} is at your door` : o.rider ? `${o.rider.name} is on the way` : 'On the way to you', sub: o.arrivedAt ? 'Share your delivery code' : eta, to: `/orders/${o.id}`, tone: 'bg-accent' };
  }
}

/** Blinkit-style pill: shows the order in progress and jumps straight to tracking. */
export function ActiveOrderBar() {
  const { userId } = useCurrentUser();
  const [orders] = useUserOrders(userId);
  const items = useCart((s) => cartCount(s.lines));
  const { pathname } = useLocation();
  const now = useNow(15_000);

  const show = SHOW_ON.includes(pathname) || pathname.startsWith('/c/');
  const order = orders
    .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled' && (isPaid(o) || now - o.createdAt < PAY_WINDOW))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const d = order ? describe(order, now) : null;

  return (
    <AnimatePresence>
      {show && order && d && (
        <motion.div
          key={order.id}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className={`fixed inset-x-3 z-40 md:bottom-6 md:left-6 md:right-auto md:w-[380px] ${items > 0 ? 'bottom-[148px]' : 'bottom-[76px]'}`}
        >
          <Link to={d.to} className="flex items-center gap-3 rounded-[20px] border border-line/70 bg-surface p-2 pr-4 shadow-glow" aria-label={`${d.title}. Track order ${order.shortCode}`}>
            <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-onaccent ${d.tone}`}>
              <d.icon className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-surface bg-pink" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-extrabold">{d.title}</span>
              <span className="block truncate text-[12px] text-muted">{d.sub} · #{order.shortCode}</span>
            </span>
            <span className="inline-flex items-center text-[14px] font-extrabold text-violet">
              {isPaid(order) ? 'Track' : 'Pay'} <ChevronRight className="h-5 w-5" />
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
