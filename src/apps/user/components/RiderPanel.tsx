import { useEffect, useState } from 'react';
import { BadgeCheck, Bike, Copy, Footprints, Phone, Send } from 'lucide-react';
import { Button } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { cn } from '@/shared/lib/cn';
import { initials, timeAgo } from '@/shared/lib/format';
import type { Order } from '@/shared/types';
import { Section } from './Page';

const QUICK = ['Please call me when you arrive', 'I’m at the hostel gate', 'Ring the bell twice', 'Come to the common room'];

/** Blinkit-style delivery block: who is bringing the order, the code to read out at the door, and a line to the rider. */
export function RiderPanel({ order }: { order: Order }) {
  const [code, setCode] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const rider = order.rider;

  useEffect(() => {
    let alive = true;
    void services.orders.getDeliveryCode(order.id).then((c) => alive && setCode(c));
    return () => {
      alive = false;
    };
  }, [order.id]);

  if (!rider) return null;

  const where = order.arrivedAt ? 'At your door' : order.status === 'out_for_delivery' ? 'On the way to you' : 'Heading to the store';
  const send = async (text: string) => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await services.orders.sendMessage(order.id, 'user', text);
      setMsg('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Section title="Your delivery partner">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet font-display text-xl font-extrabold text-white">{initials(rider.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-display text-lg font-extrabold">{rider.name} <BadgeCheck className="h-4 w-4 shrink-0 text-lime" aria-label="Verified by the store" /></p>
          <p className="flex items-center gap-1.5 text-[13px] text-muted capitalize">
            {rider.vehicle === 'walk' ? <Footprints className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
            {rider.vehicle === 'walk' ? 'On foot' : rider.vehicle}{rider.vehicleNumber ? ` · ${rider.vehicleNumber}` : ''}
          </p>
          <p className={cn('text-[13px] font-semibold', order.arrivedAt ? 'text-lime' : 'text-cyan')}>{where}</p>
        </div>
        <a href={`tel:+91${rider.phone}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime text-black" aria-label={`Call ${rider.name}`}>
          <Phone className="h-5 w-5" />
        </a>
      </div>

      {code && (
        <div className="mt-4 rounded-2xl border border-violet/40 bg-violet/10 p-4 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-violet">Delivery code</p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              toast({ title: 'Code copied', emoji: '📋', duration: 1200 });
            }}
            className="price my-1 inline-flex items-center gap-3 font-display text-5xl font-extrabold tracking-[0.3em] text-violet"
            aria-label={`Delivery code ${code.split('').join(' ')}. Tap to copy`}
          >
            {code} <Copy className="h-4 w-4 opacity-60" />
          </button>
          <p className="text-[12px] text-muted">Read this out to {rider.name.split(' ')[0]} only when your order is in your hands. Don’t share it before that.</p>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-sm font-bold">Tell {rider.name.split(' ')[0]} anything</p>
        {!!order.messages?.length && (
          <ul className="mb-3 space-y-1.5">
            {order.messages.slice(-6).map((m) => (
              <li key={m.id} className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.from === 'user' ? 'ml-auto bg-violet text-white' : 'bg-surface2')}>
                <span className="block text-[11px] opacity-70">{m.from === 'user' ? 'You' : rider.name.split(' ')[0]} · {timeAgo(m.at)}</span>
                {m.text}
              </li>
            ))}
          </ul>
        )}
        <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {QUICK.map((q) => <button key={q} className="chip shrink-0" disabled={sending} onClick={() => send(q)}>{q}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(msg); }} className="flex gap-2">
          <input className="field flex-1" placeholder="Write an instruction" aria-label="Instruction for your rider" maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <Button type="submit" aria-label="Send instruction" loading={sending} disabled={!msg.trim()} icon={<Send className="h-4 w-4" />} />
        </form>
      </div>
    </Section>
  );
}
