import { useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Copy, HelpCircle, MapPin, MessageSquareText, Phone, RotateCcw, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserOrders, useSettings } from '@/shared/hooks/live';
import { useNow } from '@/shared/hooks/misc';
import { Button, EmptyState, IconButton, PackShot, Skeleton, Stars } from '@/shared/ui';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import { services, errorMessage } from '@/shared/services';
import { fmtDateTime, inr } from '@/shared/lib/format';
import { fmtClock, MIN } from '@/shared/lib/time';
import { APP } from '@/shared/config/app';
import { isPaid } from '@/shared/types';
import { useCatalog, useCurrentUser } from '../hooks';
import { useUi } from '../store/ui';
import { Page, PageHeader, Section } from '../components/Page';
import { BillSummary } from '../components/BillSummary';
import { RateSheet, StatusBadge, Timeline, useReorder } from '../components/OrderBits';
import { addressLine } from '../components/AddressForm';
import { LoginPrompt } from '../components/LoginPrompt';
import { RiderPanel } from '../components/RiderPanel';

const HEADLINE: Record<string, string> = {
  placed: 'Sending it to the store…',
  accepted: 'Store accepted your order',
  packing: 'Packing your snacks',
  out_for_delivery: 'On the way!',
  delivered: 'Delivered. Enjoy!',
  cancelled: 'Order cancelled'
};

function Eta({ createdAt, minutes, status }: { createdAt: number; minutes: number; status: string }) {
  const now = useNow(1000);
  const left = createdAt + minutes * MIN - now;
  const late = left <= 0;
  return (
    <div className="text-center">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{late ? 'Almost there' : 'Arriving in'}</p>
      <p className="price font-display text-[56px] font-extrabold leading-none tracking-tight" aria-live="off">
        {late ? (status === 'out_for_delivery' ? '1–2 min' : 'Soon') : fmtClock(left)}
      </p>
      {late && <p className="mt-1 text-[12px] text-muted">Running a little behind. Thanks for waiting.</p>}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { userId } = useCurrentUser();
  const [orders, loading] = useUserOrders(userId);
  const [settings] = useSettings();
  const { byId } = useCatalog();
  const openProduct = useUi((s) => s.openProduct);
  const reorder = useReorder();
  const [rateOpen, setRateOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const now = useNow(1000);
  const o = orders.find((x) => x.id === id);

  if (!userId)
    return (
      <Page>
        <PageHeader title="Order" />
        <LoginPrompt emoji="🔐" title="Log in to see this order" body="Orders are tied to your phone number." />
      </Page>
    );

  if (loading)
    return (
      <Page>
        <PageHeader title="Order" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="mt-3 h-40 rounded-card" />
      </Page>
    );

  if (!o)
    return (
      <Page>
        <PageHeader title="Order" />
        <EmptyState emoji="🕵️" title="Order not found" body="It may belong to another account." action={<Button variant="primary" onClick={() => nav('/orders')}>Your orders</Button>} />
      </Page>
    );

  const active = o.status !== 'delivered' && o.status !== 'cancelled';
  const unpaid = o.status === 'placed' && !isPaid(o);
  const cancelLeftMs = (o.paidAt ?? o.createdAt) + APP.cancelWindowSeconds * 1000 - now;
  const canCancel = o.status === 'placed' && !unpaid && o.paymentMode !== 'wallet' && cancelLeftMs > 0;

  const cancel = async () => {
    const { ok } = await confirmDialog({
      title: unpaid ? 'Cancel this payment?' : 'Cancel this order?',
      body: unpaid
        ? 'Your items will be released. If you already paid, don’t cancel. Wait for the store to confirm.'
        : 'You already paid via UPI, so we’ll refund it manually. Contact support if the refund doesn’t show up.',
      confirmLabel: unpaid ? 'Cancel payment' : 'Cancel order',
      tone: 'danger'
    });
    if (!ok) return;
    setCancelling(true);
    try {
      if (unpaid) await services.orders.cancelUnpaid(o.id, userId);
      else await services.orders.cancelByUser(o.id, userId);
      toast({ title: 'Order cancelled', emoji: '👋' });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title={`Order #${o.id}`}
        sub={fmtDateTime(o.createdAt)}
        back="/orders"
        right={
          <IconButton
            label="Copy order ID"
            onClick={() => {
              void navigator.clipboard?.writeText(o.id);
              toast({ title: 'Order ID copied', emoji: '📋', duration: 1500 });
            }}
          >
            <Copy className="h-4 w-4" />
          </IconButton>
        }
      />
      <div className="space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
        <div className="space-y-3">
          <Section className="relative overflow-hidden">
            {active && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgb(var(--violet) / .35), transparent)' }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
            <div className="relative mb-5 flex items-start justify-between gap-3">
              <div>
                <StatusBadge status={o.status} />
                <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight" aria-live="polite">{unpaid ? 'Waiting for payment confirmation' : HEADLINE[o.status]}</h2>
              </div>
              <div className="shrink-0 rounded-2xl bg-violet/10 px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet">Code</p>
                <p className="price font-display text-lg font-extrabold tracking-[0.2em] text-violet">{o.shortCode}</p>
              </div>
            </div>
            {active && !unpaid && (
              <div className="relative mb-6 rounded-2xl bg-surface2/70 py-4">
                <Eta createdAt={o.paidAt ?? o.createdAt} minutes={o.etaMinutes} status={o.status} />
              </div>
            )}
            <Timeline order={o} />
            {unpaid && (
              <div className="mt-5 space-y-2">
                <Button block variant="primary" onClick={() => nav('/checkout')}>Go to payment</Button>
                <Button block variant="outline" loading={cancelling} onClick={cancel}>Cancel payment</Button>
              </div>
            )}
            {o.status === 'placed' && !unpaid && (
              canCancel ? (
                <Button block className="mt-5" variant="outline" loading={cancelling} onClick={cancel}>
                  Cancel order · {Math.ceil(cancelLeftMs / 1000)}s left
                </Button>
              ) : (
                <p className="mt-5 rounded-2xl border border-line/60 bg-surface2/60 p-3 text-center text-[13px] text-muted">
                  {o.paymentMode === 'wallet' ? 'Paid from your wallet. To cancel, call customer care and we’ll refund it to your wallet.' : 'Cancellation window has closed. Call the store if something’s wrong.'}
                </p>
              )
            )}
          </Section>

          {active && !unpaid && o.rider && <RiderPanel order={o} />}

          {o.status === 'delivered' && (
            <Section>
              {o.rating ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold">You rated this order</p>
                    <Stars value={o.rating.order} size={18} />
                    {o.rating.comment && <p className="mt-1 text-sm text-muted">“{o.rating.comment}”</p>}
                  </div>
                  <Button size="sm" onClick={() => setRateOpen(true)}>Edit</Button>
                </div>
              ) : (
                <button onClick={() => setRateOpen(true)} className="flex w-full items-center gap-3 text-left">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber/15 text-amber"><Star className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block font-bold">How was it?</span><span className="text-sm text-muted">Rate the order and the items</span></span>
                </button>
              )}
            </Section>
          )}

          <Section>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /><span><b>{o.address.label}</b><br /><span className="text-muted">{addressLine(o.address, settings.hostels)}</span></span></p>
              {o.instructions && <p className="flex items-start gap-3"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><span className="text-muted">{o.instructions}</span></p>}
              <p className="flex items-start gap-3"><Banknote className="mt-0.5 h-4 w-4 shrink-0 text-lime" /><span>{unpaid ? 'Payment pending' : o.paymentMode === 'wallet' ? 'Paid from wallet' : 'Paid via UPI'} · <b>{inr(o.bill.grandTotal)}</b></span></p>
            </div>
          </Section>
        </div>

        <div className="space-y-3">
          <Section title={`${o.items.reduce((a, i) => a + i.qty, 0)} items`} flush className="px-4 pt-4">
            <ul className="-mx-4 divide-y divide-line/50">
              {o.items.map((i) => {
                const p = byId.get(i.productId);
                return (
                  <li key={i.productId}>
                    <button onClick={() => p && openProduct(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2/60">
                      <span className="h-12 w-12 shrink-0 rounded-xl p-1" style={{ background: p ? `${p.color}22` : undefined }}>{p && <PackShot product={p} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{i.name}</span>
                        <span className="text-[12px] text-muted">{i.unit} · {i.qty} × {inr(i.price)}</span>
                      </span>
                      <span className="price text-sm font-bold">{inr(i.price * i.qty)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title="Bill">
            <BillSummary bill={o.bill} compact />
          </Section>
          <div className="grid grid-cols-2 gap-2">
            <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => reorder(o) && nav('/cart')}>Reorder</Button>
            {active ? (
              <a href={`tel:${APP.supportPhone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-surface2 font-semibold">
                <Phone className="h-4 w-4" /> Call store
              </a>
            ) : (
              <Button icon={<HelpCircle className="h-4 w-4" />} onClick={() => nav('/help')}>Get help</Button>
            )}
          </div>
        </div>
      </div>
      <RateSheet key={o.id} order={o} open={rateOpen} onClose={() => setRateOpen(false)} />
    </Page>
  );
}
