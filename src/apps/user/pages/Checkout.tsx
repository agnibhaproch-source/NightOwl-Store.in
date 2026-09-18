import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, QrCode, ShieldCheck } from 'lucide-react';
import { Button, EmptyState } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { inr } from '@/shared/lib/format';
import { APP } from '@/shared/config/app';
import { useCartDetails, useCurrentUser } from '../hooks';
import { useCart } from '../store/cart';
import { Page, PageHeader, Section } from '../components/Page';
import { BillSummary } from '../components/BillSummary';
import { addressLine } from '../components/AddressForm';

function QrPlaceholder({ amount }: { amount: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-violet/40 bg-violet/5 p-5 text-center">
      <div className="grid h-56 w-56 place-items-center overflow-hidden rounded-2xl bg-surface">
        {broken ? (
          <div className="flex flex-col items-center gap-2 p-4 text-muted">
            <QrCode className="h-12 w-12" />
            <p className="text-[12px] leading-snug">
              Add your GPay QR image at <code className="rounded bg-surface2 px-1 py-0.5">public/qr-code.jpg</code>
            </p>
          </div>
        ) : (
          <img src="/qr-code.jpg" alt="Scan to pay with GPay" className="h-full w-full object-contain" onError={() => setBroken(true)} />
        )}
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold">{inr(amount)}</p>
        <p className="text-sm font-semibold">{APP.upiPayeeName}</p>
        <p className="text-[12px] text-muted">UPI ID: {APP.upiId}</p>
      </div>
    </div>
  );
}

export default function Checkout() {
  const nav = useNavigate();
  const { userId, customer } = useCurrentUser();
  const { items, bill, couponCheck, count, settings, loading } = useCartDetails();
  const cart = useCart();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const addresses = customer?.addresses ?? [];
  const address = addresses.find((a) => a.id === cart.addressId) ?? addresses.find((a) => a.id === customer?.defaultAddressId) ?? addresses[0];

  const blocked =
    !loading &&
    (!userId || !address || count === 0 || bill.itemTotal < settings.minOrderValue || customer?.blocked);

  useEffect(() => {
    if (blocked) nav('/cart', { replace: true });
  }, [blocked, nav]);

  if (loading || blocked) return null;

  const confirmPayment = async () => {
    if (!userId || !address) return;
    setPaying(true);
    try {
      const order = await services.orders.placeOrder({
        userId,
        addressId: address.id,
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        couponCode: couponCheck?.ok ? cart.couponCode ?? undefined : undefined,
        instructions: cart.instructions
      });
      setPaid(true);
      cart.clear();
      toast.success('Payment received', 'Sending your order to the store…');
      setTimeout(() => nav(`/order-success/${order.id}`, { replace: true }), 500);
    } catch (e) {
      toast.error('Couldn’t place the order', errorMessage(e));
      if (cart.couponCode && errorMessage(e).toLowerCase().includes('code')) cart.applyCoupon(null);
    } finally {
      setPaying(false);
    }
  };

  if (!address)
    return (
      <Page>
        <PageHeader title="Checkout" back="/cart" />
        <EmptyState emoji="🏠" title="Add a delivery room" action={<Button variant="primary" onClick={() => nav('/cart')}>Back to cart</Button>} />
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
              <span className="block truncate font-bold">{addressLine(address, settings.hostels)}</span>
            </div>
          </div>
        </Section>

        <Section title="Bill details">
          <BillSummary bill={bill} />
        </Section>

        <Section title="Scan &amp; pay">
          <QrPlaceholder amount={bill.grandTotal} />
          <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
            Scan with any UPI app (GPay, PhonePe, Paytm) and pay the exact amount shown. Once we see the payment, tap the button below to send your order to the store.
          </p>
        </Section>

        <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/60 px-4 py-3 md:static md:rounded-card md:border md:bg-surface md:p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="shrink-0 leading-tight">
              <p className="price font-display text-2xl font-extrabold">{inr(bill.grandTotal)}</p>
              <p className="text-[12px] text-muted">Total to pay</p>
            </div>
            <Button
              size="lg"
              block
              variant="primary"
              loading={paying}
              disabled={paid}
              onClick={confirmPayment}
              iconRight={paid ? <CheckCircle2 className="h-5 w-5" /> : undefined}
            >
              {paid ? 'Payment confirmed' : "I've paid · Place order"}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}
