import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, PackageCheck, Bike, ClipboardCheck, Receipt, Package } from 'lucide-react';
import type { Order, OrderStatus, OrderRating } from '@/shared/types';
import { STATUS_FLOW, STATUS_LABEL } from '@/shared/types';
import { Badge, Button, PackShot, Sheet, Stars, Textarea } from '@/shared/ui';
import { fmtTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { useCart } from '../store/cart';
import { useCatalog } from '../hooks';

export const statusTone = (s: OrderStatus) =>
  s === 'delivered' ? 'lime' : s === 'cancelled' ? 'pink' : s === 'out_for_delivery' ? 'cyan' : s === 'placed' ? 'amber' : 'violet';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const live = status !== 'delivered' && status !== 'cancelled';
  return (
    <Badge tone={statusTone(status)}>
      {live && (
        <span className="relative mr-0.5 flex h-1.5 w-1.5">
          <span className="pulse-ring absolute inset-0 rounded-full bg-current" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const STEP_META: Record<Exclude<OrderStatus, 'cancelled'>, { icon: typeof Check; note: string }> = {
  placed: { icon: Receipt, note: 'Waiting for the store to accept' },
  accepted: { icon: ClipboardCheck, note: 'The store has your order' },
  packing: { icon: Package, note: 'Bagging your snacks' },
  out_for_delivery: { icon: Bike, note: 'On the way to your room' },
  delivered: { icon: PackageCheck, note: 'Enjoy!' }
};

export function Timeline({ order }: { order: Order }) {
  const cancelled = order.status === 'cancelled';
  const reached = cancelled
    ? Math.max(0, ...order.history.filter((h) => h.status !== 'cancelled').map((h) => STATUS_FLOW.indexOf(h.status)))
    : STATUS_FLOW.indexOf(order.status);
  const at = (s: OrderStatus) => order.history.find((h) => h.status === s)?.at;
  return (
    <ol className="relative" aria-label="Order progress">
      {STATUS_FLOW.map((s, i) => {
        const done = i <= reached && !(cancelled && i > reached);
        const current = !cancelled && i === reached && s !== 'delivered';
        const meta = STEP_META[s as keyof typeof STEP_META];
        const Icon = meta.icon;
        const last = i === STATUS_FLOW.length - 1;
        const ts = at(s);
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? 'step' : undefined}>
            {!last && (
              <div className="absolute left-[19px] top-10 h-[calc(100%-32px)] w-0.5 overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full w-full origin-top bg-lime"
                  initial={false}
                  animate={{ scaleY: i < reached && !(cancelled && i >= reached) ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            )}
            <motion.span
              initial={false}
              animate={{ scale: current ? [1, 1.1, 1] : 1 }}
              transition={current ? { duration: 1.6, repeat: Infinity } : { duration: 0.2 }}
              className={cn(
                'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500',
                done ? (current ? 'border-violet bg-violet text-white shadow-violet' : 'border-lime bg-lime text-onaccent') : 'border-line bg-surface text-muted'
              )}
            >
              {done && !current ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-[18px] w-[18px]" />}
            </motion.span>
            <div className="min-w-0 pt-1.5">
              <p className={cn('font-bold', !done && 'text-muted')}>{STATUS_LABEL[s]}</p>
              <p className="text-[13px] text-muted">
                {ts ? fmtTime(ts) : ''}
                {ts && (current || s === 'delivered') ? ' · ' : ''}
                {current || (s === 'delivered' && done) ? meta.note : ''}
              </p>
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative mt-4 flex gap-4 rounded-2xl bg-pink/10 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink text-white">✕</span>
          <div>
            <p className="font-bold text-pink">Cancelled {order.cancelledBy === 'user' ? 'by you' : 'by the store'}</p>
            <p className="text-[13px] text-muted">{order.cancelReason}{order.updatedAt ? ` · ${fmtTime(order.updatedAt)}` : ''}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

export function useReorder() {
  const { byId } = useCatalog();
  const setQty = useCart((s) => s.setQty);
  const lines = useCart((s) => s.lines);
  return (order: Order) => {
    let added = 0;
    const missing: string[] = [];
    order.items.forEach((i) => {
      const p = byId.get(i.productId);
      if (!p || !p.active || p.stock <= 0) {
        missing.push(i.name);
        return;
      }
      const qty = Math.min(p.stock, (lines[p.id] ?? 0) + i.qty);
      setQty(p.id, qty);
      added++;
    });
    if (!added) {
      toast.error('None of those items are in stock right now');
      return false;
    }
    toast({
      title: 'Added to cart',
      body: missing.length ? `${missing.length} item${missing.length > 1 ? 's' : ''} unavailable: ${missing.slice(0, 2).join(', ')}` : 'Same as last time. Good taste.',
      emoji: '🔁'
    });
    return true;
  };
}

const TAGS = ['Super fast', 'Well packed', 'Cold drinks were cold', 'Polite rider', 'Late delivery', 'Item damaged'];

export function RateSheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { byId } = useCatalog();
  const [stars, setStars] = useState(order.rating?.order ?? 0);
  const [items, setItems] = useState<Record<string, number>>(order.rating?.items ?? {});
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState(order.rating?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const label = ['', 'Bad', 'Meh', 'Okay', 'Good', 'Loved it'][stars];
  const submit = async () => {
    setBusy(true);
    try {
      const text = [tags.join(', '), comment.trim()].filter(Boolean).join('. ');
      const rating: OrderRating = { order: stars, items, comment: text || undefined, at: Date.now() };
      await services.orders.rateOrder(order.id, rating);
      toast({ title: 'Thanks for rating!', body: 'It helps us stock what you love.', emoji: stars >= 4 ? '💜' : '🙏' });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rate your order"
      footer={<Button variant="primary" size="lg" block disabled={!stars} loading={busy} onClick={submit}>Submit rating</Button>}
    >
      <div className="text-center">
        <p className="text-muted">How was order #{order.id}?</p>
        <div className="mt-2 flex justify-center"><Stars value={stars} onChange={setStars} size={34} label="Order rating" /></div>
        <p className="h-6 font-display text-lg font-bold">{label}</p>
      </div>
      {stars > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-5">
          <div className="flex flex-wrap justify-center gap-2">
            {TAGS.filter((t, i) => (stars >= 4 ? i < 4 : true)).map((t) => (
              <button key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>
                {t}
              </button>
            ))}
          </div>
          <div>
            <h3 className="field-label">Rate the items</h3>
            <ul className="divide-y divide-line/50 rounded-2xl border border-line/60">
              {order.items.map((i) => {
                const p = byId.get(i.productId);
                return (
                  <li key={i.productId} className="flex items-center gap-3 px-3 py-1.5">
                    {p && <span className="h-10 w-10 shrink-0 rounded-xl p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.name}</span>
                    <Stars value={items[i.productId] ?? 0} onChange={(v) => setItems((x) => ({ ...x, [i.productId]: v }))} size={18} label={`Rating for ${i.name}`} />
                  </li>
                );
              })}
            </ul>
          </div>
          <Textarea label="Anything else?" placeholder="Tell us what went well or what didn't" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={240} />
        </motion.div>
      )}
    </Sheet>
  );
}
