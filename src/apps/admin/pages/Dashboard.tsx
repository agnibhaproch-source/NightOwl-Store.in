import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, Clock, IndianRupee, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCategories, useOrders, useProducts } from '@/shared/hooks/live';
import { useStoreStatus } from '@/shared/hooks/misc';
import { DAY, fmtDuration, hourBuckets, latestNight } from '@/shared/lib/time';
import { fmtDate, inr, timeAgo } from '@/shared/lib/format';
import { Badge, EmptyState, NightDial, PackShot, Skeleton } from '@/shared/ui';
import { STATUS_LABEL, isAbandoned, type Order } from '@/shared/types';
import { useAdmin } from '../store/session';
import { useAdminUi } from '../store/ui';
import { PageTitle, Panel } from '../components/Layout';
import { Delta, Kpi, tooltipStyle, useChartColors } from '../components/charts';
import { STATUS_TONE } from '../components/OrderDrawer';

const valid = (o: Order) => o.status !== 'cancelled';
const inRange = (o: Order, a: number, b: number) => o.createdAt >= a && o.createdAt < b;

export default function Dashboard() {
  const [allOrders, oLoading] = useOrders();
  const orders = useMemo(() => allOrders.filter((o) => !isAbandoned(o)), [allOrders]);
  const [products, pLoading] = useProducts();
  const [cats] = useCategories();
  const { status, settings, now } = useStoreStatus(30_000);
  const session = useAdmin((s) => s.session)!;
  const openOrder = useAdminUi((s) => s.openOrder);
  const c = useChartColors();
  const tip = tooltipStyle(c);
  const loading = oLoading || pLoading;

  const data = useMemo(() => {
    const [start, end] = latestNight(now, settings);
    const tonight = orders.filter((o) => inRange(o, start, end));
    const prev = orders.filter((o) => inRange(o, start - DAY, end - DAY));
    const ok = tonight.filter(valid);
    const okPrev = prev.filter(valid);
    const revenue = ok.reduce((a, o) => a + o.bill.grandTotal, 0);
    const revenuePrev = okPrev.reduce((a, o) => a + o.bill.grandTotal, 0);
    const pending = orders.filter((o) => ['placed', 'accepted', 'packing', 'out_for_delivery'].includes(o.status));
    const low = products.filter((p) => p.active && p.stock <= p.lowStockAt).sort((a, b) => a.stock - b.stock);

    const perHour = hourBuckets(start, end).map((h) => ({
      hour: h.label,
      orders: tonight.filter((o) => inRange(o, h.from, h.to)).length,
      cancelled: tonight.filter((o) => inRange(o, h.from, h.to) && !valid(o)).length
    }));

    const lastWeek = orders.filter((o) => valid(o) && o.createdAt >= start - 6 * DAY);
    const qty = new Map<string, { name: string; qty: number; revenue: number }>();
    const catRev = new Map<string, number>();
    const byId = new Map(products.map((p) => [p.id, p]));
    lastWeek.forEach((o) =>
      o.items.forEach((i) => {
        const cur = qty.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += i.qty * i.price;
        qty.set(i.productId, cur);
        const cat = byId.get(i.productId)?.categoryId ?? 'other';
        catRev.set(cat, (catRev.get(cat) ?? 0) + i.qty * i.price);
      })
    );
    const top = [...qty.values()].sort((a, b) => b.qty - a.qty).slice(0, 7).map((t) => ({ ...t, short: t.name.length > 15 ? `${t.name.slice(0, 14)}…` : t.name }));
    const catSplit = [...catRev.entries()]
      .map(([id, v]) => ({ id, name: cats.find((x) => x.id === id)?.name ?? 'Other', value: v, tone: cats.find((x) => x.id === id)?.tone ?? 'violet' }))
      .sort((a, b) => b.value - a.value);

    const trend = Array.from({ length: 7 }, (_, k) => {
      const a = start - (6 - k) * DAY;
      const list = orders.filter((o) => valid(o) && inRange(o, a, a + (end - start)));
      return { night: k === 6 ? 'Tonight' : fmtDate(a), orders: list.length, revenue: list.reduce((s, o) => s + o.bill.grandTotal, 0) };
    });

    return { tonight, ok, prev: okPrev, revenue, revenuePrev, pending, low, perHour, top, catSplit, trend };
  }, [orders, products, cats, now, settings]);

  const hello = (() => {
    const h = new Date(now).getHours();
    return h < 5 || h >= 21 ? 'Good night shift' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const aov = data.ok.length ? data.revenue / data.ok.length : 0;
  const aovPrev = data.prev.length ? data.revenuePrev / data.prev.length : 0;

  return (
    <>
      <PageTitle
        title={`${hello}, ${session.name.split(' ')[0]}`}
        sub={status.isOpen ? `Store is open · closes in ${fmtDuration(status.msToChange ?? 0)}` : `Store is closed${status.msToChange && !status.manual ? ` · opens in ${fmtDuration(status.msToChange)}` : ''}. Numbers below are for ${status.isOpen ? 'tonight' : 'the latest night'}.`}
      />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Orders" value={data.tonight.length} icon={ShoppingBag} tone="violet" sub={<Delta now={data.tonight.length} prev={data.prev.length} />} />
          <Kpi label="Revenue" value={inr(data.revenue)} icon={IndianRupee} tone="lime" delay={0.04} sub={<Delta now={data.revenue} prev={data.revenuePrev} />} />
          <Kpi label="Avg order value" value={inr(aov)} icon={TrendingUp} tone="cyan" delay={0.08} sub={<Delta now={aov} prev={aovPrev} />} />
          <Kpi label="In progress" value={data.pending.length} icon={Clock} tone="amber" delay={0.12} sub={`${data.pending.filter((o) => o.status === 'placed').length} waiting to be accepted`} alert={data.pending.some((o) => o.status === 'placed' && now - o.createdAt > 3 * 60_000)} />
          <Kpi label="Low stock" value={data.low.length} icon={AlertTriangle} tone="pink" delay={0.16} sub={`${data.low.filter((p) => p.stock === 0).length} out of stock`} alert={data.low.length > 0} />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Orders per hour" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.perHour} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="orders" name="Orders" fill={c.violet} radius={[8, 8, 0, 0]} maxBarSize={48} />
                <Bar dataKey="cancelled" name="Cancelled" fill={c.pink} radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Store clock">
          <NightDial status={status} now={now} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
            <Link to="/admin/store" className="rounded-xl bg-surface2/70 py-2 hover:bg-surface2">Mode: <b className="capitalize">{settings.mode}</b></Link>
            <Link to="/admin/orders" className="rounded-xl bg-surface2/70 py-2 hover:bg-surface2">ETA <b>{settings.etaMin}–{settings.etaMax}m</b></Link>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Live queue" action={<Link to="/admin/orders" className="inline-flex items-center text-sm font-semibold text-violet">Kanban <ChevronRight className="h-4 w-4" /></Link>} flush>
          {!data.pending.length ? (
            <EmptyState emoji="😌" title="Queue is clear" body="New orders will chime in here." className="py-8" />
          ) : (
            <ul className="max-h-80 divide-y divide-line/50 overflow-y-auto" data-lenis-prevent>
              {[...data.pending].sort((a, b) => a.createdAt - b.createdAt).map((o) => (
                <li key={o.id}>
                  <button onClick={() => openOrder(o.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2/60">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold">#{o.id} <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></span>
                      <span className="block truncate text-[12px] text-muted">{o.customerName} · {o.items.length} line{o.items.length > 1 ? 's' : ''} · {timeAgo(o.createdAt, now)}</span>
                    </span>
                    <span className="price text-sm font-semibold">{inr(o.bill.grandTotal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Top items · last 7 nights">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.top} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="short" width={112} tickMargin={4} tick={{ fill: c.fg, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} sold`, 'Qty']} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
                <Bar dataKey="qty" radius={[0, 8, 8, 0]} barSize={18}>
                  {data.top.map((_, i) => <Cell key={i} fill={i === 0 ? c.lime : c.cyan} fillOpacity={1 - i * 0.08} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Revenue by category">
          <div className="relative h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.catSplit} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                  {data.catSplit.map((d) => <Cell key={d.id} fill={c[d.tone]} fillOpacity={0.9} />)}
                </Pie>
                <Tooltip {...tip} formatter={(v: number) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="price font-display text-xl font-extrabold">{inr(data.catSplit.reduce((a, d) => a + d.value, 0))}</p>
                <p className="text-[11px] text-muted">7 nights</p>
              </div>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
            {data.catSplit.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c[d.tone] }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="price text-muted">{inr(d.value)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Last 7 nights" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.trend} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={c.lime} stopOpacity={0.4} />
                    <stop offset="1" stopColor={c.lime} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ord" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={c.violet} stopOpacity={0.35} />
                    <stop offset="1" stopColor={c.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 3" />
                <XAxis dataKey="night" tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                <YAxis yAxisId="o" orientation="right" allowDecimals={false} tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} cursor={{ stroke: c.line }} formatter={(v: number, n: string) => (n === 'Revenue' ? inr(v) : v)} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke={c.lime} strokeWidth={2.5} fill="url(#rev)" />
                <Area yAxisId="o" type="monotone" dataKey="orders" name="Orders" stroke={c.violet} strokeWidth={2.5} fill="url(#ord)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Needs restocking" action={<Link to="/admin/products?filter=low" className="inline-flex items-center text-sm font-semibold text-violet">Inventory <ChevronRight className="h-4 w-4" /></Link>} flush>
          {!data.low.length ? (
            <EmptyState emoji="📦" title="Shelves are full" className="py-8" />
          ) : (
            <ul className="max-h-64 divide-y divide-line/50 overflow-y-auto" data-lenis-prevent>
              {data.low.slice(0, 12).map((p) => (
                <li key={p.id}>
                  <button onClick={() => useAdminUi.getState().editProduct(p.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2/60">
                    <span className="h-9 w-9 shrink-0 rounded-lg p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <Badge tone={p.stock === 0 ? 'pink' : 'amber'}>{p.stock === 0 ? 'Out' : `${p.stock} left`}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-muted"><Package className="h-3.5 w-3.5" /> Live data · updates instantly as orders come in</p>
    </>
  );
}
