import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, HeartHandshake, Loader2, Lock, MapPin, Pencil, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { useUserOrders } from '@/shared/hooks/live';
import { useNow } from '@/shared/hooks/misc';
import { toast } from '@/shared/store/toast';
import { inr } from '@/shared/lib/format';
import { fmtClock, MIN } from '@/shared/lib/time';
import { isPaid } from '@/shared/types';
import { cn } from '@/shared/lib/cn';
import { useCartDetails, useCurrentUser } from '../hooks';
import { useCart } from '../store/cart';
import { Page, PageHeader, Section } from '../components/Page';
import { BillSummary } from '../components/BillSummary';
import { addressLine } from '../components/AddressForm';
import { ReceiverSheet } from '../components/ReceiverSheet';
import { UpiQr } from '../components/UpiQr';

const PAY_WINDOW = 15 * MIN;

export default function Checkout() {
  const nav = useNavigate();
  const { userId, customer } = useCurrentUser();
  const { items, bill, couponCheck, count, settings, loading } = useCartDetails();
  const [orders, ordersLoading] = useUserOrders(userId);
  const cart = useCart();
  const now = useNow(1000);
  const creating = useRef(false);
  const createdAt = useRef(0);
  const leaving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);

  const addresses = customer?.addresses ?? [];
  const address = addresses.find((a) => a.id === cart.addressId) ?? addresses.find((a) => a.id === customer?.defaultAddressId) ?? addresses[0];

  const pending = orders.find((o) => o.id === cart.pendingOrderId);
  const usable = !!pending && pending.status !== 'cancelled' && (isPaid(pending) || pending.bill.grandTotal === bill.grandTotal + (pending.bill.donation ?? 0));
  const paid = !!pending && usable && isPaid(pending);

  const blocked =
    !loading && !leaving.current && !usable &&
    (!userId || !address || count === 0 || bill.itemTotal < settings.minOrderValue || customer?.blocked);

  useEffect(() => {
    if (blocked) nav('/cart', { replace: true });
  }, [blocked, nav]);

  // Keep the delivery contact on the order in step with the saved receiver details.
  const rv = customer?.receiver;
  useEffect(() => {
    if (!pending || !userId || !rv || pending.status !== 'placed') return;
    if (pending.receiver?.name === rv.name && pending.receiver?.phone === rv.phone) return;
    void services.orders.setReceiver(pending.id, userId, rv).catch(() => undefined);
  }, [pending, userId, rv]);

  // Once the store has confirmed the payment AND accepted the order, move on by ourselves.
  useEffect(() => {
    if (!pending || leaving.current) return;
    if (pending.status === 'cancelled') {
      leaving.current = true;
      toast.error('Order not accepted', pending.cancelReason ?? 'The store couldn’t take this order.');
      cart.setPendingOrder(null);
      nav('/cart', { replace: true });
      return;
    }
    if (isPaid(pending) && pending.status !== 'placed') {
      leaving.current = true;
      const id = pending.id;
      cart.clear();
      nav(`/order-success/${id}`, { replace: true });
    }
  }, [pending, cart, nav]);

  // Create (or replace) the awaiting-payment order once we know what the user already has.
  useEffect(() => {
    if (Date.now() - createdAt.current < 10_000) return; // the new order hasn't reached our live list yet
    if (loading || ordersLoading || blocked || usable || creating.current || leaving.current || pending?.status === 'cancelled' || !userId || !address) return;
    creating.current = true;
    (async () => {
      try {
        if (pending && pending.status === 'placed' && !isPaid(pending)) await services.orders.cancelUnpaid(pending.id, userId);
        const order = await services.orders.placeOrder({
          userId,
          addressId: address.id,
          items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
          couponCode: couponCheck?.ok ? cart.couponCode ?? undefined : undefined,
          instructions: cart.instructions
        });
        cart.setPendingOrder(order.id);
        createdAt.current = Date.now();
      } catch (e) {
        toast.error('Couldn’t start checkout', errorMessage(e));
        if (cart.couponCode && errorMessage(e).toLowerCase().includes('code')) cart.applyCoupon(null);
        nav('/cart', { replace: true });
      } finally {
        creating.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ordersLoading, blocked, usable, userId, address?.id, items.length, bill.grandTotal]);

  // Unpaid orders don't hold stock forever.
  const expiresAt = pending && usable && !paid ? pending.createdAt + PAY_WINDOW : 0;
  useEffect(() => {
    if (!expiresAt || !userId || !pending || now < expiresAt || leaving.current) return;
    leaving.current = true;
    void services.orders.cancelUnpaid(pending.id, userId).finally(() => {
      cart.setPendingOrder(null);
      toast.error('Payment window closed', 'We released your items. Start checkout again when you’re ready.');
      nav('/cart', { replace: true });
    });
  }, [expiresAt, now, pending, userId, cart, nav]);

  if (loading || (!usable && !blocked && !pending)) {
    return (
      <Page>
        <PageHeader title="Checkout" back="/cart" />
        <div className="grid place-items-center py-20 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </Page>
    );
  }
  if (blocked || !address) return null;

  const setDonation = async (amt: number) => {
    if (!pending || !userId || paid) return;
    try {
      await services.orders.setDonation(pending.id, userId, amt);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const cancelPayment = async () => {
    if (!pending || !userId) return;
    setBusy(true);
    try {
      leaving.current = true;
      await services.orders.cancelUnpaid(pending.id, userId);
      cart.setPendingOrder(null);
      nav('/cart', { replace: true });
    } catch (e) {
      leaving.current = false;
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!pending)
    return (
      <Page>
        <PageHeader title="Checkout" back="/cart" />
        <EmptyState emoji="🏠" title="Preparing your order…" action={<Button variant="primary" onClick={() => nav('/cart')}>Back to cart</Button>} />
      </Page>
    );

  return (
    <Page>
      <PageHeader title="Checkout" sub={`${count} item${count === 1 ? '' : 's'}`} back="/cart" />

      <div className="space-y-3">
        <Section>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan"><MapPin className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold uppercase tracking-wider text-muted">Delivering to</span>
              <span className="block truncate font-bold">{addressLine(pending.address, settings.hostels)}</span>
            </div>
          </div>
        </Section>

        <Section>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><User className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold uppercase tracking-wider text-muted">Receiver at the door</span>
              <span className="block truncate font-bold">{customer?.receiver ? `${customer.receiver.name} · +91 ${customer.receiver.phone}` : 'Add who will receive it'}</span>
            </div>
            {!paid && customer && (
              <button onClick={() => setReceiverOpen(true)} className="hit flex items-center gap-1 text-sm font-semibold text-violet">
                <Pencil className="h-3.5 w-3.5" /> {customer.receiver ? 'Change' : 'Add'}
              </button>
            )}
          </div>
        </Section>

        <Section title="Bill details">
          <BillSummary bill={pending.bill} />
        </Section>

        <Section>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber"><HeartHandshake className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Feeding India impact <span className="text-[12px] font-normal text-muted">(optional)</span></p>
              <p className="text-[13px] text-muted">Add a little to help feed a child. It’s added to your bill.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, 2, 5, 10].map((v) => (
              <button key={v} disabled={paid} className={cn('chip', paid && 'opacity-50')} aria-pressed={(pending.bill.donation ?? 0) === v} onClick={() => setDonation(v)}>
                {v === 0 ? 'No thanks' : `₹${v}`}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Scan &amp; pay">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-violet/10 p-3">
            <div>
              <p className="text-sm font-semibold text-violet">Your order code</p>
              <p className="text-[12px] text-muted">Type this in the GPay note so the store can match your payment</p>
            </div>
            <span className="price font-display text-3xl font-extrabold tracking-[0.2em] text-violet">{pending.shortCode}</span>
          </div>
          <UpiQr amount={pending.bill.grandTotal} />
          <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
            Pay the exact amount with any UPI app. The store checks it landed in their account and confirms here. Only then does your order go through.
          </p>
        </Section>

        <div className={paid ? 'rounded-card border border-lime/40 bg-lime/10 p-4 text-sm' : 'rounded-card border border-amber/40 bg-amber/10 p-4 text-sm'}>
          {paid ? (
            <p className="flex items-center gap-2 font-semibold text-lime"><CheckCircle2 className="h-5 w-5" /> Payment received. Waiting for the store to accept your order…</p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold text-amber"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for the store to confirm your payment…</p>
              <p className="text-[12px] text-muted">
                This unlocks by itself the moment they see your money. This page moves on by itself, or come back from the notification.
                {expiresAt ? <> Order held for <b>{fmtClock(Math.max(0, expiresAt - now))}</b>.</> : null}
              </p>
              <button onClick={cancelPayment} disabled={busy} className="hit text-[13px] font-semibold text-pink">Cancel payment</button>
            </div>
          )}
        </div>

        <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/60 px-4 py-3 md:static md:rounded-card md:border md:bg-surface md:p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="shrink-0 leading-tight">
              <p className="price font-display text-2xl font-extrabold">{inr(pending.bill.grandTotal)}</p>
              <p className="text-[12px] text-muted">Total to pay</p>
            </div>
            <p className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[13px] font-semibold text-muted">
              {paid ? <CheckCircle2 className="h-4 w-4 shrink-0 text-lime" /> : <Lock className="h-4 w-4 shrink-0" />}
              <span>{paid ? 'Paid. Waiting for the store to accept' : 'Waiting for the store to confirm payment'}</span>
            </p>
          </div>
        </div>
      </div>
    {customer && <ReceiverSheet open={receiverOpen} customer={customer} onClose={() => setReceiverOpen(false)} />}
    </Page>
  );
}
