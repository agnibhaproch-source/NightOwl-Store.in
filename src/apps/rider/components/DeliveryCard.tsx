import { useState } from 'react';
import { Check, CheckCircle2, MapPin, MessageSquareText, Phone, Send, ShieldCheck, Store } from 'lucide-react';
import { Button } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { useSettings } from '@/shared/hooks/live';
import { toast } from '@/shared/store/toast';
import { inr, timeAgo } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Order } from '@/shared/types';

const QUICK = ['On my way', 'I’ve reached', 'Please come down', 'Can’t find the room'];

function Steps({ status, arrived }: { status: Order['status']; arrived: boolean }) {
  const idx = status === 'out_for_delivery' ? (arrived ? 2 : 1) : 0;
  const steps = ['Pick up', 'On the way', 'At the door'];
  return (
    <ol className="flex items-center gap-1.5" aria-label="Delivery progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-1.5">
          <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', i <= idx ? 'bg-lime text-black' : 'bg-surface2 text-muted')}>{i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
          <span className={cn('truncate text-[11px] font-semibold', i <= idx ? 'text-fg' : 'text-muted')}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function DeliveryCard({ order, riderId }: { order: Order; riderId: string }) {
  const [settings] = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const hostel = settings.hostels.find((h) => h.id === order.address.hostelId);
  const who = order.receiver ?? { name: order.customerName, phone: order.phone };
  const out = order.status === 'out_for_delivery';
  const qty = order.items.reduce((a, i) => a + i.qty, 0);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (e) {
      const m = errorMessage(e);
      if (key === 'deliver') setError(m);
      else toast.error(m);
    } finally {
      setBusy(null);
    }
  };

  const send = (text: string) =>
    run('msg', async () => {
      await services.orders.sendMessage(order.id, 'rider', text);
      setMsg('');
    });

  return (
    <article className="card space-y-4 p-4" aria-label={`Delivery ${order.shortCode}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Order code</p>
          <p className="price font-display text-4xl font-extrabold tracking-[0.2em] text-violet">{order.shortCode}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2.5 py-1 text-[12px] font-bold text-lime"><CheckCircle2 className="h-3.5 w-3.5" /> Prepaid, no cash</span>
          <p className="mt-1 text-[12px] text-muted">{qty} item{qty > 1 ? 's' : ''} · {inr(order.bill.grandTotal)}</p>
          {order.assignedAt && <p className="text-[12px] text-muted">Assigned {timeAgo(order.assignedAt)}</p>}
        </div>
      </header>

      <Steps status={order.status} arrived={!!order.arrivedAt} />

      <section className="rounded-2xl bg-surface2/70 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted"><MapPin className="h-3.5 w-3.5" /> Deliver to</p>
        <p className="font-display text-2xl font-extrabold leading-tight">{hostel?.short ?? 'Hostel'} · Block {order.address.block} · Room {order.address.room}</p>
        <p className="text-[13px] text-muted">{hostel?.name}{order.address.label ? ` · ${order.address.label}` : ''}</p>
        <div className="mt-3 flex items-center gap-3 border-t border-line/50 pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted">Receiver</p>
            <p className="truncate font-bold">{who.name}</p>
            <p className="text-sm text-muted">+91 {who.phone}</p>
          </div>
          <a href={`tel:+91${who.phone}`} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-lime px-4 font-bold text-black" aria-label={`Call ${who.name}`}>
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      </section>

      {order.instructions && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber/40 bg-amber/10 p-3 text-sm"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber" /> <span><b>Customer note:</b> {order.instructions}</span></p>
      )}

      <details className="rounded-2xl border border-line/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold">What’s in the bag ({qty})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {order.items.map((i) => <li key={i.productId} className="flex justify-between gap-3"><span className="truncate">{i.qty} × {i.name}</span><span className="text-muted">{i.unit}</span></li>)}
        </ul>
      </details>

      {!!order.messages?.length && (
        <ul className="space-y-1.5" aria-label="Messages">
          {order.messages.slice(-6).map((m) => (
            <li key={m.id} className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.from === 'rider' ? 'ml-auto bg-violet text-white' : 'bg-surface2')}>
              <span className="block text-[11px] opacity-70">{m.from === 'rider' ? 'You' : 'Customer'}</span>{m.text}
            </li>
          ))}
        </ul>
      )}

      {!out ? (
        <div className="space-y-2">
          <p className="flex items-start gap-2 rounded-2xl bg-cyan/10 p-3 text-sm"><Store className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /> Collect the bag from the store. Check its label says <b className="tracking-widest">{order.shortCode}</b> before you leave.</p>
          <Button variant="primary" size="lg" block loading={busy === 'pickup'} onClick={() => run('pickup', () => services.orders.riderPickup(order.id, riderId))}>
            I’ve picked up the parcel
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {!order.arrivedAt && (
            <Button size="lg" block loading={busy === 'arrived'} onClick={() => run('arrived', () => services.orders.riderArrived(order.id, riderId))}>
              I’ve reached the door
            </Button>
          )}
          <div className="rounded-2xl border border-violet/40 bg-violet/5 p-3">
            <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-violet" /> Ask the customer for their delivery code</p>
            <p className="mb-3 text-[12px] text-muted">They read it from their order screen. Hand over the bag only after the code is accepted.</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • •"
                aria-label="Customer delivery code"
                className="field w-32 text-center font-display text-2xl font-extrabold tracking-[0.35em]"
              />
              <Button variant="primary" size="lg" block loading={busy === 'deliver'} disabled={code.length !== 4} onClick={() => run('deliver', () => services.orders.riderDeliver(order.id, riderId, code))}>
                Confirm delivery
              </Button>
            </div>
            <p className="mt-2 min-h-[18px] text-sm text-pink" role="alert">{error}</p>
          </div>
        </div>
      )}

      <div>
        <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {QUICK.map((q) => <button key={q} className="chip shrink-0" disabled={busy === 'msg'} onClick={() => send(q)}>{q}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) void send(msg); }} className="flex gap-2">
          <input className="field flex-1" placeholder="Message the customer" aria-label="Message the customer" maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <Button type="submit" aria-label="Send message" disabled={!msg.trim()} icon={<Send className="h-4 w-4" />} />
        </form>
      </div>
    </article>
  );
}
