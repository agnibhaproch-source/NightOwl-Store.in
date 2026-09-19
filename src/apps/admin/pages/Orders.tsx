import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Bike, Check, Clock, FlaskConical, LayoutGrid, List, MessageSquareText, Printer, Search } from 'lucide-react';
import { useCustomers, useOrders, useProducts, useSettings } from '@/shared/hooks/live';
import { useNow } from '@/shared/hooks/misc';
import { Badge, Button, EmptyState, Segmented, Select, Skeleton } from '@/shared/ui';
import { DAY, latestNight } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime, fmtTime, inr, timeAgo, toDateInput } from '@/shared/lib/format';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { mulberry32 } from '@/shared/lib/format';
import { STATUS_LABEL, isPaid, type Order, type OrderStatus } from '@/shared/types';
import { useAdminUi } from '../store/ui';
import { PageTitle, Panel } from '../components/Layout';
import { NEXT_LABEL, awaitingPayment, markPaid, moveOrder, nextStatus, printSlip, rejectOrder } from '../components/orderActions';
import { STATUS_TONE } from '../components/OrderDrawer';

type Range = 'tonight' | 'week' | 'all' | 'date';
const COLUMNS: { key: OrderStatus; title: string; accent: string }[] = [
  { key: 'placed', title: 'New', accent: 'bg-amber' },
  { key: 'accepted', title: 'Accepted', accent: 'bg-violet' },
  { key: 'packing', title: 'Packing', accent: 'bg-violet' },
  { key: 'out_for_delivery', title: 'Out for delivery', accent: 'bg-cyan' },
  { key: 'delivered', title: 'Delivered', accent: 'bg-lime' },
  { key: 'cancelled', title: 'Cancelled', accent: 'bg-pink' }
];

function OrderCard({ o, now, hostel }: { o: Order; now: number; hostel: string }) {
  const openOrder = useAdminUi((s) => s.openOrder);
  const [settings] = useSettings();
  const next = nextStatus(o.status);
  const unpaid = awaitingPayment(o);
  const canAssign = !unpaid && (o.status === 'accepted' || o.status === 'packing');
  const waiting = now - o.createdAt;
  const urgent = o.status === 'placed' && waiting > 3 * 60_000;
  const live = o.status !== 'delivered' && o.status !== 'cancelled';
  const qty = o.items.reduce((a, i) => a + i.qty, 0);
  return (
    <motion.article
      layout
      layoutId={`card-${o.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      draggable={live}
      onDragStartCapture={(e: React.DragEvent) => {
        e.dataTransfer.setData('text/order', o.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'group rounded-2xl border bg-surface p-3 shadow-soft',
        live && 'cursor-grab active:cursor-grabbing',
        urgent ? 'border-pink/60' : 'border-line/70',
        o.status === 'placed' && 'ring-1 ring-amber/30'
      )}
    >
      <button onClick={() => openOrder(o.id)} className="block w-full text-left" aria-label={`Open order ${o.id}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[17px] font-extrabold">#{o.id}</span>
          <span className="rounded-md bg-violet/15 px-1.5 py-0.5 font-display text-[12px] font-extrabold tracking-[0.15em] text-violet">{o.shortCode}</span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider', isPaid(o) ? 'bg-lime/15 text-lime' : 'bg-amber/20 text-amber')}>{isPaid(o) ? 'Paid' : 'Unpaid'}</span>
          <span className={cn('flex items-center gap-1 text-[12px] font-semibold', urgent ? 'text-pink' : 'text-muted')}>
            <Clock className="h-3 w-3" /> {live ? timeAgo(o.createdAt, now) : fmtTime(o.updatedAt)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold">{o.customerName}</p>
        <p className="font-display text-[15px] font-bold text-cyan">{hostel} · {o.address.block}-{o.address.room}</p>
        <p className="mt-1 line-clamp-2 text-[12px] text-muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
        {(o.status === 'accepted' || o.status === 'packing' || o.status === 'out_for_delivery') && (
          <p className={cn('mt-1.5 flex items-center gap-1 text-[12px] font-semibold', o.rider ? 'text-cyan' : 'text-amber')}><Bike className="h-3 w-3" /> {o.rider ? `${o.rider.name}${o.arrivedAt ? ' · at the door' : ''}` : 'No rider yet'}</p>
        )}
        {o.instructions && (
          <p className="mt-1.5 flex items-start gap-1 text-[12px] text-amber"><MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" /> <span className="line-clamp-1">{o.instructions}</span></p>
        )}
        {o.status === 'cancelled' && o.cancelReason && <p className="mt-1 line-clamp-1 text-[12px] text-pink">{o.cancelReason}</p>}
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span className="text-muted">{qty} item{qty > 1 ? 's' : ''}{o.bill.couponCode ? ` · ${o.bill.couponCode}` : ''}</span>
          <span className="price font-bold">{inr(o.bill.grandTotal)}</span>
        </div>
      </button>
      {live && (
        <div className="mt-2.5 flex gap-1.5">
          {o.status === 'placed' && (
            <button onClick={() => rejectOrder(o)} aria-label={`Reject order ${o.id}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-pink hover:bg-pink/10">
              <Ban className="h-4 w-4" />
            </button>
          )}
          {o.status === 'accepted' && (
            <button onClick={() => printSlip(o, settings)} aria-label={`Print slip for ${o.id}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line hover:bg-surface2">
              <Printer className="h-4 w-4" />
            </button>
          )}
          {canAssign && (
            <button onClick={() => useAdminUi.getState().openAssign(o.id)} aria-label={`${o.riderId ? 'Change' : 'Assign'} rider for ${o.id}`} className={cn('grid h-10 shrink-0 place-items-center rounded-xl border px-2.5', o.riderId ? 'border-line hover:bg-surface2' : 'border-amber/60 text-amber hover:bg-amber/10')}>
              <Bike className="h-4 w-4" />
            </button>
          )}
          {unpaid ? (
            <Button size="sm" block variant="primary" className="h-10" icon={<Check className="h-4 w-4" />} onClick={() => markPaid(o)}>
              Confirm payment {inr(o.bill.grandTotal)}
            </Button>
          ) : (
            next && (
              <Button size="sm" block variant={o.status === 'placed' ? 'primary' : 'secondary'} className="h-10" icon={<Check className="h-4 w-4" />} onClick={() => moveOrder(o, next)}>
                {NEXT_LABEL[o.status]}
              </Button>
            )
          )}
        </div>
      )}
    </motion.article>
  );
}

function Column({ col, orders, now, hostelShort, dim }: { col: (typeof COLUMNS)[number]; orders: Order[]; now: number; hostelShort: (id: string) => string; dim?: boolean }) {
  const [over, setOver] = useState(false);
  const all = useOrders()[0];
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/order');
    const o = all.find((x) => x.id === id);
    if (o) void moveOrder(o, col.key);
  };
  return (
    <section
      aria-label={`${col.title}, ${orders.length} orders`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/order')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={onDrop}
      className={cn(
        'flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-3xl border p-2.5 transition-colors sm:w-[280px]',
        over ? 'border-violet bg-violet/10' : 'border-line/50 bg-surface2/30',
        dim && 'opacity-80'
      )}
    >
      <header className="mb-2 flex items-center gap-2 px-1.5 pt-1">
        <span className={cn('h-2.5 w-2.5 rounded-full', col.accent)} />
        <h2 className="flex-1 text-sm font-bold">{col.title}</h2>
        <motion.span key={orders.length} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="grid h-6 min-w-6 place-items-center rounded-full bg-surface px-2 text-[12px] font-bold">
          {orders.length}
        </motion.span>
      </header>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto pb-1 lg:max-h-[calc(100dvh-260px)]" data-lenis-prevent>
        <AnimatePresence initial={false}>
          {orders.map((o) => <OrderCard key={o.id} o={o} now={now} hostel={hostelShort(o.address.hostelId)} />)}
        </AnimatePresence>
        {!orders.length && (
          <p className={cn('grid flex-1 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-[13px] text-muted', over ? 'border-violet' : 'border-line/50')}>
            {over ? 'Drop to move here' : col.key === 'placed' ? 'No new orders. Chime will ring.' : 'Nothing here'}
          </p>
        )}
      </div>
    </section>
  );
}

export default function Orders() {
  const [orders, loading] = useOrders();
  const [settings] = useSettings();
  const [products] = useProducts();
  const [customers] = useCustomers();
  const openOrder = useAdminUi((s) => s.openOrder);
  const now = useNow(15_000);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [q, setQ] = useState('');
  const [range, setRange] = useState<Range>('tonight');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [hostel, setHostel] = useState('all');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [simulating, setSimulating] = useState(false);

  const hostelShort = (id: string) => settings.hostels.find((h) => h.id === id)?.short ?? '?';

  const filtered = useMemo(() => {
    const [start] = latestNight(now, settings);
    const t = q.trim().toLowerCase().replace(/^#/, '');
    return orders
      .filter((o) => {
        if (o.cancelReason === 'Payment not completed') return false;
        const live = o.status !== 'delivered' && o.status !== 'cancelled';
        if (range === 'tonight' && !live && o.createdAt < start) return false;
        if (range === 'week' && o.createdAt < start - 6 * DAY) return false;
        if (range === 'date') {
          const d = new Date(`${date}T12:00:00`);
          const a = new Date(d);
          a.setHours(12, 0, 0, 0);
          if (o.createdAt < a.getTime() || o.createdAt >= a.getTime() + DAY) return false;
        }
        if (hostel !== 'all' && o.address.hostelId !== hostel) return false;
        if (view === 'list' && status !== 'all' && o.status !== status) return false;
        if (t && !(o.id.toLowerCase().includes(t) || o.shortCode.includes(t) || o.customerName.toLowerCase().includes(t) || o.phone.includes(t) || o.address.room.includes(t))) return false;
        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [orders, q, range, date, hostel, status, view, now, settings]);

  const simulate = async () => {
    setSimulating(true);
    try {
      const r = mulberry32(Date.now() % 100000);
      const active = customers.filter((c) => !c.blocked && c.addresses.length);
      const cust = active[Math.floor(r() * active.length)]!;
      const pool = products.filter((p) => p.active && p.stock > 2 && p.categoryId !== 'combos');
      const n = 1 + Math.floor(r() * 3);
      const items = Array.from({ length: n }, () => pool[Math.floor(r() * pool.length)]!)
        .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
        .map((p) => ({ productId: p.id, qty: 1 + Math.floor(r() * 2) }));
      await services.orders.placeOrder({ userId: cust.id, addressId: cust.defaultAddressId ?? cust.addresses[0]!.id, items, instructions: r() > 0.6 ? 'Call when you reach' : '' });
    } catch (e) {
      toast.error('Test order failed', errorMessage(e));
    } finally {
      setSimulating(false);
    }
  };

  const byStatus = (s: OrderStatus) => {
    const list = filtered.filter((o) => o.status === s);
    return s === 'delivered' || s === 'cancelled' ? list.reverse() : list;
  };

  return (
    <>
      <PageTitle
        title="Live orders"
        sub="Drag cards between columns or use the buttons. Customers see every change instantly."
        actions={
          <>
            <Button icon={<FlaskConical className="h-4 w-4" />} loading={simulating} onClick={simulate} title="Places a random order from a demo customer">
              Test order
            </Button>
            <Segmented
              label="View"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'board', label: <><LayoutGrid className="h-4 w-4" /> Board</> },
                { value: 'list', label: <><List className="h-4 w-4" /> List</> }
              ]}
            />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="field pl-10" placeholder="Order ID, name, phone or room" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)} className="w-40">
          <option value="tonight">Tonight + live</option>
          <option value="week">Last 7 nights</option>
          <option value="all">All time</option>
          <option value="date">Pick a night…</option>
        </Select>
        {range === 'date' && <input type="date" aria-label="Night of" className="field w-44" value={date} onChange={(e) => setDate(e.target.value)} />}
        <Select aria-label="Hostel" value={hostel} onChange={(e) => setHostel(e.target.value)} className="w-40">
          <option value="all">All hostels</option>
          {settings.hostels.map((h) => <option key={h.id} value={h.id}>{h.short} · {h.name}</option>)}
        </Select>
        {view === 'list' && (
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')} className="w-44">
            <option value="all">Any status</option>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{STATUS_LABEL[c.key]}</option>)}
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 w-[280px] shrink-0 rounded-3xl" />)}</div>
      ) : view === 'board' ? (
        <div className="no-scrollbar -mx-3 flex snap-x scroll-px-3 gap-3 overflow-x-auto px-3 pb-4 md:-mx-6 md:scroll-px-6 md:px-6" data-lenis-prevent>
          {COLUMNS.map((c) => (
            <Column key={c.key} col={c} orders={byStatus(c.key)} now={now} hostelShort={hostelShort} dim={c.key === 'delivered' || c.key === 'cancelled'} />
          ))}
        </div>
      ) : (
        <Panel flush>
          {!filtered.length ? (
            <EmptyState emoji="🧾" title="No orders match" />
          ) : (
            <div className="overflow-x-auto" data-lenis-prevent>
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                  <tr className="border-b border-line/60">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Placed</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Room</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {[...filtered].reverse().slice(0, 300).map((o) => (
                    <tr key={o.id} onClick={() => openOrder(o.id)} className="cursor-pointer hover:bg-surface2/60">
                      <td className="px-4 py-3 font-bold">
                        <button onClick={(e) => { e.stopPropagation(); openOrder(o.id); }} className="hover:underline">#{o.id}</button>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-md bg-violet/15 px-1.5 py-0.5 font-display text-[12px] font-extrabold tracking-[0.15em] text-violet">{o.shortCode}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDateTime(o.createdAt)}</td>
                      <td className="px-4 py-3">{o.customerName}<span className="block text-[12px] text-muted">{o.phone}</span></td>
                      <td className="whitespace-nowrap px-4 py-3">{hostelShort(o.address.hostelId)} · {o.address.block}-{o.address.room}</td>
                      <td className="px-4 py-3 text-muted">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                      <td className="price px-4 py-3 text-right font-semibold">{inr(o.bill.grandTotal)}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 300 && <p className="p-3 text-center text-[12px] text-muted">Showing latest 300. Narrow the filters to see more.</p>}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
