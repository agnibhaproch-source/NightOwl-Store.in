import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { inr } from '@/shared/lib/format';
import { useUi } from '../store/ui';
import { useCartDetails } from '../hooks';

const HIDE_ON = ['/cart', '/checkout', '/login', '/welcome', '/order-success'];

export function CartBar() {
  const { count, bill, settings } = useCartDetails();
  const pulse = useUi((s) => s.cartPulse);
  const { pathname } = useLocation();
  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));
  const toMin = settings.minOrderValue - bill.itemTotal;

  return (
    <AnimatePresence>
      {count > 0 && !hidden && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="fixed inset-x-3 bottom-[76px] z-40 md:bottom-6 md:left-auto md:right-6 md:w-[380px]"
        >
          <Link
            to="/cart"
            className="flex items-center gap-3 rounded-[20px] bg-accent p-2 pr-4 text-onaccent shadow-glow"
            aria-label={`View cart, ${count} items, ${inr(bill.itemTotal)}`}
          >
            <motion.span
              key={pulse}
              data-cart-target
              animate={pulse ? { scale: [1, 1.25, 0.95, 1], rotate: [0, -10, 6, 0] } : undefined}
              transition={{ duration: 0.45 }}
              className="relative grid h-11 w-11 place-items-center rounded-2xl bg-onaccent/10"
            >
              <ShoppingBag className="h-5 w-5" />
            </motion.span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-extrabold">
                {count} item{count > 1 ? 's' : ''} · {inr(bill.itemTotal)}
              </span>
              <span className="block truncate text-[12px] font-medium opacity-75">
                {toMin > 0 ? `Add ${inr(toMin)} more to checkout` : 'Ready to checkout'}
              </span>
            </span>
            <span className="inline-flex items-center text-[15px] font-extrabold">
              View cart <ChevronRight className="h-5 w-5" />
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
