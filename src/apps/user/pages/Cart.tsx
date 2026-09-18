import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronRight, MapPin, MessageSquareText, Plus, QrCode, Tag, Trash2, TicketPercent, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AddStepper, Button, EmptyState, IconButton, PackShot, Sheet, Textarea } from '@/shared/ui';
import { useStoreStatus } from '@/shared/hooks/misc';
import { checkCoupon } from '@/shared/lib/bill';
import { fmtDuration, hmLabel } from '@/shared/lib/time';
import { inr, fmtDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { APP } from '@/shared/config/app';
import type { Address, Coupon } from '@/shared/types';
import { useAddToCart, useCartDetails, useCatalog, useCurrentUser } from '../hooks';
import { useCart } from '../store/cart';
import { useUi } from '../store/ui';
import { Page, PageHeader, Section } from '../components/Page';
import { ProductRail } from '../components/ProductLists';
import { BillSummary } from '../components/BillSummary';
import { Confetti } from '../components/Confetti';
import { AddressEditor, addressLine, blankAddress } from '../components/AddressForm';

const QUICK_NOTES = ['Call when you reach', 'Don’t ring the bell', 'Leave at the door', 'Hand over at the hostel gate'];

function MinOrderBar({ total, min }: { total: number; min: number }) {
  const left = min - total;
  if (left <= 0) return null;
  const pct = Math.min(100, (total / min) * 100);
  return (
    <div className="card overflow-hidden p-4">
      <p className="text-sm font-semibold">
        Add <span className="text-violet">{inr(left)}</span> more to reach the <b>{inr(min)} minimum</b>
      </p>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to minimum order">
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: 'linear-gradient(90deg, rgb(var(--violet)), rgb(var(--lime)))' }}
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

function CouponSheet({ open, onClose, coupons, itemTotal, onApply }: { open: boolean; onClose: () => void; coupons: Coupon[]; itemTotal: number; onApply: (code: string) => void }) {
  const [code, setCode] = useState('');
  const visible = coupons.filter((c) => c.active && c.expiresAt > Date.now() && c.used < c.usageLimit);
  return (
    <Sheet open={open} onClose={onClose} title="Coupons">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onApply(code.trim().toUpperCase());
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
          placeholder="Enter coupon code"
          aria-label="Coupon code"
          className="field flex-1 font-semibold uppercase tracking-wider"
          autoCapitalize="characters"
        />
        <Button type="submit" variant="violet" disabled={!code.trim()}>Apply</Button>
      </form>
      <h3 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-wider text-muted">Available tonight</h3>
      {!visible.length && <p className="text-muted">No coupons live right now. Check back later.</p>}
      <ul className="space-y-3">
        {visible.map((c) => {
          const chk = checkCoupon(c, itemTotal);
          return (
            <li key={c.code} className={cn('relative overflow-hidden rounded-2xl border border-dashed p-4', chk.ok ? 'border-violet/60 bg-violet/5' : 'border-line')}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-violet"><TicketPercent className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold tracking-wide">{c.code}</p>
                  <p className="text-sm">{c.description}</p>
                  <p className="mt-1 text-[12px] text-muted">
                    {c.minOrder ? `Min order ${inr(c.minOrder)} · ` : ''}Valid till {fmtDate(c.expiresAt)}
                  </p>
                  {!chk.ok && <p className="mt-1 text-[12px] font-semibold text-amber">{chk.reason}</p>}
                  {chk.ok && <p className="mt-1 text-[12px] font-semibold text-lime">You save {inr(chk.discount)}</p>}
                </div>
                <Button size="sm" variant={chk.ok ? 'primary' : 'outline'} disabled={!chk.ok} onClick={() => onApply(c.code)}>
                  Apply
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function AddressSheet({ open, onClose, addresses, selected, onSelect }: { open: boolean; onClose: () => void; addresses: Address[]; selected?: string; onSelect: (id: string) => void }) {
  const { customer } = useCurrentUser();
  const { settings } = useCartDetails();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async (a: Address) => {
    if (!customer) return;
    setSaving(true);
    try {
      await services.customers.saveAddress(customer.id, a);
      onSelect(a.id);
      setAdding(false);
      onClose();
      toast.success('Room saved');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet open={open} onClose={() => { setAdding(false); onClose(); }} title={adding ? 'Add a room' : 'Deliver to'}>
      {adding ? (
        <AddressEditor initial={blankAddress(settings.hostels)} hostels={settings.hostels} onSave={save} saving={saving} />
      ) : (
        <div className="space-y-2">
          {addresses.map((a) => {
            const on = a.id === selected;
            const hostel = settings.hostels.find((h) => h.id === a.hostelId);
            const serviceable = !!hostel?.active && hostel.blocks.includes(a.block);
            return (
              <button
                key={a.id}
                disabled={!serviceable}
                onClick={() => { onSelect(a.id); onClose(); }}
                className={cn('flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-50', on ? 'border-violet bg-violet/10' : 'border-line hover:border-muted/50')}
              >
                <MapPin className={cn('h-5 w-5 shrink-0', on ? 'text-violet' : 'text-muted')} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block text-sm text-muted">{addressLine(a, settings.hostels)}</span>
                  {!serviceable && <span className="text-[12px] font-semibold text-pink">Not serviceable right now</span>}
                </span>
                {on && <Check className="h-5 w-5 text-violet" />}
              </button>
            );
          })}
          <Button block icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add another room</Button>
        </div>
      )}
    </Sheet>
  );
}

export default function Cart() {
  const nav = useNavigate();
  const loc = useLocation();
  const { items, bill, coupon, couponCheck, coupons, count, issues, settings, loading } = useCartDetails();
  const { products } = useCatalog();
  const { status } = useStoreStatus(10_000);
  const { userId, customer } = useCurrentUser();
  const cart = useCart();
  const addToCart = useAddToCart();
  const openProduct = useUi((s) => s.openProduct);
  const [couponOpen, setCouponOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const addresses = customer?.addresses ?? [];
  const address = addresses.find((a) => a.id === cart.addressId) ?? addresses.find((a) => a.id === customer?.defaultAddressId) ?? addresses[0];

  const suggestions = useMemo(() => {
    const inCart = new Set(items.map((i) => i.product.id));
    return products
      .filter((p) => !inCart.has(p.id) && p.stock > 0 && p.price <= 60 && p.categoryId !== 'combos')
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);
  }, [products, items]);

  const applyCoupon = (code: string) => {
    const c = coupons.find((x) => x.code === code);
    const chk = checkCoupon(c, bill.itemTotal);
    if (!chk.ok) {
      toast.error(chk.reason ?? 'That code does not work');
      return;
    }
    cart.applyCoupon(code);
    setCouponOpen(false);
    setCelebrate((n) => n + 1);
    navigator.vibrate?.([10, 40, 10]);
    toast({ title: `${code} applied`, body: `You saved ${inr(chk.discount)} 🎉`, tone: 'success', emoji: '🥳' });
  };

  const removeLine = (id: string, name: string) => {
    const qty = cart.remove(id);
    toast({
      title: `Removed ${name}`,
      emoji: '🗑️',
      action: { label: 'Undo', onClick: () => cart.setQty(id, qty) }
    });
  };

  const fixIssues = () => {
    issues.forEach((i) => {
      if (!i.product.active || i.product.stock <= 0) cart.remove(i.product.id);
      else cart.setQty(i.product.id, i.product.stock);
    });
    toast({ title: 'Cart updated to what’s in stock', emoji: '🧹' });
  };

  let blocker: { label: string; action?: () => void } | null = null;
  if (!userId) blocker = { label: 'Log in to place order', action: () => nav('/login', { state: { from: loc.pathname } }) };
  else if (customer?.blocked) blocker = { label: 'Account blocked · contact support', action: () => nav('/help') };
  else if (!status.isOpen)
    blocker = { label: status.manual || status.msToChange == null ? 'Store is closed right now' : `Store opens in ${fmtDuration(status.msToChange)}` };
  else if (!address) blocker = { label: 'Add a delivery room', action: () => setAddrOpen(true) };
  else if (issues.length) blocker = { label: 'Fix unavailable items', action: fixIssues };
  else if (bill.itemTotal < settings.minOrderValue) blocker = { label: `Add ${inr(settings.minOrderValue - bill.itemTotal)} more to order` };

  const toggleNote = (n: string) => {
    const parts = cart.instructions.split('. ').map((s) => s.trim()).filter(Boolean);
    const next = parts.includes(n) ? parts.filter((p) => p !== n) : [...parts, n];
    cart.setInstructions(next.join('. '));
  };

  if (!loading && count === 0)
    return (
      <Page>
        <PageHeader title="Your cart" />
        <EmptyState
          emoji="🛒"
          title="Your cart is feeling light"
          body="Nothing in here yet. The Maggi isn't going to order itself."
          action={<Button variant="primary" size="lg" onClick={() => nav('/')}>Start shopping</Button>}
        />
        <ProductRail title="Popular right now" products={suggestions} />
      </Page>
    );

  return (
    <Page>
      <PageHeader title="Your cart" sub={`${count} item${count === 1 ? '' : 's'} · ${settings.etaMin}–${settings.etaMax} min delivery`} />
      <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:items-start md:gap-5 md:space-y-0">
        <div className="space-y-3">
          <MinOrderBar total={bill.itemTotal} min={settings.minOrderValue} />

          {!status.isOpen && (
            <div className="flex items-start gap-3 rounded-card border border-pink/30 bg-pink/10 p-4 text-sm">
              <span className="text-2xl" aria-hidden>🌙</span>
              <p>
                <b>We're closed.</b> Your cart is saved. Ordering opens at {hmLabel(settings.openTime)}
                {status.msToChange != null && !status.manual && <> (in {fmtDuration(status.msToChange)})</>}.
              </p>
            </div>
          )}

          {issues.length > 0 && (
            <div className="flex items-center gap-3 rounded-card border border-amber/40 bg-amber/10 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber" />
              <p className="flex-1">Some items sold out or have less stock than you picked.</p>
              <Button size="sm" onClick={fixIssues}>Fix</Button>
            </div>
          )}

          <Section flush>
            <ul className="divide-y divide-line/50">
              <AnimatePresence initial={false}>
                {items.map(({ product: p, qty }) => {
                  const out = !p.active || p.stock <= 0;
                  const over = !out && qty > p.stock;
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                      className="overflow-hidden"
                      data-fly-src
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        <button onClick={() => openProduct(p.id)} className="h-16 w-16 shrink-0 rounded-2xl p-1.5" style={{ background: `${p.color}22` }} aria-label={`View ${p.name}`}>
                          <div data-fly-img className={cn('h-full w-full', out && 'opacity-40 grayscale')}><PackShot product={p} /></div>
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[14px] font-semibold leading-tight">{p.name}</p>
                          <p className="text-[12px] text-muted">{p.unit}</p>
                          {out && <p className="text-[12px] font-semibold text-pink">Out of stock</p>}
                          {over && <p className="text-[12px] font-semibold text-amber">Only {p.stock} left</p>}
                          <p className="price mt-0.5 text-[14px] font-bold">
                            {inr(p.price * qty)}
                            {p.mrp > p.price && <span className="ml-1.5 text-[12px] font-normal text-muted line-through">{inr(p.mrp * qty)}</span>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {out ? (
                            <IconButton label={`Remove ${p.name}`} onClick={() => removeLine(p.id, p.name)}>
                              <Trash2 className="h-4 w-4 text-pink" />
                            </IconButton>
                          ) : (
                            <>
                              <AddStepper
                                size="sm"
                                qty={qty}
                                name={p.name}
                                atMax={qty >= p.stock}
                                onAdd={(e) => addToCart(p, e)}
                                onInc={(e) => addToCart(p, e)}
                                onDec={() => (qty === 1 ? removeLine(p.id, p.name) : cart.dec(p.id))}
                              />
                              <button onClick={() => removeLine(p.id, p.name)} className="hit text-[12px] font-semibold text-muted hover:text-pink">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
            <Link to="/" className="flex items-center gap-2 border-t border-line/50 px-4 py-3 text-sm font-semibold text-violet">
              <Plus className="h-4 w-4" /> Add more items
            </Link>
          </Section>

          <div className="-mx-4 md:mx-0">
            <ProductRail title="Complete the midnight feast" products={suggestions} />
          </div>

          <Section className="relative">
            {celebrate > 0 && <Confetti key={celebrate} seed={celebrate} />}
            {coupon && couponCheck?.ok ? (
              <motion.div key={celebrate} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/15 text-lime"><Tag className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">'{coupon.code}' applied</p>
                  <p className="text-sm text-lime">You save {inr(couponCheck.discount)} on this order</p>
                </div>
                <IconButton label="Remove coupon" onClick={() => { cart.applyCoupon(null); toast({ title: 'Coupon removed', emoji: '🏷️' }); }}>
                  <X className="h-4 w-4" />
                </IconButton>
              </motion.div>
            ) : (
              <button onClick={() => setCouponOpen(true)} className="flex w-full items-center gap-3 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet/15 text-violet"><TicketPercent className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Apply coupon</span>
                  <span className="block text-sm text-muted">
                    {coupon && couponCheck && !couponCheck.ok ? <span className="text-amber">{coupon.code}: {couponCheck.reason}</span> : 'Save more on tonight’s order'}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-muted" />
              </button>
            )}
          </Section>

          <Section title={<span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-muted" /> Delivery instructions</span>}>
            <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
              {QUICK_NOTES.map((n) => (
                <button key={n} className="chip" aria-pressed={cart.instructions.includes(n)} onClick={() => toggleNote(n)}>{n}</button>
              ))}
            </div>
            <Textarea
              aria-label="Delivery instructions"
              placeholder="Anything the rider should know? e.g. I'm in the common room"
              maxLength={160}
              value={cart.instructions}
              onChange={(e) => cart.setInstructions(e.target.value)}
              rows={2}
            />
          </Section>
        </div>

        <div className="space-y-3 md:sticky md:top-24">
          <Section>
            {userId ? (
              <button onClick={() => setAddrOpen(true)} className="flex w-full items-center gap-3 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan"><MapPin className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold uppercase tracking-wider text-muted">Delivering to</span>
                  <span className="block truncate font-bold">{address ? addressLine(address, settings.hostels) : 'Add your room'}</span>
                </span>
                <span className="text-sm font-semibold text-violet">{address ? 'Change' : 'Add'}</span>
              </button>
            ) : (
              <p className="text-sm text-muted">Log in to choose where we deliver.</p>
            )}
          </Section>

          <Section title="Bill details">
            <BillSummary bill={bill} />
          </Section>

          <Section>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><QrCode className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Pay via UPI QR</p>
                <p className="text-[13px] text-muted">Scan our QR code at checkout to pay instantly. Your order is placed once payment is done.</p>
              </div>
            </div>
          </Section>

          <p className="px-1 text-[12px] text-muted">
            You can cancel within {APP.cancelWindowSeconds} seconds of placing the order. Items are packaged and sealed, prices include taxes.
          </p>

          <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/60 px-4 py-3 md:static md:rounded-card md:border md:bg-surface md:p-4">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="shrink-0 leading-tight">
                <p className="price font-display text-2xl font-extrabold">{inr(bill.grandTotal)}</p>
                <p className="text-[12px] text-muted">Total to pay</p>
              </div>
              {blocker ? (
                <Button size="lg" block variant={blocker.action ? 'violet' : 'secondary'} disabled={!blocker.action} onClick={blocker.action} className="min-w-0 text-[15px]">
                  <span className="truncate">{blocker.label}</span>
                </Button>
              ) : (
                <Button size="lg" block variant="primary" onClick={() => nav('/checkout')} iconRight={<ChevronRight className="h-5 w-5" />}>
                  Proceed to checkout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CouponSheet open={couponOpen} onClose={() => setCouponOpen(false)} coupons={coupons} itemTotal={bill.itemTotal} onApply={applyCoupon} />
      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} addresses={addresses} selected={address?.id} onSelect={cart.setAddress} />
    </Page>
  );
}
