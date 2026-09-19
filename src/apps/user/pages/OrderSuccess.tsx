import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Banknote, Clock, MapPin } from 'lucide-react';
import { useUserOrders, useSettings } from '@/shared/hooks/live';
import { Button, Spinner } from '@/shared/ui';
import { inr } from '@/shared/lib/format';
import { useCurrentUser } from '../hooks';
import { Confetti } from '../components/Confetti';
import { addressLine } from '../components/AddressForm';
import { requestNotifPermission, notifPermission } from '@/shared/lib/notify';
import { toast } from '@/shared/store/toast';

export default function OrderSuccess() {
  const { id } = useParams();
  const nav = useNavigate();
  const { userId } = useCurrentUser();
  const [orders, loading] = useUserOrders(userId);
  const [settings] = useSettings();
  const order = orders.find((o) => o.id === id);
  const perm = notifPermission();

  return (
    <main id="main" className="safe-top safe-bottom relative mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pb-8 pt-16 text-center">
      <div className="relative">
        <Confetti count={36} spread={200} seed={7} />
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="relative grid h-32 w-32 place-items-center rounded-full bg-accent shadow-glow"
        >
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-accent"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.2, repeat: 2, ease: 'easeOut' }}
          />
          <svg viewBox="0 0 52 52" className="h-16 w-16" aria-hidden>
            <motion.path
              d="M14 27 l8 8 l16 -18"
              fill="none"
              stroke="rgb(var(--on-accent))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.45, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full">
        <h1 className="mt-8 font-display text-[40px] font-extrabold leading-none tracking-tight">Order placed!</h1>
        <p className="mt-2 text-muted">Hoot hoot. The store will accept it in a moment.</p>
        {loading || !order ? (
          <div className="mt-10 flex justify-center"><Spinner /></div>
        ) : (
          <div className="card mt-8 space-y-3 p-5 text-left">
            <div className="flex items-center justify-between rounded-2xl bg-violet/10 p-3">
              <span className="text-sm font-semibold text-violet">Your order code</span>
              <span className="price font-display text-2xl font-extrabold tracking-[0.2em] text-violet">{order.shortCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Order ID</span>
              <span className="font-display text-lg font-extrabold tracking-wide">#{order.id}</span>
            </div>
            <div className="flex items-center gap-3 text-sm"><Clock className="h-4 w-4 text-lime" /> Arriving in about <b>{order.etaMinutes} min</b></div>
            <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-cyan" /> {addressLine(order.address, settings.hostels)}</div>
            {!!order.bill.donation && <div className="flex items-center gap-3 text-sm"><span aria-hidden>💛</span> Thank you for adding <b>{inr(order.bill.donation)}</b> for Feeding India</div>}
            <div className="flex items-center gap-3 text-sm"><Banknote className="h-4 w-4 text-violet" /> Paid <b>{inr(order.bill.grandTotal)}</b> {order.paymentMode === 'wallet' ? 'from your wallet' : 'via UPI'}</div>
          </div>
        )}
        {perm === 'default' && (
          <button
            onClick={async () => {
              const r = await requestNotifPermission();
              if (r === 'granted') toast.success('Live updates on', 'We’ll ping you at every step.');
            }}
            className="mt-4 w-full rounded-2xl border border-dashed border-violet/60 bg-violet/5 p-3 text-sm font-semibold text-violet"
          >
            🔔 Turn on notifications to follow your order
          </button>
        )}
      </motion.div>
      <div className="mt-auto w-full space-y-2 pt-8">
        <Button variant="primary" size="lg" block onClick={() => nav(`/orders/${id}`, { replace: true })}>Track order</Button>
        <Button variant="ghost" size="lg" block onClick={() => nav('/', { replace: true })}>Back to home</Button>
      </div>
    </main>
  );
}
