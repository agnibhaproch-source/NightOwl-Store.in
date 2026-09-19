import { useEffect, useRef } from 'react';
import { LogOut, PackageCheck, Power } from 'lucide-react';
import { Badge, Button, EmptyState, Logo, Switch } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { useRiderOrders } from '@/shared/hooks/live';
import { toast } from '@/shared/store/toast';
import { chime, unlockAudio } from '@/shared/lib/sound';
import { showSystemNotification } from '@/shared/lib/notify';
import { fmtTime, initials } from '@/shared/lib/format';
import type { Rider } from '@/shared/types';
import { DeliveryCard } from '../components/DeliveryCard';

export function Dashboard({ rider }: { rider: Rider }) {
  const [orders, loading] = useRiderOrders(rider.id);
  const known = useRef<Set<string> | null>(null);

  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const done = orders.filter((o) => o.status === 'delivered');
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const today = done.filter((o) => (o.deliveredAt ?? o.updatedAt) >= startOfDay).length;

  useEffect(() => {
    if (loading) return;
    if (!known.current) {
      known.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = active.filter((o) => !known.current!.has(o.id));
    orders.forEach((o) => known.current!.add(o.id));
    fresh.forEach((o) => {
      chime();
      navigator.vibrate?.([120, 60, 120]);
      toast({ title: `New delivery ${o.shortCode}`, body: `${o.address.block}-${o.address.room} · ${o.items.reduce((a, i) => a + i.qty, 0)} items`, emoji: '🛵', duration: 8000 });
      void showSystemNotification(`New delivery ${o.shortCode}`, { body: `Block ${o.address.block}, room ${o.address.room}`, tag: `rider-${o.id}`, url: '/rider' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, loading]);

  const toggle = async (on: boolean) => {
    unlockAudio();
    try {
      await services.riders.setOnline(rider.id, on);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <main id="main" className="safe-top safe-bottom mx-auto min-h-dvh max-w-md px-4 pb-16 pt-5">
      <header className="flex items-center gap-3">
        {rider.photo ? (
          <img src={rider.photo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet font-display text-lg font-extrabold text-white">{initials(rider.name)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold leading-tight">{rider.name}</p>
          <p className="text-[12px] text-muted">{rider.vehicle === 'walk' ? 'On foot' : rider.vehicle}{rider.vehicleNumber ? ` · ${rider.vehicleNumber}` : ''}</p>
        </div>
        <Logo size={32} withText={false} />
      </header>

      <section className="card mt-4 flex items-center gap-3 p-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${rider.online ? 'bg-lime/15 text-lime' : 'bg-surface2 text-muted'}`}><Power className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{rider.online ? 'You’re online' : 'You’re offline'}</p>
          <p className="text-[13px] text-muted">{rider.online ? 'The store can hand you deliveries.' : 'Go online to get deliveries.'}</p>
        </div>
        <Switch label={rider.online ? 'Go offline' : 'Go online'} hideLabel checked={rider.online} onChange={toggle} />
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[{ v: active.length, l: 'Active' }, { v: today, l: 'Today' }, { v: done.length, l: 'All time' }].map((s) => (
          <div key={s.l} className="card py-3"><p className="price font-display text-2xl font-extrabold">{s.v}</p><p className="text-[12px] text-muted">{s.l}</p></div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-extrabold">Your deliveries</h2>
      {!active.length ? (
        <EmptyState emoji="🛵" title={rider.online ? 'Waiting for the next order' : 'No deliveries right now'} body={rider.online ? 'You’ll hear a chime the moment the store assigns you one.' : 'Switch to online above so the store can assign you.'} />
      ) : (
        <div className="space-y-3">{active.map((o) => <DeliveryCard key={o.id} order={o} riderId={rider.id} />)}</div>
      )}

      {!!done.length && (
        <>
          <h2 className="mb-2 mt-8 flex items-center gap-2 text-lg font-extrabold"><PackageCheck className="h-5 w-5 text-lime" /> Recent</h2>
          <ul className="card divide-y divide-line/50">
            {done.slice(0, 15).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="price font-display font-extrabold tracking-[0.15em] text-violet">{o.shortCode}</span>
                <span className="min-w-0 flex-1 truncate">{o.address.block}-{o.address.room}</span>
                <span className="text-muted">{fmtTime(o.deliveredAt ?? o.updatedAt)}</span>
                <Badge tone="lime">Done</Badge>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button block variant="outline" className="mt-8 text-pink" icon={<LogOut className="h-4 w-4" />} onClick={() => void services.riders.logout()}>Sign out</Button>
      <p className="mt-4 text-center text-[12px] text-muted">© {new Date().getFullYear()} NightOwl Rider</p>
    </main>
  );
}
