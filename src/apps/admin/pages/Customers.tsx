import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Download, Search, Send, ShieldOff } from 'lucide-react';
import { useCustomers, useOrders, useSettings } from '@/shared/hooks/live';
import { Badge, Button, Drawer, EmptyState, PackShot, Segmented, Select, Skeleton, Stars } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { normalize } from '@/shared/lib/search';
import { fmtDate, fmtDateTime, initials, inr, timeAgo, uid } from '@/shared/lib/format';
import { toCSV, downloadFile } from '@/shared/lib/files';
import { cn } from '@/shared/lib/cn';
import type { Customer } from '@/shared/types';
import { STATUS_LABEL } from '@/shared/types';
import { useAdminUi } from '../store/ui';
import { PageTitle, Panel } from '../components/Layout';
import { STATUS_TONE } from '../components/OrderDrawer';

type F = 'all' | 'active' | 'blocked';
type Sort = 'spend' | 'orders' | 'recent' | 'new';

export default function Customers() {
  const [customers, loading] = useCustomers();
  const [orders] = useOrders();
  const [settings] = useSettings();
  const openOrder = useAdminUi((s) => s.openOrder);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<F>('all');
  const [sort, setSort] = useState<Sort>('spend');
  const [open, setOpen] = useState<string | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { orders: number; spend: number; last: number; cancelled: number; rating: number; rated: number }>();
    orders.forEach((o) => {
      const s = m.get(o.userId) ?? { orders: 0, spend: 0, last: 0, cancelled: 0, rating: 0, rated: 0 };
      if (o.status === 'cancelled') s.cancelled++;
      else {
        s.orders++;
        s.spend += o.bill.grandTotal;
      }
      if (o.rating) {
        s.rating += o.rating.order;
        s.rated++;
      }
      s.last = Math.max(s.last, o.createdAt);
      m.set(o.userId, s);
    });
    return m;
  }, [orders]);

  const empty = { orders: 0, spend: 0, last: 0, cancelled: 0, rating: 0, rated: 0 };
  const list = useMemo(() => {
    const t = normalize(q);
    const out = customers.filter((c) => {
      if (filter === 'blocked' && !c.blocked) return false;
      if (filter === 'active' && c.blocked) return false;
      if (t && !normalize(`${c.name} ${c.phone}`).includes(t) && !c.addresses.some((a) => a.room.includes(t))) return false;
      return true;
    });
    const s = (c: Customer) => stats.get(c.id) ?? empty;
    const cmp: Record<Sort, (a: Customer, b: Customer) => number> = {
      spend: (a, b) => s(b).spend - s(a).spend,
      orders: (a, b) => s(b).orders - s(a).orders,
      recent: (a, b) => s(b).last - s(a).last,
      new: (a, b) => b.joinedAt - a.joinedAt
    };
    return out.sort(cmp[sort]);
  }, [customers, q, filter, sort, stats]);

  const detail = customers.find((c) => c.id === open);
  const detailOrders = orders.filter((o) => o.userId === open).sort((a, b) => b.createdAt - a.createdAt);
  const d = detail ? stats.get(detail.id) ?? empty : empty;

  const toggleBlock = async (c: Customer) => {
    if (!c.blocked) {
      const { ok } = await confirmDialog({
        title: `Block ${c.name}?`,
        body: 'They can browse but can’t place orders. Use this for repeated no-shows or abuse.',
        confirmLabel: 'Block customer',
        tone: 'danger'
      });
      if (!ok) return;
    }
    try {
      await services.customers.setBlocked(c.id, !c.blocked);
      toast({ title: c.blocked ? `${c.name} unblocked` : `${c.name} blocked`, emoji: c.blocked ? '✅' : '🚫' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const ping = async (c: Customer) => {
    const { ok, value } = await confirmDialog({
      title: `Message ${c.name}`,
      body: 'Sends an in-app notification to this customer only.',
      confirmLabel: 'Send',
      input: { label: 'Message', placeholder: 'Your order is at the gate', required: true }
    });
    if (!ok) return;
    await services.notifications.push({ id: uid('dm'), type: 'broadcast', title: 'Message from the store', body: value.trim(), at: Date.now(), audience: { kind: 'user', userId: c.id } });
    toast.success('Message sent');
  };

  const exportCsv = () =>
    downloadFile(
      `nightowl-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      toCSV(list.map((c) => {
        const s = stats.get(c.id) ?? empty;
        return {
          name: c.name, phone: c.phone, joined: fmtDate(c.joinedAt), rooms: c.addresses.length,
          orders: s.orders, cancelled: s.cancelled, spend: s.spend, avg_order: s.orders ? Math.round(s.spend / s.orders) : 0,
          last_order: s.last ? fmtDate(s.last) : '', blocked: c.blocked
        };
      })),
      'text/csv'
    );

  return (
    <>
      <PageTitle
        title="Customers"
        sub={`${customers.length} signed up · ${customers.filter((c) => c.blocked).length} blocked`}
        actions={<Button icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export CSV</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="field pl-10" placeholder="Name, phone or room" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'blocked', label: 'Blocked', count: customers.filter((c) => c.blocked).length }
          ]}
        />
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44">
          <option value="spend">Top spenders</option>
          <option value="orders">Most orders</option>
          <option value="recent">Recently ordered</option>
          <option value="new">Newest</option>
        </Select>
      </div>

      <Panel flush>
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !list.length ? (
          <EmptyState emoji="🧍" title="No customers match" />
        ) : (
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line/60">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Rooms</th>
                  <th className="px-3 py-3 text-right font-semibold">Orders</th>
                  <th className="px-3 py-3 text-right font-semibold">Spend</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg</th>
                  <th className="px-3 py-3 font-semibold">Last order</th>
                  <th className="px-3 py-3 font-semibold">Rating</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {list.map((c) => {
                  const s = stats.get(c.id) ?? empty;
                  return (
                    <tr key={c.id} className={cn('hover:bg-surface2/40', c.blocked && 'opacity-60')}>
                      <td className="px-4 py-2">
                        <button onClick={() => setOpen(c.id)} className="flex items-center gap-3 text-left">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-[13px] font-bold text-violet">{initials(c.name)}</span>
                          <span>
                            <span className="flex items-center gap-2 font-semibold hover:underline">{c.name} {c.blocked && <Badge tone="pink">Blocked</Badge>}</span>
                            <span className="text-[12px] text-muted">{c.phone} · joined {fmtDate(c.joinedAt)}</span>
                          </span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">
                        {c.addresses.map((a) => `${settings.hostels.find((h) => h.id === a.hostelId)?.short ?? '?'}-${a.room}`).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{s.orders}{s.cancelled ? <span className="text-pink"> +{s.cancelled}✕</span> : null}</td>
                      <td className="price px-3 py-2 text-right font-semibold">{inr(s.spend)}</td>
                      <td className="price px-3 py-2 text-right text-muted">{s.orders ? inr(Math.round(s.spend / s.orders)) : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{s.last ? timeAgo(s.last) : 'never'}</td>
                      <td className="px-3 py-2">{s.rated ? <span className="flex items-center gap-1">{(s.rating / s.rated).toFixed(1)} <Stars value={Math.round(s.rating / s.rated)} size={12} /></span> : <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <Button size="sm" variant={c.blocked ? 'secondary' : 'outline'} className={c.blocked ? '' : 'text-pink'} onClick={() => toggleBlock(c)} icon={c.blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}>
                          {c.blocked ? 'Unblock' : 'Block'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Drawer open={!!detail} onClose={() => setOpen(null)} title={detail?.name ?? 'Customer'}>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet font-display text-xl font-extrabold text-white">{initials(detail.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{detail.name}</p>
                <p className="text-sm text-muted">+91 {detail.phone} · joined {fmtDate(detail.joinedAt)}</p>
              </div>
              {detail.blocked && <Badge tone="pink">Blocked</Badge>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: 'Orders', v: d.orders },
                { l: 'Spend', v: inr(d.spend) },
                { l: 'Cancelled', v: d.cancelled }
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-surface2/60 py-3">
                  <p className="price font-display text-xl font-extrabold">{x.v}</p>
                  <p className="text-[12px] text-muted">{x.l}</p>
                </div>
              ))}
            </div>
            <section>
              <h3 className="field-label">Saved rooms</h3>
              <ul className="space-y-1 text-sm">
                {detail.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl bg-surface2/50 px-3 py-2">
                    <b>{a.label}</b> · {settings.hostels.find((h) => h.id === a.hostelId)?.name} · Block {a.block} · Room {a.room}
                    {a.id === detail.defaultAddressId && <Badge tone="lime">Default</Badge>}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="field-label">Order history</h3>
              {!detailOrders.length ? (
                <p className="text-sm text-muted">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-line/50 rounded-2xl border border-line/60">
                  {detailOrders.slice(0, 20).map((o) => (
                    <li key={o.id}>
                      <button onClick={() => { setOpen(null); openOrder(o.id); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface2/60">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-bold">#{o.id} <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></span>
                          <span className="block truncate text-[12px] text-muted">{fmtDateTime(o.createdAt)} · {o.items.length} lines</span>
                        </span>
                        <span className="price text-sm font-semibold">{inr(o.bill.grandTotal)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="grid grid-cols-2 gap-2">
              <Button icon={<Send className="h-4 w-4" />} onClick={() => ping(detail)}>Message</Button>
              <Button variant="outline" className={detail.blocked ? '' : 'text-pink'} icon={detail.blocked ? <CheckCircle2 className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />} onClick={() => toggleBlock(detail)}>
                {detail.blocked ? 'Unblock' : 'Block'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
